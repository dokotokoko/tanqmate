# models/chat_models.py - チャット関連の統一データモデル

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal, Dict, Any

class UnifiedMessage(BaseModel):
    """
    統一メッセージフォーマット
    フロントエンド・バックエンド間で一貫性のあるデータ構造
    """
    id: str = Field(..., description="メッセージの一意識別子")
    role: Literal["user", "assistant"] = Field(..., description="メッセージの発話者役割")
    content: str = Field(..., description="メッセージ内容")
    timestamp: datetime = Field(..., description="メッセージ作成時刻")
    
    # オプショナルフィールド
    conversation_id: Optional[str] = Field(None, description="会話セッションID")
    
    # AI拡張フィールド
    quest_cards: Optional[List[Dict[str, Any]]] = Field(None, description="クエストカード")
    sources: Optional[List[Dict[str, Any]]] = Field(None, description="WebSearch参照ソース")
    is_clarification: Optional[bool] = Field(False, description="明確化質問フラグ")
    clarification_questions: Optional[List[str]] = Field(None, description="明確化質問リスト")
    suggestion_options: Optional[List[str]] = Field(None, description="提案選択肢")
    response_style_used: Optional[str] = Field(None, description="使用された応答スタイル")
    
    # メタデータ
    metadata: Optional[Dict[str, Any]] = Field(None, description="追加メタデータ")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UnifiedChatResponse(BaseModel):
    """
    統一チャットレスポンス
    チャットAPIの標準レスポンスフォーマット
    """
    user_message: UnifiedMessage = Field(..., description="ユーザーの送信メッセージ")
    assistant_message: UnifiedMessage = Field(..., description="AIアシスタントの応答")
    conversation_id: str = Field(..., description="会話ID")
    
    # パフォーマンス情報
    metrics: Optional[Dict[str, Any]] = Field(None, description="処理メトリクス")
    fallback_used: Optional[bool] = Field(False, description="フォールバック使用フラグ")
    fallback_model: Optional[str] = Field(None, description="使用されたフォールバックモデル")
    
class UnifiedHistoryItem(BaseModel):
    """
    統一履歴アイテム
    チャット履歴の各要素の標準フォーマット
    """
    id: str = Field(..., description="履歴エントリID")
    role: Literal["user", "assistant"] = Field(..., description="発話者役割")
    content: str = Field(..., description="メッセージ内容")
    timestamp: datetime = Field(..., description="メッセージ時刻")
    conversation_id: Optional[str] = Field(None, description="会話ID")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UnifiedHistoryResponse(BaseModel):
    """
    統一履歴レスポンス
    チャット履歴取得APIの標準レスポンスフォーマット
    """
    messages: List[UnifiedHistoryItem] = Field(..., description="メッセージリスト")
    total_count: int = Field(..., description="総メッセージ数")
    has_more: bool = Field(False, description="追加メッセージの有無")