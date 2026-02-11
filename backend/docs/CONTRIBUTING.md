# 🤝 探Qメイト コントリビューションガイド

探Qメイトプロジェクトへの貢献に興味を持っていただき、ありがとうございます！
このガイドでは、プロジェクトに貢献する方法について説明します。

## 📋 目次
- [行動規範](#行動規範)
- [貢献の方法](#貢献の方法)
- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発フロー](#開発フロー)
- [コーディング規約](#コーディング規約)
- [コミットメッセージ規約](#コミットメッセージ規約)
- [プルリクエストのガイドライン](#プルリクエストのガイドライン)
- [Issue の報告](#issue-の報告)

## 🤝 行動規範

- **敬意**: すべての貢献者に敬意を持って接しましょう
- **建設的**: フィードバックは建設的に、具体的に
- **包括的**: 多様性を尊重し、誰もが参加しやすい環境づくりを

## 🎯 貢献の方法

### バグ報告
- Issue テンプレートを使用
- 再現手順を明確に記載
- 環境情報（OS、ブラウザ、Node/Pythonバージョン）を含める

### 機能提案
- まず Discussion で議論
- ユースケースを明確に説明
- 可能であれば実装案も提示

### コード貢献
- 小さく、焦点を絞った変更を推奨
- 既存のコードスタイルに従う
- テストを追加する

### ドキュメント改善
- タイポ修正も歓迎
- 使用例の追加
- 翻訳の提供

## 🛠️ 開発環境のセットアップ

詳細は [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) を参照してください。

### クイックスタート
```bash
# リポジトリをクローン
git clone https://github.com/your-username/tanqmates.git
cd tanqmates

# ブランチを作成
git checkout -b feature/your-feature-name

# Docker環境で起動
docker-compose -f docker-compose.dev.yml up --build
```

## 🔄 開発フロー

### 1. ブランチ戦略

```
main
  ├── develop
  │    ├── feature/新機能名
  │    ├── fix/バグ修正名
  │    └── docs/ドキュメント更新
  └── hotfix/緊急修正
```

### 2. ブランチ命名規則

- `feature/` - 新機能追加
- `fix/` - バグ修正
- `docs/` - ドキュメント更新
- `refactor/` - リファクタリング
- `test/` - テスト追加・修正
- `hotfix/` - 緊急修正

### 3. 開発手順

1. **Issue を確認または作成**
   - 既存の Issue がない場合は新規作成
   - 自分をアサイン

2. **ブランチを作成**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/issue-123-add-chat-feature
   ```

3. **開発とテスト**
   ```bash
   # Backend テスト
   cd backend
   pytest tests/

   # Frontend テスト
   cd react-app
   npm test
   ```

4. **コミット**
   ```bash
   git add .
   git commit -m "feat: チャット機能を追加 (#123)"
   ```

5. **プッシュとPR作成**
   ```bash
   git push origin feature/issue-123-add-chat-feature
   ```

## 📝 コーディング規約

### Python (Backend)

```python
# 良い例
def calculate_score(user_id: int, quiz_id: int) -> float:
    """
    ユーザーのクイズスコアを計算する
    
    Args:
        user_id: ユーザーID
        quiz_id: クイズID
    
    Returns:
        計算されたスコア（0.0-100.0）
    """
    # 実装...
```

**規約:**
- PEP 8 に準拠
- Type hints を使用
- Docstrings を記載（Google スタイル）
- 関数名は snake_case
- クラス名は PascalCase

### TypeScript/React (Frontend)

```typescript
// 良い例
interface UserProps {
  id: number;
  name: string;
  isActive?: boolean;
}

export const UserCard: React.FC<UserProps> = ({ id, name, isActive = true }) => {
  // コンポーネント実装
  return (
    <Card>
      <Typography>{name}</Typography>
    </Card>
  );
};
```

**規約:**
- ESLint ルールに従う
- TypeScript の型を活用
- コンポーネントは関数コンポーネント + hooks
- 命名規則：
  - コンポーネント: PascalCase
  - 関数: camelCase
  - 定数: UPPER_SNAKE_CASE

## 📋 コミットメッセージ規約

### フォーマット
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードフォーマット（動作に影響なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルドプロセスやツールの変更

### 例
```
feat(chat): AIレスポンスのストリーミング対応を追加

- Server-Sent Events を使用した実装
- UIにタイピングアニメーション追加
- エラーハンドリングの改善

Closes #456
```

## 🚀 プルリクエストのガイドライン

### PR テンプレート
```markdown
## 📝 概要
このPRで実装した内容の簡潔な説明

## 🎯 関連 Issue
Closes #123

## ✅ チェックリスト
- [ ] コードが既存のスタイルに従っている
- [ ] セルフレビュー実施済み
- [ ] テストを追加/更新した
- [ ] ドキュメントを更新した（必要な場合）
- [ ] 破壊的変更なし（ある場合は詳細記載）

## 📸 スクリーンショット（UIの変更がある場合）

## 💭 補足事項
レビュアーへの追加情報
```

### PR サイズの目安
- **Small**: ~100行 (即レビュー可能)
- **Medium**: 100-500行 (1-2日でレビュー)
- **Large**: 500行+ (事前相談推奨)

## 🐛 Issue の報告

### バグ報告テンプレート
```markdown
## 🐛 バグの説明
何が起きているか

## 📝 再現手順
1. '...'に移動
2. '...'をクリック
3. '...'を入力
4. エラーが発生

## 🎯 期待される動作
本来どうなるべきか

## 📸 スクリーンショット
可能であれば添付

## 🖥️ 環境
- OS: [例: Windows 11]
- ブラウザ: [例: Chrome 120]
- Node.js: [例: v18.17.0]
- Python: [例: 3.10.0]
```

## 🏆 貢献者の認識

すべての貢献者は以下に記載されます：
- README.md の Contributors セクション
- リリースノート
- プロジェクトWebサイト（将来的に）

## 📚 その他のリソース

- [開発環境セットアップ](DEVELOPMENT_SETUP.md)
- [API ドキュメント](API_DOCUMENTATION.md)
- [アーキテクチャガイド](docs/ARCHITECTURE.md)
- [FAQ](docs/FAQ.md)

## 💬 質問・サポート

- **GitHub Discussions**: 一般的な質問や議論
- **GitHub Issues**: バグ報告や機能要望
- **Discord**: リアルタイムチャット（準備中）

---

**ありがとうございます！** 🙏

あなたの貢献が探Qメイトをより良いものにします。