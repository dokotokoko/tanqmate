# services/response_styles.py - 応答スタイル管理

from typing import Dict, Optional
import sys
import os

# プロンプトモジュールをインポート
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'prompt'))
from prompt import RESPONSE_STYLE_PROMPTS

class ResponseStyleManager:
    """応答スタイルとプロンプトを繋ぐマネージャー"""
    
    @classmethod
    def get_system_prompt(cls, style: Optional[str] = None) -> str:
        """
        指定されたスタイルに対応するシステムプロンプトを返す
        
        Args:
            style: 応答スタイルのID（organize, research, ideas, deepen, expand, custom等）
        
        Returns:
            対応するシステムプロンプト
        """
        if not style or style not in RESPONSE_STYLE_PROMPTS:
            # デフォルトは "organize" スタイル
            return RESPONSE_STYLE_PROMPTS.get("organize", list(RESPONSE_STYLE_PROMPTS.values())[0])
        
        return RESPONSE_STYLE_PROMPTS[style]
    
    @classmethod
    def get_available_styles(cls) -> Dict[str, str]:
        """
        利用可能なスタイルとその説明を返す
        
        Returns:
            スタイルIDとプロンプトのディクショナリ
        """
        return RESPONSE_STYLE_PROMPTS.copy()
    
    @classmethod
    def is_valid_style(cls, style: str) -> bool:
        """
        指定されたスタイルが有効かどうかを判定
        
        Args:
            style: チェックするスタイルID
        
        Returns:
            有効なスタイルの場合True
        """
        return style in RESPONSE_STYLE_PROMPTS
    
    @classmethod
    def get_style_list(cls) -> list:
        """
        利用可能なスタイルIDのリストを返す
        
        Returns:
            スタイルIDのリスト
        """
        return list(RESPONSE_STYLE_PROMPTS.keys())
    
    @classmethod
    def get_style_description(cls, style: str) -> Optional[str]:
        """
        スタイルの説明（プロンプトの最初の行）を取得
        
        Args:
            style: スタイルID
        
        Returns:
            スタイルの説明文、見つからない場合はNone
        """
        if style not in RESPONSE_STYLE_PROMPTS:
            return None
        
        # プロンプトの最初の2行程度を説明として返す
        prompt_lines = RESPONSE_STYLE_PROMPTS[style].split('\n')
        description_lines = []
        for line in prompt_lines[1:3]:  # 最初の2行をチェック
            if line.strip() and not line.startswith('-'):
                description_lines.append(line.strip())
        
        return ' '.join(description_lines) if description_lines else style