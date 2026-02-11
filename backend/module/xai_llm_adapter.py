"""
xAI LLMアダプター
learning_plannnerクラスと互換性のあるインターフェースを提供
探Qマップ機能専用のxAI統合
"""

import os
import asyncio
import time
import json
import logging
from typing import List, Dict, Any, Optional, Union, AsyncIterator
from dotenv import load_dotenv
from collections import deque

from module.xai_llm_api import XAIClient

logger = logging.getLogger(__name__)


class XAILLMAdapter:
    """
    xAI用のアダプタークラス
    learning_plannnerと同じインターフェースを提供し、
    既存のコードとの互換性を保つ
    """
    
    def __init__(self, model: str = "grok-4-1-fast-reasoning", pool_size: int = 5):
        """
        初期化
        
        Args:
            model: 使用するxAIモデル（デフォルト: grok-beta）
            pool_size: 非同期処理用のセマフォプールサイズ
        """
        load_dotenv()
        self.model = model
        
        # XAIClientのインスタンスを作成
        self.xai_client = XAIClient(model=model, timeout=60)
        
        # 非同期処理用のセマフォ（同時実行数を制限）
        self.semaphore = asyncio.Semaphore(pool_size)
        
        # メトリクス収集用
        self.request_count = 0
        self.total_response_time = 0.0
        self.async_requests = 0
        
        logger.info(f"XAILLMAdapter initialized with model: {model}")
    
    # =====================================
    # learning_plannner互換メソッド
    # =====================================
    
    def text(self, role: str, content: str) -> Dict[str, Any]:
        """
        テキスト入力用のメッセージアイテムを作成（learning_plannner互換）
        
        Args:
            role: "system", "user", "assistant"のいずれか
            content: メッセージのテキスト内容
            
        Returns:
            メッセージ辞書
        """
        return {
            "role": role,
            "content": content
        }
    
    async def generate_text(
        self, 
        input_items: List[Dict[str, Any]], 
        max_tokens: int = 2000,
        temperature: float = 0.7,
        top_p: float = 0.9
    ) -> str:
        """
        非同期でテキスト生成（learning_plannner互換）
        
        Args:
            input_items: メッセージリスト
            max_tokens: 最大トークン数
            temperature: 生成の多様性
            top_p: 生成の多様性（nucleus sampling）
            
        Returns:
            生成されたテキスト
        """
        async with self.semaphore:
            try:
                start_time = time.time()
                self.request_count += 1
                self.async_requests += 1
                
                # メッセージフォーマットを変換
                messages = []
                system_message = None
                
                for item in input_items:
                    role = item.get("role")
                    content = item.get("content")
                    
                    # contentが辞書/リストの場合はテキストを抽出
                    if isinstance(content, list):
                        # Response API形式からテキストを抽出
                        text_content = ""
                        for part in content:
                            if isinstance(part, dict) and "text" in part:
                                text_content = part["text"]
                                break
                        content = text_content
                    elif isinstance(content, dict):
                        content = content.get("text", "")
                    
                    if role == "system":
                        system_message = content
                    else:
                        messages.append({"role": role, "content": content})
                
                # xAIのchat_with_historyメソッドを使用
                if system_message:
                    messages.insert(0, {"role": "system", "content": system_message})
                
                # 非同期実行のために別スレッドで実行
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self.xai_client.chat_with_history,
                    messages
                )
                
                elapsed_time = time.time() - start_time
                self.total_response_time += elapsed_time
                
                logger.info(f"✅ xAI生成完了: {len(response)} 文字 (処理時間: {elapsed_time:.2f}秒)")
                
                return response
                
            except Exception as e:
                logger.error(f"❌ xAIテキスト生成エラー: {e}")
                raise
    
    def generate_text_sync(
        self, 
        input_items: List[Dict[str, Any]], 
        max_tokens: int = 2000,
        temperature: float = 0.7
    ) -> str:
        """
        同期的にテキスト生成（learning_plannner互換）
        
        Args:
            input_items: メッセージリスト
            max_tokens: 最大トークン数
            temperature: 生成の多様性
            
        Returns:
            生成されたテキスト
        """
        try:
            start_time = time.time()
            self.request_count += 1
            
            messages = []
            system_message = None
            
            for item in input_items:
                role = item.get("role")
                content = item.get("content")
                
                # contentが辞書/リストの場合はテキストを抽出
                if isinstance(content, list):
                    text_content = ""
                    for part in content:
                        if isinstance(part, dict) and "text" in part:
                            text_content = part["text"]
                            break
                    content = text_content
                elif isinstance(content, dict):
                    content = content.get("text", "")
                
                if role == "system":
                    system_message = content
                else:
                    messages.append({"role": role, "content": content})
            
            # システムメッセージを先頭に追加
            if system_message:
                messages.insert(0, {"role": "system", "content": system_message})
            
            response = self.xai_client.chat_with_history(messages)
            
            elapsed_time = time.time() - start_time
            self.total_response_time += elapsed_time
            
            logger.info(f"✅ xAI同期生成完了: {len(response)} 文字 (処理時間: {elapsed_time:.2f}秒)")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ xAI同期生成エラー: {e}")
            raise
    
    async def generate_streaming_text(
        self, 
        input_items: List[Dict[str, Any]], 
        max_tokens: int = 2000
    ) -> AsyncIterator[str]:
        """
        ストリーミング生成（将来実装用のプレースホルダー）
        
        現在はxAI SDKがストリーミングをサポートしていないため、
        一括生成して文字単位でyieldする
        """
        try:
            # 一括生成
            full_response = await self.generate_text(input_items, max_tokens)
            
            # 文字単位でストリーミング風に返す
            chunk_size = 10  # 10文字ずつ返す
            for i in range(0, len(full_response), chunk_size):
                chunk = full_response[i:i+chunk_size]
                yield chunk
                await asyncio.sleep(0.01)  # 小さな遅延を入れてストリーミング感を演出
                
        except Exception as e:
            logger.error(f"❌ xAIストリーミング生成エラー: {e}")
            raise
    
    async def batch_generate(
        self, 
        requests: List[Dict[str, Any]], 
        max_concurrent: int = 3
    ) -> List[str]:
        """
        バッチ生成（複数リクエストの並列処理）
        
        Args:
            requests: リクエストのリスト
            max_concurrent: 最大同時実行数
            
        Returns:
            生成結果のリスト
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_request(request):
            async with semaphore:
                return await self.generate_text(
                    request["input_items"],
                    request.get("max_tokens", 2000)
                )
        
        tasks = [process_request(req) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # エラーを文字列に変換
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"バッチ処理エラー: {result}")
                processed_results.append(f"エラー: {str(result)}")
            else:
                processed_results.append(result)
        
        return processed_results
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        メトリクス情報を取得
        
        Returns:
            メトリクス情報
        """
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        
        return {
            "total_requests": self.request_count,
            "async_requests": self.async_requests,
            "sync_requests": self.request_count - self.async_requests,
            "average_response_time": avg_response_time,
            "model": self.model,
            "provider": "xAI"
        }
    
    # =====================================
    # 探Qマップ専用の最適化メソッド
    # =====================================
    
    def optimize_prompt_for_grok(self, prompt: str) -> str:
        """
        Grok用にプロンプトを最適化
        
        Args:
            prompt: 元のプロンプト
            
        Returns:
            最適化されたプロンプト
        """
        # JSON生成の明示的な指示を追加
        optimization_hints = """
【重要な指示】
- 必ず有効なJSON形式で応答してください
- コメントや説明文は含めないでください
- 数値は引用符で囲まないでください
- 配列は空でも良いが、必ず[]で表現してください
- 日本語のテキストはそのまま使用してください
"""
        
        return prompt + "\n\n" + optimization_hints
    
    def parse_json_response(self, response: str) -> Dict[str, Any]:
        """
        xAIからのレスポンスをJSONとしてパース
        エラーハンドリング付き
        
        Args:
            response: xAIからのレスポンス文字列
            
        Returns:
            パースされたJSON辞書
        """
        try:
            # コードブロックの除去
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            
            # 前後の空白を削除
            response = response.strip()
            
            # JSONパース
            return json.loads(response)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON パースエラー: {e}")
            logger.error(f"レスポンス内容: {response[:500]}...")
            
            # フォールバック: 基本的な構造を返す
            return {
                "error": "JSONパースに失敗しました",
                "raw_response": response[:1000]
            }


# 使用例とテスト
if __name__ == "__main__":
    import asyncio
    
    async def test_xai_adapter():
        # アダプターの初期化
        adapter = XAILLMAdapter()
        
        # テストメッセージ
        messages = [
            adapter.text("system", "あなたは優秀な学習支援アシスタントです。"),
            adapter.text("user", "Pythonの基本的なデータ型を3つ教えてください。簡潔に。")
        ]
        
        # 非同期生成のテスト
        print("=== 非同期生成テスト ===")
        response = await adapter.generate_text(messages, max_tokens=500)
        print(f"応答: {response[:200]}...")
        
        # メトリクス表示
        print("\n=== メトリクス ===")
        print(adapter.get_metrics())
    
    # テスト実行
    asyncio.run(test_xai_adapter())