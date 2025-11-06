"""
セッション管理クラス
学習セッションの生成、管理、永続化を担当
"""

import logging
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from pathlib import Path
import json

logger = logging.getLogger(__name__)


class SessionManager:
    """学習セッション管理クラス"""
    
    def __init__(self, session_timeout_minutes: int = 30, persist_sessions: bool = True):
        """
        初期化
        
        Args:
            session_timeout_minutes: セッションタイムアウト時間（分）
            persist_sessions: セッションをファイルに永続化するか
        """
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        self.persist_sessions = persist_sessions
        self.sessions_file = Path("sessions.json")
        
        if self.persist_sessions:
            self._load_sessions()
    
    def get_or_create_session(self, session_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """セッション情報を取得または作成"""
        
        current_time = datetime.now()
        
        # 既存セッションの確認
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            last_activity = datetime.fromisoformat(session['last_activity'])
            
            # セッションタイムアウトチェック
            if current_time - last_activity > self.session_timeout:
                logger.info(f"🕒 セッションタイムアウト: {session_id}")
                self._archive_session(session_id)
                del self.active_sessions[session_id]
            else:
                session['last_activity'] = current_time.isoformat()
                session['interaction_count'] += 1
                self._save_sessions()
                return session
        
        # 新しいセッションを作成
        new_session = {
            'session_id': session_id,
            'created_at': current_time.isoformat(),
            'last_activity': current_time.isoformat(),
            'interaction_count': 1,
            'context_history': [],
            'learning_trajectory': [],
            'user_preferences': {},
            'custom_context': context or {},
            'graph_snapshots': [],  # グラフ状態のスナップショット
            'session_metrics': {
                'total_turns': 0,
                'avg_response_time': 0.0,
                'support_types_used': [],
                'graph_cycles_completed': 0
            }
        }
        
        self.active_sessions[session_id] = new_session
        logger.info(f"✨ 新セッション作成: {session_id}")
        
        if self.persist_sessions:
            self._save_sessions()
        
        return new_session
    
    def update_session_context(self, session_id: str, key: str, value: Any) -> bool:
        """セッションコンテキストを更新"""
        
        if session_id not in self.active_sessions:
            logger.warning(f"⚠️ セッションが見つかりません: {session_id}")
            return False
        
        session = self.active_sessions[session_id]
        session['custom_context'][key] = value
        session['last_activity'] = datetime.now().isoformat()
        
        if self.persist_sessions:
            self._save_sessions()
        
        return True
    
    def add_to_learning_trajectory(self, session_id: str, trajectory_data: Dict[str, Any]) -> bool:
        """学習軌跡にデータを追加"""
        
        if session_id not in self.active_sessions:
            logger.warning(f"⚠️ セッションが見つかりません: {session_id}")
            return False
        
        session = self.active_sessions[session_id]
        trajectory_data['timestamp'] = datetime.now().isoformat()
        session['learning_trajectory'].append(trajectory_data)
        session['last_activity'] = datetime.now().isoformat()
        
        # 軌跡データが多すぎる場合は古いものを削除
        if len(session['learning_trajectory']) > 100:
            session['learning_trajectory'] = session['learning_trajectory'][-100:]
        
        if self.persist_sessions:
            self._save_sessions()
        
        return True
    
    def update_session_metrics(self, session_id: str, metrics_update: Dict[str, Any]) -> bool:
        """セッションメトリクスを更新"""
        
        if session_id not in self.active_sessions:
            logger.warning(f"⚠️ セッションが見つかりません: {session_id}")
            return False
        
        session = self.active_sessions[session_id]
        session_metrics = session['session_metrics']
        
        # メトリクスを更新
        for key, value in metrics_update.items():
            if key in session_metrics:
                if isinstance(session_metrics[key], list):
                    if value not in session_metrics[key]:
                        session_metrics[key].append(value)
                elif isinstance(session_metrics[key], (int, float)):
                    session_metrics[key] = value
                else:
                    session_metrics[key] = value
            else:
                session_metrics[key] = value
        
        session['last_activity'] = datetime.now().isoformat()
        
        if self.persist_sessions:
            self._save_sessions()
        
        return True
    
    def get_session_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッションサマリーを取得"""
        
        if session_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[session_id]
        
        # セッション時間を計算
        created_at = datetime.fromisoformat(session['created_at'])
        last_activity = datetime.fromisoformat(session['last_activity'])
        session_duration = last_activity - created_at
        
        return {
            'session_id': session_id,
            'duration_minutes': session_duration.total_seconds() / 60,
            'interaction_count': session['interaction_count'],
            'trajectory_length': len(session['learning_trajectory']),
            'metrics': session['session_metrics'],
            'active': True,
            'last_activity': session['last_activity']
        }
    
    def cleanup_expired_sessions(self) -> int:
        """期限切れセッションをクリーンアップ"""
        
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, session in self.active_sessions.items():
            last_activity = datetime.fromisoformat(session['last_activity'])
            if current_time - last_activity > self.session_timeout:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self._archive_session(session_id)
            del self.active_sessions[session_id]
            logger.info(f"🗑️ 期限切れセッション削除: {session_id}")
        
        if expired_sessions and self.persist_sessions:
            self._save_sessions()
        
        return len(expired_sessions)
    
    def get_all_active_sessions(self) -> List[Dict[str, Any]]:
        """すべてのアクティブセッションのサマリーを取得"""
        
        summaries = []
        for session_id in self.active_sessions.keys():
            summary = self.get_session_summary(session_id)
            if summary:
                summaries.append(summary)
        
        return summaries
    
    def _load_sessions(self):
        """セッションをファイルから読み込み"""
        
        if not self.sessions_file.exists():
            return
        
        try:
            with open(self.sessions_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.active_sessions = data.get('active_sessions', {})
                
            # 期限切れセッションをクリーンアップ
            self.cleanup_expired_sessions()
            
            logger.info(f"📥 セッション読み込み完了: {len(self.active_sessions)} sessions")
            
        except Exception as e:
            logger.error(f"❌ セッション読み込みエラー: {e}")
            self.active_sessions = {}
    
    def _save_sessions(self):
        """セッションをファイルに保存"""
        
        if not self.persist_sessions:
            return
        
        try:
            data = {
                'active_sessions': self.active_sessions,
                'saved_at': datetime.now().isoformat()
            }
            
            with open(self.sessions_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            logger.error(f"❌ セッション保存エラー: {e}")
    
    def _archive_session(self, session_id: str):
        """セッションをアーカイブ"""
        
        if session_id not in self.active_sessions:
            return
        
        try:
            archive_file = Path(f"archived_sessions/{session_id}.json")
            archive_file.parent.mkdir(exist_ok=True)
            
            session_data = self.active_sessions[session_id].copy()
            session_data['archived_at'] = datetime.now().isoformat()
            
            with open(archive_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, ensure_ascii=False, indent=2)
                
            logger.info(f"📦 セッションアーカイブ完了: {session_id}")
            
        except Exception as e:
            logger.error(f"❌ セッションアーカイブエラー: {e}")