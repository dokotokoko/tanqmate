import logging
from typing import Optional
import asyncio
import aiohttp
import json
import os

logger = logging.getLogger(__name__)

class TitleService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.api_url = "https://api.anthropic.com/v1/messages"
        
    async def generate_title_from_message(self, message: str) -> Optional[str]:
        """
        ユーザーのメッセージから会話タイトルを生成
        """
        try:
            prompt = f"""以下のユーザーの質問や発言から、15-20文字以内の簡潔な日本語の会話タイトルを生成してください。

ユーザーメッセージ: {message}

要件:
- 内容の本質を捉える簡潔なタイトル
- 「〜について」「〜の質問」「〜を教えて」などの冗長な表現は省略
- 具体的なキーワードを含める
- 最大20文字以内

例:
入力: "ReactでuseStateを使うときに、配列の要素を更新する方法を教えてください"
出力: React配列state更新方法

入力: "Pythonで大規模なCSVファイルを効率的に処理する方法"
出力: Python大規模CSV処理

入力: "機械学習モデルの過学習を防ぐ方法について"
出力: ML過学習対策手法

タイトルのみを出力してください。説明や追加のテキストは不要です。"""

            # Claude APIを呼び出し（軽量で高速な設定）
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            
            data = {
                "model": "claude-haiku-4-5",  # 高速な軽量モデル
                "max_tokens": 50,
                "temperature": 0.3,  # より決定的な出力
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=5)  # 5秒のタイムアウト
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        generated_title = result.get("content", [{}])[0].get("text", "").strip()
                        
                        # 20文字を超える場合は切り詰め
                        if len(generated_title) > 20:
                            generated_title = generated_title[:20]
                        
                        return generated_title if generated_title else None
                    else:
                        logger.error(f"Claude API error: {response.status}")
                        return None
                        
        except asyncio.TimeoutError:
            logger.warning("Title generation timeout")
            return None
        except Exception as e:
            logger.error(f"Error generating title: {str(e)}")
            return None
    
    def generate_fallback_title(self, message: str) -> str:
        """
        APIが利用できない場合のフォールバック
        """
        return "untitled"