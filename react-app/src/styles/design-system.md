# 探Qメイト デザインシステム ドキュメント

## 概要
このデザインシステムは、探Qメイトアプリケーション全体で一貫性のあるUIを提供するために作成されました。

## ファイル構成

```
src/
├── styles/
│   ├── design-system.ts    # デザイントークンと変数の定義
│   ├── global.css          # グローバルCSS
│   └── tablet.css          # タブレット対応CSS
└── components/
    └── common/             # 共通UIコンポーネント
        ├── Button.tsx      # ボタンコンポーネント
        ├── Card.tsx        # カードコンポーネント
        ├── Input.tsx       # 入力フィールドコンポーネント
        ├── Typography.tsx  # タイポグラフィコンポーネント
        ├── Badge.tsx       # バッジコンポーネント
        └── index.ts        # エクスポート

```

## 使用方法

### 1. デザイントークンの使用

```typescript
import { colors, spacing, typography } from '@/styles/design-system';

// カラーの使用
const primaryColor = colors.primary[500];
const errorColor = colors.error.main;

// スペーシングの使用
const padding = spacing.md; // 16px
const margin = spacing.lg;  // 24px

// タイポグラフィの使用
const headingStyle = typography.heading.h1;
```

### 2. 共通コンポーネントの使用

```typescript
import { Button, Card, Input, Typography, Badge } from '@/components/common';

// ボタン
<Button variant="primary" size="medium">
  クリック
</Button>

// カード
<Card variant="elevated" hoverable>
  コンテンツ
</Card>

// 入力フィールド
<Input
  label="メールアドレス"
  placeholder="example@email.com"
  variant="outlined"
/>

// タイポグラフィ
<Typography variant="h1" gradient gradientType="primary">
  見出しテキスト
</Typography>

// バッジ
<Badge variant="soft" color="success" size="small">
  完了
</Badge>
```

## デザイントークン

### カラーパレット

- **プライマリカラー**: 青系 (#059BFF)
- **セカンダリカラー**: オレンジ系 (#FF9800)
- **成功**: 緑 (#4CAF50)
- **エラー**: 赤 (#F44336)
- **警告**: オレンジ (#FF9800)
- **情報**: 水色 (#29B6F6)

### タイポグラフィ

- **フォントファミリー**: "Noto Sans JP", "Roboto", sans-serif
- **見出しサイズ**: h1(2.5rem) ~ h6(1.125rem)
- **本文サイズ**: large(1.125rem), regular(1rem), small(0.875rem)

### スペーシング

8pxベースのスペーシングシステム:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### ブレークポイント

- xs: 0px
- sm: 600px
- md: 960px
- lg: 1280px
- xl: 1920px

## コンポーネントバリエーション

### Button
- **variant**: primary, secondary, outline, ghost, danger
- **size**: small, medium, large
- **状態**: loading, disabled, fullWidth

### Card
- **variant**: default, elevated, outlined, gradient
- **プロパティ**: hoverable, noPadding

### Input
- **variant**: default, filled, outlined
- **アイコン**: startIcon, endIcon

### Typography
- **variant**: h1-h6, body, bodyLarge, bodySmall, caption, label
- **スタイル**: gradient, truncate
- **color**: primary, secondary, success, error, warning, info

### Badge
- **variant**: filled, outlined, soft
- **color**: primary, secondary, success, error, warning, info, default
- **size**: small, medium, large

## レスポンシブデザイン

タブレット専用のスタイルが `tablet.css` に定義されています：
- タッチターゲットサイズの最適化（最小44px）
- ドロワー幅の調整
- フォントサイズの拡大
- スペーシングの調整

## アクセシビリティ

- フォーカスインジケーターの明確な表示
- 高コントラストモード対応
- モーション削減対応
- 適切なカラーコントラスト比

## 移行ガイド

既存のコンポーネントを新しいデザインシステムに移行する手順：

1. Material-UIの直接インポートを共通コンポーネントに置き換える
2. インラインスタイルをデザイントークンに置き換える
3. カスタムCSSをデザインシステムの変数に置き換える

例：
```typescript
// Before
import { Button } from '@mui/material';
<Button sx={{ backgroundColor: '#059BFF', borderRadius: '14px' }}>

// After
import { Button } from '@/components/common';
<Button variant="primary">
```

## ベストプラクティス

1. **一貫性**: 常にデザインシステムのトークンを使用する
2. **再利用性**: 共通コンポーネントを優先的に使用する
3. **カスタマイズ**: 必要な場合は、sx propで微調整する
4. **アクセシビリティ**: 適切なセマンティクスとARIA属性を使用する
5. **レスポンシブ**: モバイルファーストのアプローチを採用する