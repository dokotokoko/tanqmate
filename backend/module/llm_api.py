"""
LLM APIクライアント（統合版）
同期・非同期の両方に対応
"""

import os
import asyncio
import time
import logging
from typing import List, Dict, Any, Optional, Union, AsyncIterator
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv
from collections import deque

logger = logging.getLogger(__name__)


class learning_plannner():
    """
    統合版LLMクライアント
    同期・非同期の両方のメソッドを持つ
    """
    
    def __init__(self, pool_size: int = 5):
        """
        初期化
        
        Args:
            pool_size: 非同期処理用のセマフォプールサイズ
        """
        load_dotenv()
        self.model = "gpt-5.2"
        self.api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.api_key:
            raise ValueError("OpenAI APIキーが設定されていません。環境変数OPENAI_API_KEYを設定してください。")
        
        # 同期クライアントの初期化
        self.client = OpenAI(api_key=self.api_key)
        
        # 非同期クライアントの初期化
        self.async_client = AsyncOpenAI(
            api_key=self.api_key,
            timeout=30.0,  # タイムアウトを30秒に設定
            max_retries=2   # リトライを2回に制限
        )
        
        # 非同期処理用のセマフォ（同時実行数を制限）
        self.semaphore = asyncio.Semaphore(pool_size)
        
        # メトリクス収集用
        self.request_count = 0
        self.total_response_time = 0.0
        self.sync_requests = 0
        self.async_requests = 0
    
    # =====================================
    # 共通メソッド
    # =====================================

    @staticmethod
    def text_type_role(role: str) -> str:
        """
        Responses API のバリデーションに合わせる。
        - user/system/developer: input_text
        - assistant: output_text（refusal はモデル側が返す）
        """
        return "output_text" if role == "assistant" else "input_text"
    
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
            "content": [{"type": self.text_type_role(role),  "text": content}]
        }
    
    def image(self, role: str, image_data: Any, text: Optional[str] = None) -> Dict[str, Any]:
        """
        画像入力用のResponse API input itemを作成
        
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
        parts.append({"type": "input_image", "data": image_data})
        return {
            "role": role,
            "content": parts
        }
    
    # =====================================
    # 出力抽出ユーティリティ
    # =====================================

    @staticmethod
    def extract_output_text(resp: Any) -> str:
        """
        SDK差分を吸収しつつ、最終テキストを取り出す
        """
        if hasattr(resp, "output_text") and resp.output_text:
            return resp.output_text

        # fallback: output の message を走査
        texts: List[str] = []
        output = getattr(resp, "output", None) or []
        for item in output:
            if getattr(item, "type", None) == "message":
                for c in getattr(item, "content", None) or []:
                    if getattr(c, "type", None) in ("output_text", "text"):
                        t = getattr(c, "text", None)
                        if t:
                            texts.append(t)

        if texts:
            return "\n".join(texts)

        return str(resp)
    
    # =====================================
    # 同期メソッド
    # =====================================
    
    def generate_response(self, input_items: List[Dict[str, Any]], max_tokens: Optional[int] = None):
        """
        Response APIを使用してLLMから応答を生成（同期版）
        
        Args:
            input_items: Response API形式のinput items
            max_tokens: 最大トークン数
            
        Returns:
            Response object
        """
        start_time = time.time()

        # Response APIのパラメータ構築
        request_params: Dict[str, Any] = {
            "model": self.model,
            "input": input_items,
            "tools": [{"type": "web_search"}], # NOTE: web_search ツールを常に渡す（呼び出すかはモデルが判断）
            "store": True,
        }

        if max_tokens is not None:
            request_params["max_output_tokens"] = max_tokens

        # Response APIを呼び出し
        resp = self.client.responses.create(**request_params)
        self._update_metrics(time.time() - start_time, "sync")
        
        return resp
    
    
    def generate_text(self, input_items: List[Dict[str, Any]], max_tokens: Optional[int] = None) -> str:
        """
        Response オブジェクトから生成されたテキストデータを取り出す
        
        Args:
            input_items: Response API形式のinput items
            max_tokens: 最大トークン数
            
        Returns:
            output_text
        """
        resp = self.generate_response(input_items, max_tokens=max_tokens)
        output_text = self.extract_output_text(resp)

        return output_text

    
    def generate_response_with_WebSearch(self, input_items: List[Dict[str, Any]]) -> str:
        """
        WebSearch機能付きレスポンス生成 → `generate_response`にWeb検索は統合したため実質不要
        
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
    
    # =====================================
    # 非同期メソッド
    # =====================================
    
    async def generate_response_async(self, input_items: List[Dict[str, Any]], max_tokens: Optional[int] = None):
        """
        Response APIを使用した非同期応答生成
        
        Args:
            input_items: Response API形式のinput items
            max_tokens: 最大トークン数
            
        Returns:
            Response object
        """
        start_time = time.time()
        
        try:
            # セマフォを使用して同時実行数を制限
            async with self.semaphore:
                # Response APIのパラメータ構築
                request_params: Dict[str, Any] = {
                    "model": self.model,
                    "input": input_items,
                    "tools": [{"type": "web_search"}],
                    "store": True,
                }
                
                if max_tokens is not None:
                    request_params["max_output_tokens"] = max_tokens
                
                # Response APIを呼び出し
                response = await self.async_client.responses.create(**request_params)
                
                # メトリクス更新
                self._update_metrics(time.time() - start_time, "async")
                
                return response
                
        except Exception as e:
            logger.error(f"❌ OpenAI API非同期呼び出しエラー: {e}")
            
            # フォールバック: 同期版を非同期で実行
            return await asyncio.to_thread(
                self.generate_response,
                input_items,
                max_tokens
            )
    
    async def generate_text(self, input_items: List[Dict[str, Any]], max_tokens: Optional[int] = None) -> str:
        """
        Response オブジェクトから生成されたテキストデータを取り出す(非同期)
        
        Args:
            input_items: Response API形式のinput items
            max_tokens: 最大トークン数
            
        Returns:
            output_text
        """
        resp = await self.generate_response_async(input_items, max_tokens=max_tokens)
        output_text = self.extract_output_text(resp)

        return output_text
    
    async def generate_response_streaming(
            self,
            input_items: List[Dict[str, Any]],
            callback: Optional[callable] = None,
            max_tokens: Optional[int] = None
        ) -> AsyncIterator[str]:
            """
            Responses API の streaming は event.type を見て delta を拾う
            """
            async with self.semaphore:
                request_params: Dict[str, Any] = {
                    "model": self.model,
                    "input": input_items,
                    "tools": [{"type": "web_search"}],
                    "stream": True,
                    "store": True,
                }
                if max_tokens is not None:
                    request_params["max_output_tokens"] = max_tokens

                stream = await self.async_client.responses.create(**request_params)

                async for event in stream:
                    etype = getattr(event, "type", None)

                    # テキスト生成の増分
                    if etype == "response.output_text.delta":
                        delta = getattr(event, "delta", "") or ""
                        if delta:
                            if callback:
                                await callback(delta)
                            yield delta

                    # エラーイベント
                    elif etype == "error":
                        raise RuntimeError(str(event))

                    # 完了イベントなどは無視（必要ならここでハンドル）
                    # - response.completed
                    # - response.created
                    # - response.web_search.* など
    
    async def batch_generate_responses(
        self, 
        input_sets: List[List[Dict[str, Any]]],
        max_tokens: Optional[int] = None
    ) -> List[Any]:
        """
        複数のinputセットを並列で処理
        
        Args:
            input_sets: inputセットのリスト
            max_tokens: 最大トークン数
            
        Returns:
            レスポンスのリスト
        """
        tasks = [
            self.generate_response_async(input_items, max_tokens)
            for input_items in input_sets
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # エラーハンドリング
        responses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"バッチ処理エラー (index={i}): {result}")
                responses.append(None)
            else:
                responses.append(result)
        
        return responses
    
    async def generate_with_fallback(
        self, 
        input_items: List[Dict[str, Any]], 
        fallback_model: Optional[str] = "gpt-3.5-turbo",
        max_tokens: Optional[int] = None
    ):
        """
        フォールバック機能付きレスポンス生成
        
        Args:
            input_items: Response API形式のinput items
            fallback_model: フォールバック用のモデル名
            max_tokens: 最大トークン数
            
        Returns:
            Response object
        """
        try:
            # まずメインモデルで試行
            return await self.generate_response_async(input_items, max_tokens)
            
        except Exception as primary_error:
            logger.warning(f"⚠️ プライマリモデルエラー、フォールバックを使用: {primary_error}")
            
            if fallback_model:
                try:
                    # フォールバックモデルで再試行
                    async with self.semaphore:
                        request_params = {
                            "model": fallback_model,
                            "input": input_items,
                            "store": True
                        }
                        
                        if max_tokens is not None:
                            request_params["max_output_tokens"] = min(max_tokens, 1500)
                        
                        response = await self.async_client.responses.create(**request_params)
                        return response
                        
                except Exception as fallback_error:
                    logger.error(f"❌ フォールバックモデルもエラー: {fallback_error}")
                    raise
            else:
                raise primary_error
    
    async def generate_with_web_search_async(self, input_items: List[Dict[str, Any]]) -> str:
        """
        非同期WebSearch機能付きレスポンス生成
        
        Args:
            input_items: Response API形式のinput items
            
        Returns:
            WebSearch結果を含むLLMからの応答
        """
        async with self.semaphore:
            response = await self.async_client.responses.create(
                model=self.model,
                input=input_items,
                tools=[{"type": "web_search"}],
                store=True
            )
            return response.output_text if hasattr(response, 'output_text') else str(response)
    
    # =====================================
    # ユーティリティメソッド
    # =====================================
    
    def _update_metrics(self, response_time: float, request_type: str):
        """
        メトリクスを更新
        
        Args:
            response_time: レスポンス時間
            request_type: "sync" または "async"
        """
        self.request_count += 1
        self.total_response_time += response_time
        
        if request_type == "sync":
            self.sync_requests += 1
        else:
            self.async_requests += 1
        
        # 10リクエストごとにログ
        if self.request_count % 10 == 0:
            avg_time = self.total_response_time / self.request_count
            logger.info(
                f"📊 LLM APIメトリクス: "
                f"総リクエスト={self.request_count}, "
                f"平均応答時間={avg_time:.2f}秒, "
                f"同期/非同期={self.sync_requests}/{self.async_requests}"
            )
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        メトリクス情報を取得
        
        Returns:
            メトリクス情報のDict
        """
        if self.request_count == 0:
            return {
                "total_requests": 0,
                "average_response_time": 0,
                "sync_requests": 0,
                "async_requests": 0,
                "active_connections": self.semaphore._value if hasattr(self.semaphore, '_value') else None
            }
        
        return {
            "total_requests": self.request_count,
            "average_response_time": self.total_response_time / self.request_count,
            "sync_requests": self.sync_requests,
            "async_requests": self.async_requests,
            "active_connections": self.semaphore._value if hasattr(self.semaphore, '_value') else None
        }


# =====================================
# 後方互換性のためのエイリアスクラス
# =====================================

class AsyncLearningPlanner(learning_plannner):
    """
    後方互換性のためのエイリアスクラス
    async_llm_api.pyで使用されていたクラス名
    """
    pass


# =====================================
# シングルトンインスタンス管理
# =====================================

_llm_instance: Optional[learning_plannner] = None
_async_llm_instance: Optional[AsyncLearningPlanner] = None


def get_async_llm_client(pool_size: int = 5) -> AsyncLearningPlanner:
    """
    非同期LLMクライアントのシングルトンを取得（後方互換性）
    
    Args:
        pool_size: プールサイズ（初回のみ有効）
        
    Returns:
        AsyncLearningPlannerのインスタンス
    """
    global _async_llm_instance
    
    if _async_llm_instance is None:
        _async_llm_instance = AsyncLearningPlanner(pool_size=pool_size)
    
    return _async_llm_instance