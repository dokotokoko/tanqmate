import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

class learning_plannner():
    def __init__(self):
        load_dotenv()
        self.model = "gpt-5.2"
        
        # 環境変数からAPIキーを取得
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            raise ValueError("OpenAI APIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。")
        
        self.client = OpenAI(api_key=api_key)
    
    def text(self, role: str, content: str) -> Dict[str, Any]:
        """
        テキスト入力用のResponse API input itemを作成
        
        Args:
            role: "system", "user", "assistant"のいずれか
            content: メッセージのテキスト内容
            
        Returns:
            Response API用のinput item
        """

        return {
            "role": role,
            "content": [{"type": "input_text", "text": content}]
        }
    
    def image(self, role: str, image_data: Any, text: Optional[str] = None) -> Dict[str, Any]:
        """
        画像入力用のResponse API input itemを作成（将来実装用）
        
        Args:
            role: "system", "user", "assistant"のいずれか
            image_data: 画像データ
            text: 画像に付随するテキスト（オプション）
            
        Returns:
            Response API用のinput item
        """
        parts = []
        if text:
            parts.append({"type": "input_text", "text": text})
        # 画像は現時点ではサポートされていない可能性があるため、コメントアウト
        # parts.append({"type": "input_image", "data": image_data})
        return {
            "role": role,
            "content": parts
        }

    def generate_response(self, input_items: List[Dict[str, Any]], max_tokens: Optional[int] = None) -> str:
        """
        Response APIを使用してLLMから応答を生成
        純粋なinput形式のみを受け付ける
        
        Args:
            input_items: Response API形式のinput items
            max_tokens: 最大トークン数
            
        Returns:
            str: 生成された応答テキスト
        """

        # Response APIのパラメータ構築
        request_params = {
            "model": self.model,
            "input": input_items,
            "tools": [{"type": "web_search"}],
            "store": True  # 応答を保存
        }
        
        if max_tokens is not None:
            request_params["max_output_tokens"] = max_tokens
        
        # Response APIを呼び出し
        # response = self.client.responses.create(**request_params)

        resp = self.client.responses.create(
            model=self.model,
            input=input_items,
            tools=[{"type": "web_search"}],
            store=True,
        )

        return resp
    
    def generate_response_with_WebSearch(self, input_items: List[Dict[str, Any]]) -> str:
        """
        WebSearch機能付きレスポンス生成
        
        Args:
            input_items: Response API形式のinput items
            
        Returns:
            WebSearch結果を含むLLMからの応答
        """
        resp = self.client.responses.create(
            model=self.model,
            input=input_items,
            tools=[{"type": "web_search"}],
            store=True,
        )
        return resp.output_text