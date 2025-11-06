"""
会話フィルター
探究学習に関係ない発話（挨拶など）を識別し、オントロジー照合から除外
"""

import re
import random
from typing import Dict, Tuple, Optional, List
from datetime import datetime, time
import logging

logger = logging.getLogger(__name__)


class ConversationFilter:
    """会話内容をフィルタリングして探究学習に関係ない発話を識別"""
    
    def __init__(self):
        # 挨拶パターンの定義（正規表現）
        self.greeting_patterns = [
            r'^(こんにちは|こんばんは|おはよう|やあ|ハロー|hello|hi|hey)',
            r'^(お疲れ様|お疲れさま|おつかれ)',
            r'^(ありがとう|どうも|感謝)',
            r'^(さよなら|またね|バイバイ|じゃあね|bye|goodbye)',
            r'^(はじめまして|初めまして)',
            r'^(よろしく|宜しく)',
            r'^(元気|げんき)(ですか|？)?$',
            r'^(調子|ちょうし)(は)?(どう|いかが)',
        ]
        
        # 挨拶応答のテンプレート
        self.greeting_responses = {
            'morning': [
                'おはようございます！今日も探究学習を楽しみましょう。',
                'おはようございます。どのようなテーマについて考えていますか？',
            ],
            'afternoon': [
                'こんにちは！探究学習のお手伝いをさせていただきます。',
                'こんにちは。今日はどんなことを探究したいですか？',
            ],
            'evening': [
                'こんばんは！本日の探究はいかがでしたか？',
                'こんばんは。何か気になることはありますか？',
            ],
            'thanks': [
                'どういたしまして！他にも気になることがあれば遠慮なくどうぞ。',
                'お役に立てて嬉しいです。探究学習を楽しんでください！',
            ],
            'goodbye': [
                'またお会いしましょう！良い探究を！',
                'それでは、また。学びの旅を楽しんでください！',
            ],
            'generic': [
                'こんにちは！どのようなテーマについて探究したいですか？',
                'よろしくお願いします。何かお手伝いできることはありますか？',
            ]
        }
        
        # フィルター統計
        self.stats = {
            'total_messages': 0,
            'filtered_greetings': 0,
            'passed_to_ontology': 0
        }
    
    def is_greeting(self, message: str) -> bool:
        """メッセージが挨拶かどうかを判定"""
        # 小文字化して判定
        message_lower = message.lower().strip()
        
        # 各パターンとマッチング
        for pattern in self.greeting_patterns:
            if re.search(pattern, message_lower, re.IGNORECASE):
                return True
        
        # 短すぎるメッセージも挨拶として扱う可能性
        if len(message_lower) <= 5 and not any(c in message_lower for c in ['?', '？', '。', '、']):
            # 「はい」「うん」「OK」などの相槌も挨拶カテゴリとして扱う
            simple_responses = ['はい', 'うん', 'ok', 'yes', 'no', 'そう', 'ああ']
            if message_lower in simple_responses:
                return True
        
        return False
    
    def get_greeting_response(self, message: str) -> str:
        """挨拶に対する適切な応答を生成"""
        current_hour = datetime.now().hour
        message_lower = message.lower().strip()
        
        # 時間帯に応じた挨拶
        if 'おはよう' in message_lower or (5 <= current_hour < 10):
            responses = self.greeting_responses['morning']
        elif 'こんばんは' in message_lower or (17 <= current_hour < 24):
            responses = self.greeting_responses['evening']
        elif 'ありがとう' in message_lower or '感謝' in message_lower:
            responses = self.greeting_responses['thanks']
        elif 'さよなら' in message_lower or 'またね' in message_lower or 'bye' in message_lower:
            responses = self.greeting_responses['goodbye']
        elif 'こんにちは' in message_lower or (10 <= current_hour < 17):
            responses = self.greeting_responses['afternoon']
        else:
            responses = self.greeting_responses['generic']
        
        return random.choice(responses)
    
    def filter_message(self, message: str, user_id: str = None) -> Tuple[bool, Optional[str], str]:
        """
        メッセージをフィルタリング
        
        Returns:
            Tuple[bool, Optional[str], str]: 
                - bool: オントロジー処理をスキップするか
                - Optional[str]: スキップ時の応答（Noneの場合はオントロジー処理へ）
                - str: フィルタリング理由
        """
        self.stats['total_messages'] += 1
        
        # 挨拶判定
        if self.is_greeting(message):
            self.stats['filtered_greetings'] += 1
            response = self.get_greeting_response(message)
            logger.info(f"🤝 挨拶として処理: '{message[:30]}...' -> スキップ")
            return True, response, "greeting"
        
        # 探究学習に関連する発話はオントロジー処理へ
        self.stats['passed_to_ontology'] += 1
        logger.debug(f"🎯 オントロジー処理へ: '{message[:30]}...'")
        return False, None, "inquiry"
    
    def should_use_ontology(self, message: str) -> bool:
        """オントロジー処理を使用すべきかを判定（簡易版）"""
        return not self.is_greeting(message)
    
    def get_statistics(self) -> Dict[str, any]:
        """フィルタリング統計を取得"""
        return {
            'total_messages': self.stats['total_messages'],
            'filtered_greetings': self.stats['filtered_greetings'],
            'passed_to_ontology': self.stats['passed_to_ontology'],
            'filter_rate': (
                self.stats['filtered_greetings'] / max(1, self.stats['total_messages'])
            ) * 100
        }
    
    def add_custom_pattern(self, pattern: str, category: str = 'greeting'):
        """カスタムパターンを追加"""
        if category == 'greeting':
            self.greeting_patterns.append(pattern)
            logger.info(f"✅ カスタム挨拶パターン追加: {pattern}")
    
    def reset_statistics(self):
        """統計をリセット"""
        self.stats = {
            'total_messages': 0,
            'filtered_greetings': 0,
            'passed_to_ontology': 0
        }
        logger.info("📊 フィルター統計をリセット")


class AdvancedConversationFilter(ConversationFilter):
    """拡張版会話フィルター（将来的な機能拡張用）"""
    
    def __init__(self):
        super().__init__()
        
        # 追加のフィルターカテゴリ
        self.small_talk_patterns = [
            r'(天気|てんき).*(どう|いかが|ですか)',
            r'(暑い|寒い|暖かい|涼しい)',
            r'(週末|休み).*(どう|何|予定)',
        ]
        
        # 探究関連キーワード（これらが含まれる場合は必ずオントロジーへ）
        self.inquiry_keywords = [
            '研究', '調査', '分析', '考察', '仮説', '実験',
            '理由', 'なぜ', 'どうして', '原因', '結果',
            '学習', '勉強', '理解', '知りたい', '教えて',
            'について', '関して', 'とは何', 'どのように'
        ]
    
    def has_inquiry_intent(self, message: str) -> bool:
        """探究意図があるかを判定"""
        message_lower = message.lower()
        
        # 探究キーワードのチェック
        for keyword in self.inquiry_keywords:
            if keyword in message_lower:
                return True
        
        # 疑問文のチェック
        if any(q in message for q in ['？', '?', 'か？', 'ですか']):
            # ただし挨拶の疑問文は除外
            if not self.is_greeting(message):
                return True
        
        return False
    
    def filter_message(self, message: str, user_id: str = None) -> Tuple[bool, Optional[str], str]:
        """拡張版フィルタリング"""
        
        # 探究意図がある場合は必ずオントロジーへ
        if self.has_inquiry_intent(message):
            self.stats['passed_to_ontology'] += 1
            return False, None, "inquiry_intent"
        
        # 基本フィルタリングを実行
        return super().filter_message(message, user_id)