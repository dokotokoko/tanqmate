"""
XAI APIクライアント
xai-sdkを使用したチャット機能の実装
"""

import os
import logging
from typing import List, Dict, Any, Optional, Union
from dotenv import load_dotenv
from xai_sdk import Client
from xai_sdk.chat import user, system, assistant

logger = logging.getLogger(__name__)


class XAIClient:
    """
    XAI APIとのやり取りを管理するクライアントクラス
    """
    
    def __init__(self, model: str = "grok-4-1-fast-reasoning", timeout: int = 3600):
        """
        XAIクライアントの初期化
        
        Args:
            model: 使用するモデル名（デフォルト: grok-4）
            timeout: タイムアウト時間（秒）
        """
        load_dotenv()
        self.model = model
        self.timeout = timeout
        self.api_key = os.getenv("XAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("XAI APIキーが設定されていません。環境変数XAI_API_KEYを設定してください。")
        
        # クライアントの初期化
        self.client = Client(
            api_key=self.api_key,
            timeout=self.timeout
        )
        
        logger.info(f"XAIClient initialized with model: {model}")
    
    def create_chat(self, system_message: str = "You are Grok, a highly intelligent, helpful AI assistant."):
        """
        新しいチャットセッションを作成
        
        Args:
            system_message: システムメッセージ
            
        Returns:
            チャットオブジェクト
        """
        chat = self.client.chat.create(model=self.model)
        if system_message:
            chat.append(system(system_message))
        return chat
    
    def get_response(self, 
                    user_message: str, 
                    system_message: Optional[str] = None,
                    chat_history: Optional[List[Dict[str, str]]] = None) -> str:
        """
        ユーザーメッセージに対する応答を取得
        
        Args:
            user_message: ユーザーからのメッセージ
            system_message: システムメッセージ（オプション）
            chat_history: チャット履歴（オプション）
            
        Returns:
            AIからの応答テキスト
        """
        try:
            chat = self.create_chat(system_message or "You are Grok, a highly intelligent, helpful AI assistant.")
            
            # チャット履歴がある場合は追加
            if chat_history:
                for msg in chat_history:
                    if msg["role"] == "user":
                        chat.append(user(msg["content"]))
                    elif msg["role"] == "assistant":
                        chat.append(assistant(msg["content"]))
            
            # 新しいユーザーメッセージを追加
            chat.append(user(user_message))
            
            # 応答を取得
            response = chat.sample()
            return response.content
            
        except Exception as e:
            logger.error(f"Error getting response from XAI: {e}")
            raise
    
    def chat_with_history(self, messages: List[Dict[str, str]]) -> str:
        """
        メッセージ履歴を含む会話を実行
        
        Args:
            messages: メッセージのリスト [{"role": "user/assistant/system", "content": "..."}]
            
        Returns:
            AIからの応答テキスト
        """
        try:
            chat = self.client.chat.create(model=self.model)
            
            for msg in messages:
                if msg["role"] == "system":
                    chat.append(system(msg["content"]))
                elif msg["role"] == "user":
                    chat.append(user(msg["content"]))
                elif msg["role"] == "assistant":
                    chat.append(assistant(msg["content"]))
            
            response = chat.sample()
            return response.content
            
        except Exception as e:
            logger.error(f"Error in chat_with_history: {e}")
            raise


# 使用例
if __name__ == "__main__":
    # 基本的な使用例
    xai = XAIClient()
    
    # シンプルな質問応答
    response = xai.get_response("What is the meaning of life, the universe, and everything?")
    print("Response:", response)
    
    # カスタムシステムメッセージ付き
    response = xai.get_response(
        "Pythonのリスト内包表記について教えてください",
        system_message="あなたはPythonの専門家です。簡潔で分かりやすい説明を心がけてください。"
    )
    print("\nPython Expert Response:", response)
    
    # 会話履歴付き
    chat_history = [
        {"role": "user", "content": "私の名前は田中です"},
        {"role": "assistant", "content": "こんにちは、田中さん！お会いできて嬉しいです。"},
    ]
    response = xai.get_response("私の名前を覚えていますか？", chat_history=chat_history)
    print("\nWith History Response:", response)