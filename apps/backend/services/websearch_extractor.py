"""
WebSearch結果の抽出ユーティリティ
OpenAI Response APIのWebSearchツール実行結果から情報を抽出
"""

import logging
import json
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class WebSearchExtractor:
    """WebSearch結果を抽出・整形するクラス"""
    
    @staticmethod
    def extract_web_search_results(response_obj: Any) -> Optional[List[Dict[str, Any]]]:
        """
        Response APIのレスポンスオブジェクトからWebSearch結果を抽出
        
        Args:
            response_obj: OpenAI Response APIのレスポンスオブジェクト
            
        Returns:
            WebSearch結果のリスト、またはNone
            各結果は以下の形式:
            {
                "url": "https://example.com",
                "title": "Example Title",
                "snippet": "Description text...",
                "domain": "example.com"
            }
        """
        try:
            # Response.outputからイベントを取得
            events = getattr(response_obj, "output", []) or []
            web_search_results = []
            
            for event in events:
                event_type = getattr(event, "type", None)
                
                # WebSearch関連のイベントを検出
                if event_type and "web_search" in event_type.lower():
                    logger.info(f"WebSearch event detected: {event_type}")
                    
                    # イベントからデータを取得
                    if hasattr(event, "model_dump"):
                        event_data = event.model_dump()
                    elif hasattr(event, "dict"):
                        event_data = event.dict()
                    else:
                        event_data = {}
                    
                    # 検索結果を抽出
                    if "results" in event_data:
                        results = event_data["results"]
                        if isinstance(results, list):
                            for result in results:
                                formatted_result = WebSearchExtractor._format_search_result(result)
                                if formatted_result:
                                    web_search_results.append(formatted_result)
                    
                    # または、contentフィールドに結果がある場合
                    elif "content" in event_data:
                        content = event_data["content"]
                        if isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and "url" in item:
                                    formatted_result = WebSearchExtractor._format_search_result(item)
                                    if formatted_result:
                                        web_search_results.append(formatted_result)
            
            if web_search_results:
                logger.info(f"Extracted {len(web_search_results)} WebSearch results")
                return web_search_results
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract WebSearch results: {e}")
            return None
    
    @staticmethod
    def _format_search_result(result: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        個々の検索結果をフォーマット
        
        Args:
            result: 検索結果の辞書
            
        Returns:
            フォーマットされた結果、または無効な場合はNone
        """
        try:
            # URLは必須
            if "url" not in result:
                return None
            
            url = result["url"]
            
            # ドメインを抽出
            from urllib.parse import urlparse
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.replace("www.", "")
            
            return {
                "url": url,
                "title": result.get("title", domain),
                "snippet": result.get("snippet", "") or result.get("description", ""),
                "domain": domain,
                "favicon": f"https://{domain}/favicon.ico" if domain else None
            }
            
        except Exception as e:
            logger.warning(f"Failed to format search result: {e}")
            return None
    
    @staticmethod
    def extract_citations_from_text(text: str) -> List[Dict[str, str]]:
        """
        テキストから引用形式のURL（[1] https://...）を抽出
        
        Args:
            text: 解析するテキスト
            
        Returns:
            引用リスト
        """
        import re
        
        citations = []
        # [番号] URL形式の引用を検出
        pattern = r'\[(\d+)\]\s*(https?://[^\s\]]+)'
        matches = re.findall(pattern, text)
        
        for number, url in matches:
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                domain = parsed.netloc.replace("www.", "")
                
                citations.append({
                    "number": number,
                    "url": url,
                    "title": f"参考資料 {number}",
                    "domain": domain
                })
            except:
                continue
        
        return citations
    
    @staticmethod
    def format_response_with_sources(
        response_text: str, 
        web_search_results: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        レスポンステキストとWebSearch結果を統合してフォーマット
        
        Args:
            response_text: AIのレスポンステキスト
            web_search_results: WebSearch結果のリスト
            
        Returns:
            フォーマットされたレスポンス
        """
        # テキストから引用を抽出
        citations = WebSearchExtractor.extract_citations_from_text(response_text)
        
        # WebSearch結果と引用を統合
        sources = []
        
        # WebSearch結果を追加
        if web_search_results:
            for result in web_search_results:
                sources.append({
                    "type": "web_search",
                    "url": result["url"],
                    "title": result.get("title", ""),
                    "snippet": result.get("snippet", ""),
                    "domain": result.get("domain", ""),
                    "favicon": result.get("favicon")
                })
        
        # 引用を追加（重複を避ける）
        existing_urls = {s["url"] for s in sources}
        for citation in citations:
            if citation["url"] not in existing_urls:
                sources.append({
                    "type": "citation",
                    "url": citation["url"],
                    "title": citation["title"],
                    "snippet": "",
                    "domain": citation["domain"],
                    "number": citation["number"]
                })
        
        return {
            "response": response_text,
            "sources": sources if sources else None
        }