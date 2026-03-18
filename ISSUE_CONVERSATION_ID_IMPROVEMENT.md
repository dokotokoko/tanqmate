# Issue: conversation_id の管理改善

## 作成日
2024-03-18

## 問題の概要
現在のチャットシステムにおいて、`conversation_id`の管理が不完全であり、メッセージの表示バグ（時系列の乱れ、発話者の誤表示、メッセージの非表示）の根本原因の一つとなっている。

## 現状の問題点

### 1. 会話の分断
- ページリロード時に新しい`conversation_id`が生成される可能性がある
- 同じユーザーの履歴が複数の会話セッションに分散している
- 長時間経過後にチャットを開くと、過去の会話と新しい会話が混在する

### 2. 不整合な管理体制
- フロントエンド（`AIChat.tsx`）とバックエンド（`chat_service.py`）で別々に会話を作成できる
- `conversation_id`がnullのメッセージが存在する可能性がある
- 会話の作成タイミングが統一されていない

### 3. 履歴取得の問題
- `/chat/history`エンドポイントが`conversation_id`を考慮せず全メッセージを取得
- 異なる会話のメッセージが混在して表示される
- 会話単位での履歴管理が不完全

## 現在のデータベース構造

### chat_conversations テーブル
```sql
- id (UUID): 会話ID
- user_id: ユーザーID
- title: 会話タイトル
- is_active: アクティブフラグ
- created_at: 作成日時
- updated_at: 更新日時
```

### chat_logs テーブル
```sql
- id: メッセージID
- user_id: ユーザーID
- message: メッセージ内容
- sender: 発話者（"user" / "ai"）
- conversation_id: 会話ID（nullable）
- created_at: 作成日時
```

## 改善提案

### 短期的改善（優先度: 高）

#### 1. 履歴取得APIの修正
```python
# backend/services/chat_service.py
def get_chat_history(self, user_id: int, conversation_id: str = None, limit: int = 20):
    """
    会話単位で履歴を取得する
    conversation_idが指定されない場合は、最新のアクティブな会話を取得
    """
    if not conversation_id:
        # 最新のアクティブな会話IDを取得
        conversation_id = self.get_active_conversation(user_id)
    
    # 特定の会話のメッセージのみ取得
    result = self.supabase.table("chat_logs")\
        .select("*")\
        .eq("user_id", user_id)\
        .eq("conversation_id", conversation_id)\
        .order("created_at", desc=False)\
        .limit(limit)\
        .execute()
```

#### 2. conversation_id の必須化
```sql
-- データベースの制約を追加
ALTER TABLE chat_logs 
ALTER COLUMN conversation_id SET NOT NULL;

-- 外部キー制約を追加
ALTER TABLE chat_logs 
ADD CONSTRAINT fk_conversation 
FOREIGN KEY (conversation_id) 
REFERENCES chat_conversations(id);
```

### 中期的改善（優先度: 中）

#### 1. 会話管理の一元化
- バックエンドで会話の作成・管理を一元化
- フロントエンドは会話IDの管理から解放
- APIが自動的にアクティブな会話を使用/作成

#### 2. 会話のライフサイクル管理
```python
class ConversationManager:
    def get_or_create_active_conversation(self, user_id: int) -> str:
        """
        ユーザーごとに1つのアクティブな会話を維持
        24時間以上経過した会話は自動的に新規作成
        """
        pass
    
    def archive_old_conversations(self, user_id: int):
        """
        古い会話を自動的にアーカイブ
        """
        pass
```

### 長期的改善（優先度: 低）

#### 1. 会話のグループ化機能
- トピックごとに会話を自動分類
- 関連する会話をスレッドとして表示
- 会話間の参照機能

#### 2. 会話の検索・フィルタリング
- 日付範囲での会話検索
- キーワードでの会話検索
- 会話のタグ付け機能

## 影響範囲

### フロントエンド
- `AIChat.tsx`: 会話管理ロジックの簡素化
- `chatStore.ts`: conversation_id の永続化改善
- `ChatHistory.tsx`: 会話単位での履歴表示

### バックエンド
- `chat_service.py`: get_chat_history の修正
- `chat_router.py`: APIレスポンスの調整
- `conversation_api.py`: 会話管理の強化

## 期待される効果

1. **メッセージ表示の安定性向上**
   - 時系列の乱れ解消
   - 発話者の正確な表示
   - メッセージの欠落防止

2. **ユーザー体験の改善**
   - 会話の継続性確保
   - 履歴の整合性向上
   - パフォーマンスの改善

3. **保守性の向上**
   - デバッグの容易化
   - データ整合性の保証
   - 拡張性の確保

## 実装優先度

1. **即座に対応すべき項目**（1-2日）
   - 履歴取得APIで`conversation_id`によるフィルタリング実装
   - フロントエンドでの`conversation_id`確認ロジック追加

2. **次のスプリントで対応**（1週間）
   - データベース制約の追加
   - 会話管理の一元化

3. **将来的な機能拡張**（1ヶ月以降）
   - 会話のグループ化
   - 高度な検索機能

## 関連Issue
- メッセージ表示のバグ修正
- API レスポンスフォーマットの統一
- データフローアーキテクチャの改善

## 参考資料
- 現在の実装: `backend/services/chat_service.py:477-522`
- フロントエンド: `react-app/src/components/MemoChat/AIChat.tsx:352-397`
- Store管理: `react-app/src/stores/chatStore.ts:355-358`

## 備考
この改善は、チャットシステム全体の安定性と信頼性を大幅に向上させる重要な取り組みである。特に、ユーザーが「次の日に開いたら表示がおかしくなる」という問題の根本的な解決につながる。