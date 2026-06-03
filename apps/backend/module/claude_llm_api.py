"""
Claude LLM APIクライアント
Anthropic Claude API用のクライアント実装
"""

import os
import asyncio
import time
import logging
from typing import List, Dict, Any, Optional, AsyncIterator
from anthropic import Anthropic, AsyncAnthropic
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class ClaudeLLMClient:
    """
    Claude LLMクライアント
    同期・非同期の両方のメソッドを持つ
    """
    
    def __init__(self, pool_size: int = None):
        """
        初期化

        Args:
            pool_size: 非同期処理用のセマフォプールサイズ（Noneの場合は環境変数から取得）
        """
        load_dotenv()
        self.model = os.getenv("CLAUDE_MODEL", "claude-opus-4-6")
        self.fallback_model = os.getenv("CLAUDE_FALLBACK_MODEL", "claude-3-haiku-20240307")
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

        if not self.api_key:
            raise ValueError("Anthropic APIキーが設定されていません。環境変数ANTHROPIC_API_KEYを設定してください。")

        # 環境変数からタイムアウトとリトライ設定を取得
        timeout = float(os.getenv("CLAUDE_TIMEOUT", "60.0"))
        max_retries = int(os.getenv("CLAUDE_MAX_RETRIES", "3"))

        # pool_sizeが指定されていない場合は環境変数から取得
        if pool_size is None:
            pool_size = int(os.getenv("CLAUDE_POOL_SIZE", "10"))

        # 同期クライアントの初期化
        self.client = Anthropic(api_key=self.api_key)

        # 非同期クライアントの初期化
        self.async_client = AsyncAnthropic(
            api_key=self.api_key,
            timeout=timeout,      # 環境変数から取得（デフォルト60秒）
            max_retries=max_retries  # 環境変数から取得（デフォルト3回）
        )

        # 非同期処理用のセマフォ（同時実行数を制限）
        self.semaphore = asyncio.Semaphore(pool_size)

        logger.info(
            f"🚀 Claude LLMクライアント初期化: pool_size={pool_size}, timeout={timeout}s, "
            f"max_retries={max_retries}, model={self.model}, fallback_model={self.fallback_model}"
        )
        
        # メトリクス収集用
        self.request_count = 0
        self.total_response_time = 0.0
        self.total_tokens = 0
        self.sync_requests = 0
        self.async_requests = 0
    
    # =====================================
    # 同期メソッド
    # =====================================
    
    def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = 1000,
        temperature: float = 0.7,
        system: Optional[str] = None
    ) -> str:
        """
        Claude APIを使用してLLMから応答を生成（同期版）
        
        Args:
            messages: メッセージのリスト [{"role": "user/assistant", "content": "..."}]
            model: 使用するモデル（省略時はデフォルト）
            max_tokens: 最大トークン数
            temperature: 生成の多様性（0-1）
            system: システムプロンプト
            
        Returns:
            生成されたテキスト
        """
        start_time = time.time()

        if model is None:
            model = self.model

        try:
            # システムプロンプトとメッセージを分離
            if system:
                response = self.client.messages.create(
                    model=model,
                    messages=messages,
                    system=system,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
            else:
                response = self.client.messages.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature
                )
            
            response_time = time.time() - start_time
            
            # 使用トークン数の取得
            usage = getattr(response, 'usage', None)
            if usage:
                input_tokens = getattr(usage, 'input_tokens', 0)
                output_tokens = getattr(usage, 'output_tokens', 0)
                total_tokens = input_tokens + output_tokens
            else:
                input_tokens = output_tokens = total_tokens = 0
            
            logger.info(f"🔹 Claude Response (sync): 応答秒={response_time:.2f}s, 入力トークン={input_tokens}, 出力トークン={output_tokens}, 合計トークン={total_tokens}")
            
            self._update_metrics(response_time, "sync", total_tokens)
            
            # レスポンステキストの取得
            return response.content[0].text if response.content else ""
            
        except Exception as e:
            logger.error(f"❌ Claude API同期呼び出しエラー: {e}")
            raise
    
    # =====================================
    # 非同期メソッド
    # =====================================
    
    async def generate_response_async(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = 1000,
        temperature: float = 0.7,
        system: Optional[str] = None,
        status_callback=None
    ) -> str:
        """
        Claude APIを使用した非同期応答生成
        
        Args:
            messages: メッセージのリスト [{"role": "user/assistant", "content": "..."}]
            model: 使用するモデル（省略時はデフォルト）
            max_tokens: 最大トークン数
            temperature: 生成の多様性（0-1）
            system: システムプロンプト
            status_callback: 進捗状況を通知するコールバック関数
            
        Returns:
            生成されたテキスト
        """
        start_time = time.time()
        
        if model is None:
            model = self.model
        
        try:
            # 処理開始の通知
            if status_callback:
                await status_callback("AI処理を開始しています...")
            
            # セマフォを使用して同時実行数を制限
            async with self.semaphore:
                if status_callback:
                    await status_callback("AIが日誌を生成中です...")
                
                # Claude APIを呼び出し
                if system:
                    response = await self.async_client.messages.create(
                        model=model,
                        messages=messages,
                        system=system,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                else:
                    response = await self.async_client.messages.create(
                        model=model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                
                response_time = time.time() - start_time
                
                # 使用トークン数の取得
                usage = getattr(response, 'usage', None)
                if usage:
                    input_tokens = getattr(usage, 'input_tokens', 0)
                    output_tokens = getattr(usage, 'output_tokens', 0)
                    total_tokens = input_tokens + output_tokens
                else:
                    input_tokens = output_tokens = total_tokens = 0
                
                logger.info(f"🔹 Claude Response (async): 応答秒={response_time:.2f}s, 入力トークン={input_tokens}, 出力トークン={output_tokens}, 合計トークン={total_tokens}")
                
                # メトリクス更新
                self._update_metrics(response_time, "async", total_tokens)
                
                # レスポンステキストの取得
                return response.content[0].text if response.content else ""
                
        except Exception as e:
            logger.error(f"❌ Claude API非同期呼び出しエラー: model={model}, error={e}")
            
            # 軽量モデルフォールバック
            if model != self.fallback_model:
                logger.warning(f"🔄 軽量モデルでフォールバック実行中... fallback_model={self.fallback_model}")
                if status_callback:
                    await status_callback("メインAIが応答できません。軽量モードで処理中...")
                return await self._lightweight_fallback(messages, system, max_tokens, temperature, status_callback)
            else:
                raise
    
    async def generate_response_streaming(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = 1000,
        temperature: float = 0.7,
        system: Optional[str] = None,
        callback: Optional[callable] = None
    ) -> AsyncIterator[str]:
        """
        ストリーミング応答生成
        """
        if model is None:
            model = self.model
        
        async with self.semaphore:
            # ストリーミングモードで作成
            kwargs = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": True
            }
            if system:
                kwargs["system"] = system
            
            stream = await self.async_client.messages.create(**kwargs)
            
            async for event in stream:
                if event.type == "content_block_delta":
                    delta_text = event.delta.text
                    if delta_text:
                        if callback:
                            await callback(delta_text)
                        yield delta_text
    
    async def batch_generate_responses(
        self,
        message_sets: List[List[Dict[str, str]]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = 1000,
        temperature: float = 0.7,
        systems: Optional[List[str]] = None
    ) -> List[str]:
        """
        複数のメッセージセットを並列で処理
        
        Args:
            message_sets: メッセージセットのリスト
            model: 使用するモデル
            max_tokens: 最大トークン数
            temperature: 生成の多様性
            systems: システムプロンプトのリスト（message_setsと同じ長さ）
            
        Returns:
            レスポンステキストのリスト
        """
        if systems is None:
            systems = [None] * len(message_sets)
        
        tasks = [
            self.generate_response_async(messages, model, max_tokens, temperature, system)
            for messages, system in zip(message_sets, systems)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # エラーハンドリング
        responses = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"バッチ処理エラー (index={i}): {result}")
                responses.append("")
            else:
                responses.append(result)
        
        return responses
    
    async def _lightweight_fallback(
        self,
        messages: List[Dict[str, str]],
        system: Optional[str],
        max_tokens: Optional[int],
        temperature: float,
        status_callback=None
    ) -> str:
        """
        軽量モデル（Claude Haiku）でのフォールバック処理
        """
        start_time = time.time()
        try:
            if status_callback:
                await status_callback("軽量AIで応答を生成中...")
                
            async with self.semaphore:
                # より短いタイムアウトと軽量設定
                fallback_client = AsyncAnthropic(
                    api_key=self.api_key,
                    timeout=10.0,  # 短縮されたタイムアウト
                    max_retries=1   # リトライを1回に削減
                )
                
                # Claude Haikuモデルを使用
                kwargs = {
                    "model": self.fallback_model,
                    "messages": messages,
                    "max_tokens": min(max_tokens, 500) if max_tokens else 500,
                    "temperature": temperature
                }
                if system:
                    kwargs["system"] = system
                
                response = await fallback_client.messages.create(**kwargs)
                response_time = time.time() - start_time
                
                # 使用トークン数の取得
                usage = getattr(response, 'usage', None)
                if usage:
                    input_tokens = getattr(usage, 'input_tokens', 0)
                    output_tokens = getattr(usage, 'output_tokens', 0)
                    total_tokens = input_tokens + output_tokens
                else:
                    input_tokens = output_tokens = total_tokens = 0
                
                logger.info(
                    f"🔸 Claude Fallback: model={self.fallback_model}, 応答秒={response_time:.2f}s, "
                    f"入力トークン={input_tokens}, 出力トークン={output_tokens}, 合計トークン={total_tokens}"
                )
                
                logger.info("✅ 軽量モデルフォールバック成功")
                return response.content[0].text if response.content else ""
                
        except Exception as fallback_error:
            logger.error(f"❌ 軽量モデルフォールバックも失敗: {fallback_error}")
            raise RuntimeError(f"メインモデルとフォールバックモデルの両方が失敗しました: {fallback_error}")
    
    # =====================================
    # ユーティリティメソッド
    # =====================================
    
    def _update_metrics(self, response_time: float, request_type: str, total_tokens: int = 0):
        """
        メトリクスを更新
        
        Args:
            response_time: レスポンス時間
            request_type: "sync" または "async"
            total_tokens: 合計トークン数
        """
        self.request_count += 1
        self.total_response_time += response_time
        self.total_tokens += total_tokens
        
        if request_type == "sync":
            self.sync_requests += 1
        else:
            self.async_requests += 1
        
        # 10リクエストごとにログ
        if self.request_count % 10 == 0:
            avg_time = self.total_response_time / self.request_count
            avg_tokens = self.total_tokens / self.request_count if self.request_count > 0 else 0
            logger.info(
                f"📊 Claude LLMメトリクス: "
                f"総リクエスト={self.request_count}, "
                f"平均応答時間={avg_time:.2f}秒, "
                f"平均トークン={avg_tokens:.0f}, "
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
                "average_tokens": 0,
                "total_tokens": 0,
                "sync_requests": 0,
                "async_requests": 0,
                "active_connections": self.semaphore._value if hasattr(self.semaphore, '_value') else None
            }
        
        return {
            "total_requests": self.request_count,
            "average_response_time": self.total_response_time / self.request_count,
            "average_tokens": self.total_tokens / self.request_count,
            "total_tokens": self.total_tokens,
            "sync_requests": self.sync_requests,
            "async_requests": self.async_requests,
            "active_connections": self.semaphore._value if hasattr(self.semaphore, '_value') else None
        }


# =====================================
# シングルトンインスタンス管理
# =====================================

_claude_instance: Optional[ClaudeLLMClient] = None


def get_claude_llm_client(pool_size: int = None) -> ClaudeLLMClient:
    """
    Claude LLMクライアントのシングルトンを取得

    Args:
        pool_size: プールサイズ（初回のみ有効、Noneの場合は環境変数から取得）

    Returns:
        ClaudeLLMClientのインスタンス
    """
    global _claude_instance

    if _claude_instance is None:
        _claude_instance = ClaudeLLMClient(pool_size=pool_size)

    return _claude_instance
