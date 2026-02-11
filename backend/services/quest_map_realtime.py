# backend/services/quest_map_realtime.py - 探Qマップリアルタイム更新サービス

import logging
import json
import asyncio
from typing import Dict, List, Set, Any, Optional, Callable
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum
import uuid

from services.base import BaseService

logger = logging.getLogger(__name__)


class UpdateType(Enum):
    """更新タイプ"""
    NODE_CREATED = "node_created"
    NODE_UPDATED = "node_updated"
    NODE_DELETED = "node_deleted"
    NODE_MOVED = "node_moved"
    NODE_STATUS_CHANGED = "node_status_changed"
    EDGE_CREATED = "edge_created"
    EDGE_UPDATED = "edge_updated"
    EDGE_DELETED = "edge_deleted"
    QUEST_UPDATED = "quest_updated"
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CURSOR_MOVED = "cursor_moved"


@dataclass
class RealtimeUpdate:
    """リアルタイム更新データ"""
    id: str
    update_type: UpdateType
    quest_id: str
    user_id: str
    timestamp: datetime
    data: Dict[str, Any]
    device_id: Optional[str] = None
    sync_priority: int = 1  # 1: 高, 2: 中, 3: 低


@dataclass
class ClientConnection:
    """クライアント接続情報"""
    client_id: str
    user_id: str
    quest_id: str
    device_id: str
    connected_at: datetime
    last_heartbeat: datetime
    is_active: bool = True


class QuestMapRealtimeService(BaseService):
    """探Qマップリアルタイム更新サービス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        
        # 接続管理
        self.connections: Dict[str, ClientConnection] = {}
        self.quest_subscribers: Dict[str, Set[str]] = {}  # quest_id -> client_ids
        
        # 更新キュー管理
        self.update_queue: List[RealtimeUpdate] = []
        self.pending_updates: Dict[str, List[RealtimeUpdate]] = {}  # quest_id -> updates
        
        # オフライン対応
        self.offline_updates: Dict[str, List[RealtimeUpdate]] = {}  # user_id -> updates
        self.auto_save_enabled = True
        self.auto_save_interval = 30  # seconds
        
        # WebSocketコールバック（実装時に設定）
        self.websocket_send_callback: Optional[Callable] = None
        
        logger.info("✅ QuestMapRealtimeService初期化完了")
    
    def get_service_name(self) -> str:
        return "QuestMapRealtimeService"

    # ===== 接続管理 =====

    async def register_client(
        self,
        client_id: str,
        user_id: str,
        quest_id: str,
        device_id: str
    ) -> Dict[str, Any]:
        """
        クライアントの接続を登録
        
        Args:
            client_id: クライアントID
            user_id: ユーザーID
            quest_id: クエストID
            device_id: デバイスID
            
        Returns:
            Dict[str, Any]: 登録結果
        """
        try:
            connection = ClientConnection(
                client_id=client_id,
                user_id=user_id,
                quest_id=quest_id,
                device_id=device_id,
                connected_at=datetime.now(timezone.utc),
                last_heartbeat=datetime.now(timezone.utc)
            )
            
            self.connections[client_id] = connection
            
            # クエスト購読者リストに追加
            if quest_id not in self.quest_subscribers:
                self.quest_subscribers[quest_id] = set()
            self.quest_subscribers[quest_id].add(client_id)
            
            # ユーザー参加の通知
            await self._broadcast_update(UpdateType.USER_JOINED, quest_id, user_id, {
                'user_id': user_id,
                'device_id': device_id,
                'joined_at': connection.connected_at.isoformat()
            })
            
            # オフライン中の更新があれば送信
            await self._send_offline_updates(user_id, client_id)
            
            logger.info(f"👥 クライアント接続登録: {client_id} (user: {user_id}, quest: {quest_id})")
            
            return {
                'success': True,
                'client_id': client_id,
                'connected_users': len(self.quest_subscribers.get(quest_id, set())),
                'pending_updates': len(self.pending_updates.get(quest_id, []))
            }
            
        except Exception as e:
            logger.error(f"❌ クライアント登録エラー: {e}")
            return {'success': False, 'error': str(e)}

    async def unregister_client(self, client_id: str) -> Dict[str, Any]:
        """
        クライアントの接続を解除
        
        Args:
            client_id: クライアントID
            
        Returns:
            Dict[str, Any]: 解除結果
        """
        try:
            if client_id not in self.connections:
                return {'success': False, 'error': 'Client not found'}
            
            connection = self.connections[client_id]
            quest_id = connection.quest_id
            user_id = connection.user_id
            
            # 接続情報を削除
            del self.connections[client_id]
            
            # 購読者リストから削除
            if quest_id in self.quest_subscribers:
                self.quest_subscribers[quest_id].discard(client_id)
                if not self.quest_subscribers[quest_id]:
                    del self.quest_subscribers[quest_id]
            
            # ユーザー離脱の通知
            await self._broadcast_update(UpdateType.USER_LEFT, quest_id, user_id, {
                'user_id': user_id,
                'left_at': datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"👋 クライアント接続解除: {client_id}")
            
            return {'success': True}
            
        except Exception as e:
            logger.error(f"❌ クライアント解除エラー: {e}")
            return {'success': False, 'error': str(e)}

    async def update_heartbeat(self, client_id: str) -> bool:
        """ハートビートを更新"""
        if client_id in self.connections:
            self.connections[client_id].last_heartbeat = datetime.now(timezone.utc)
            return True
        return False

    # ===== リアルタイム更新の送信 =====

    async def broadcast_node_update(
        self,
        quest_id: str,
        user_id: str,
        node_data: Dict[str, Any],
        update_type: UpdateType = UpdateType.NODE_UPDATED
    ) -> bool:
        """
        ノード更新を配信
        
        Args:
            quest_id: クエストID
            user_id: 更新者のユーザーID
            node_data: ノードデータ
            update_type: 更新タイプ
            
        Returns:
            bool: 配信成功
        """
        return await self._broadcast_update(update_type, quest_id, user_id, {
            'node': node_data,
            'updated_at': datetime.now(timezone.utc).isoformat()
        })

    async def broadcast_quest_update(
        self,
        quest_id: str,
        user_id: str,
        quest_data: Dict[str, Any]
    ) -> bool:
        """
        クエスト更新を配信
        
        Args:
            quest_id: クエストID
            user_id: 更新者のユーザーID
            quest_data: クエストデータ
            
        Returns:
            bool: 配信成功
        """
        return await self._broadcast_update(UpdateType.QUEST_UPDATED, quest_id, user_id, {
            'quest': quest_data,
            'updated_at': datetime.now(timezone.utc).isoformat()
        })

    async def broadcast_cursor_position(
        self,
        quest_id: str,
        user_id: str,
        position: Dict[str, float],
        device_id: str
    ) -> bool:
        """
        カーソル位置を配信
        
        Args:
            quest_id: クエストID
            user_id: ユーザーID
            position: カーソル位置 {x: float, y: float}
            device_id: デバイスID
            
        Returns:
            bool: 配信成功
        """
        return await self._broadcast_update(
            UpdateType.CURSOR_MOVED, 
            quest_id, 
            user_id, 
            {
                'position': position,
                'device_id': device_id
            },
            sync_priority=3  # カーソル移動は低優先度
        )

    async def _broadcast_update(
        self,
        update_type: UpdateType,
        quest_id: str,
        user_id: str,
        data: Dict[str, Any],
        sync_priority: int = 1
    ) -> bool:
        """内部的な更新配信処理"""
        try:
            update = RealtimeUpdate(
                id=str(uuid.uuid4()),
                update_type=update_type,
                quest_id=quest_id,
                user_id=user_id,
                timestamp=datetime.now(timezone.utc),
                data=data,
                sync_priority=sync_priority
            )
            
            # 更新をキューに追加
            self.update_queue.append(update)
            
            # 該当クエストの購読者に配信
            subscribers = self.quest_subscribers.get(quest_id, set())
            active_subscribers = []
            
            for client_id in subscribers:
                if client_id in self.connections and self.connections[client_id].is_active:
                    # 自分以外に配信
                    if self.connections[client_id].user_id != user_id:
                        active_subscribers.append(client_id)
            
            if active_subscribers:
                await self._send_to_clients(active_subscribers, update)
                logger.info(f"📡 リアルタイム更新配信: {update_type.value} -> {len(active_subscribers)}クライアント")
            
            # オフラインユーザーの更新をキューに保存
            await self._queue_offline_updates(quest_id, update)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ 更新配信エラー: {e}")
            return False

    async def _send_to_clients(
        self,
        client_ids: List[str],
        update: RealtimeUpdate
    ):
        """指定されたクライアントに更新を送信"""
        if not self.websocket_send_callback:
            logger.warning("⚠️ WebSocketコールバックが設定されていません")
            return
        
        message = {
            'type': 'quest_map_update',
            'update_id': update.id,
            'update_type': update.update_type.value,
            'quest_id': update.quest_id,
            'user_id': update.user_id,
            'timestamp': update.timestamp.isoformat(),
            'data': update.data,
            'priority': update.sync_priority
        }
        
        # 並行して各クライアントに送信
        send_tasks = []
        for client_id in client_ids:
            task = self.websocket_send_callback(client_id, json.dumps(message))
            send_tasks.append(task)
        
        if send_tasks:
            await asyncio.gather(*send_tasks, return_exceptions=True)

    async def _queue_offline_updates(self, quest_id: str, update: RealtimeUpdate):
        """オフラインユーザー向けに更新をキューに保存"""
        # 該当クエストに関わる全ユーザーを取得（データベースから）
        # TODO: 実際の実装では、クエストの共有ユーザーリストを取得
        
        # 現在オンラインでないユーザーの更新をキューに保存
        # シンプルな実装として、quest_idベースで保存
        if quest_id not in self.pending_updates:
            self.pending_updates[quest_id] = []
        
        self.pending_updates[quest_id].append(update)
        
        # 古い更新は削除（最新100件まで保持）
        if len(self.pending_updates[quest_id]) > 100:
            self.pending_updates[quest_id] = self.pending_updates[quest_id][-100:]

    async def _send_offline_updates(self, user_id: str, client_id: str):
        """オフライン中の更新をクライアントに送信"""
        if client_id not in self.connections:
            return
        
        quest_id = self.connections[client_id].quest_id
        pending = self.pending_updates.get(quest_id, [])
        
        if not pending:
            return
        
        logger.info(f"📬 オフライン更新送信: {len(pending)}件 -> {client_id}")
        
        # 優先度順にソートして送信
        sorted_updates = sorted(pending, key=lambda u: (u.sync_priority, u.timestamp))
        
        for update in sorted_updates:
            await self._send_to_clients([client_id], update)
            await asyncio.sleep(0.1)  # レート制限
        
        # 送信済みの更新をクリア
        self.pending_updates[quest_id] = []

    # ===== オフライン対応・自動保存 =====

    async def enable_auto_save(self, interval_seconds: int = 30):
        """自動保存を有効化"""
        self.auto_save_enabled = True
        self.auto_save_interval = interval_seconds
        
        # バックグラウンドタスクとして自動保存を開始
        asyncio.create_task(self._auto_save_loop())
        logger.info(f"💾 自動保存有効化: {interval_seconds}秒間隔")

    async def _auto_save_loop(self):
        """自動保存ループ"""
        while self.auto_save_enabled:
            try:
                await asyncio.sleep(self.auto_save_interval)
                await self._perform_auto_save()
            except Exception as e:
                logger.error(f"❌ 自動保存エラー: {e}")

    async def _perform_auto_save(self):
        """自動保存実行"""
        if not self.update_queue:
            return
        
        # 重要な更新のみを保存
        important_updates = [
            update for update in self.update_queue 
            if update.sync_priority <= 2
        ]
        
        if not important_updates:
            return
        
        try:
            # データベースに更新履歴を保存
            # TODO: 実際のデータベース保存実装
            logger.info(f"💾 自動保存実行: {len(important_updates)}件の更新")
            
            # 保存済み更新をキューから削除
            self.update_queue = []
            
        except Exception as e:
            logger.error(f"❌ 自動保存失敗: {e}")

    async def handle_client_reconnection(
        self,
        client_id: str,
        last_sync_timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        クライアント再接続時の同期処理
        
        Args:
            client_id: クライアントID
            last_sync_timestamp: 最後の同期タイムスタンプ
            
        Returns:
            Dict[str, Any]: 同期データ
        """
        try:
            if client_id not in self.connections:
                return {'success': False, 'error': 'Client not registered'}
            
            connection = self.connections[client_id]
            quest_id = connection.quest_id
            
            # 最後の同期以降の更新を取得
            missed_updates = []
            if last_sync_timestamp:
                cutoff_time = datetime.fromisoformat(last_sync_timestamp.replace('Z', '+00:00'))
                missed_updates = [
                    update for update in self.pending_updates.get(quest_id, [])
                    if update.timestamp > cutoff_time
                ]
            else:
                # タイムスタンプがない場合は全ての保留更新を送信
                missed_updates = self.pending_updates.get(quest_id, [])
            
            logger.info(f"🔄 再接続同期: {len(missed_updates)}件の更新")
            
            return {
                'success': True,
                'missed_updates': len(missed_updates),
                'sync_timestamp': datetime.now(timezone.utc).isoformat(),
                'updates': [
                    {
                        'id': update.id,
                        'type': update.update_type.value,
                        'data': update.data,
                        'timestamp': update.timestamp.isoformat(),
                        'user_id': update.user_id
                    }
                    for update in missed_updates
                ]
            }
            
        except Exception as e:
            logger.error(f"❌ 再接続同期エラー: {e}")
            return {'success': False, 'error': str(e)}

    # ===== 統計・監視機能 =====

    def get_realtime_statistics(self) -> Dict[str, Any]:
        """リアルタイム機能の統計情報を取得"""
        active_connections = len([c for c in self.connections.values() if c.is_active])
        active_quests = len(self.quest_subscribers)
        
        return {
            'active_connections': active_connections,
            'total_connections': len(self.connections),
            'active_quests': active_quests,
            'pending_updates': sum(len(updates) for updates in self.pending_updates.values()),
            'update_queue_size': len(self.update_queue),
            'auto_save_enabled': self.auto_save_enabled,
            'auto_save_interval': self.auto_save_interval,
            'last_updated': datetime.now().isoformat()
        }

    async def cleanup_inactive_connections(self, timeout_minutes: int = 30):
        """非アクティブな接続をクリーンアップ"""
        cutoff_time = datetime.now(timezone.utc).replace(
            minute=datetime.now().minute - timeout_minutes
        )
        
        inactive_clients = []
        for client_id, connection in self.connections.items():
            if connection.last_heartbeat < cutoff_time:
                inactive_clients.append(client_id)
        
        for client_id in inactive_clients:
            await self.unregister_client(client_id)
            logger.info(f"🧹 非アクティブ接続をクリーンアップ: {client_id}")
        
        return len(inactive_clients)

    # ===== 外部インターフェース =====

    def set_websocket_callback(self, callback: Callable[[str, str], Any]):
        """WebSocket送信コールバックを設定"""
        self.websocket_send_callback = callback
        logger.info("📡 WebSocketコールバック設定完了")

    async def handle_client_message(
        self,
        client_id: str,
        message_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        クライアントからのメッセージを処理
        
        Args:
            client_id: 送信者のクライアントID
            message_data: メッセージデータ
            
        Returns:
            Dict[str, Any]: 処理結果
        """
        try:
            if client_id not in self.connections:
                return {'success': False, 'error': 'Client not found'}
            
            connection = self.connections[client_id]
            message_type = message_data.get('type')
            
            if message_type == 'heartbeat':
                await self.update_heartbeat(client_id)
                return {'success': True, 'type': 'heartbeat_ack'}
            
            elif message_type == 'cursor_move':
                position = message_data.get('position', {})
                await self.broadcast_cursor_position(
                    connection.quest_id,
                    connection.user_id,
                    position,
                    connection.device_id
                )
                return {'success': True, 'type': 'cursor_move_ack'}
            
            elif message_type == 'request_sync':
                last_sync = message_data.get('last_sync_timestamp')
                sync_data = await self.handle_client_reconnection(client_id, last_sync)
                return sync_data
            
            else:
                logger.warning(f"⚠️ 未知のメッセージタイプ: {message_type}")
                return {'success': False, 'error': 'Unknown message type'}
                
        except Exception as e:
            logger.error(f"❌ クライアントメッセージ処理エラー: {e}")
            return {'success': False, 'error': str(e)}