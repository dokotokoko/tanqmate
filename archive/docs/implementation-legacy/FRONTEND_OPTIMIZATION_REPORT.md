# フロントエンド軽量化リファクタリング方針レポート

## 概要
Dockerコンテナのメモリ不足問題を解決するため、フロントエンドアプリケーションの現状を調査し、軽量化の方針をまとめました。

## 現状の問題点

### 1. Docker設定の問題
- **メモリ制限**: 8GB（制限）/ 4GB（予約）と高い設定値
- **NODE_OPTIONS**: `--max-old-space-size=8192`（8GB）という過大な設定
- **開発環境での負荷**: ファイル監視とホットリロードによるメモリ消費

### 2. 依存関係の肥大化

#### 重量級ライブラリ
| ライブラリ | 影響度 | 用途 | バンドルサイズへの影響 |
|-----------|--------|------|----------------------|
| @mui/material | 高 | UIコンポーネント | 40+コンポーネントで使用 |
| framer-motion | 高 | アニメーション | 40+コンポーネントで使用 |
| d3 | 中 | データ可視化 | **未使用（削除可能）** |
| chart.js | 中 | チャート | **未使用（削除可能）** |
| react-syntax-highlighter | 低 | コード表示 | **未使用（削除可能）** |

### 3. 静的アセットの問題
- **画像ファイル合計**: 約2.2MB
  - `about-tanqmates.png`: 613KB
  - `usecase3.png`: 449KB
  - `app-screenshot-main.png`: 364KB
  - その他: 約800KB
- **最適化なし**: PNG形式、圧縮なし、レスポンシブ対応なし

### 4. コンポーネントの肥大化
| コンポーネント | 行数 | 問題点 |
|---------------|------|--------|
| StepPage.tsx | 1279行 | 最大のページコンポーネント |
| DashboardSidebar.tsx | 1000行 | 27個のMUIコンポーネントを一度にインポート |
| AIChat.tsx | 952行 | 複雑なロジックと多数の依存関係 |
| HowToUseSection.tsx | 840行 | ガイドセクションの巨大化 |
| MemoChat.tsx | 831行 | チャット機能の複雑化 |

### 5. メモリ管理の問題
- **Zustandストアの永続化**: チャット履歴全体を永続化
- **重複する認証ストア**: authStore（v1）とauthStoreV2（v2）が並存
- **PWAキャッシング**: 全アセットをキャッシュ（画像含む）
- **Viteの開発設定**: ポーリングによるファイル監視

## 軽量化リファクタリング方針

### フェーズ1: 即効性のある改善（1-2日で実施可能）

#### 1.1 不要な依存関係の削除
```bash
# 削除対象パッケージ
- chart.js
- react-chartjs-2
- d3
- @types/d3
- react-syntax-highlighter
- fuse.js（使用状況要確認）
```
**効果**: バンドルサイズ約20-30%削減

#### 1.2 Docker設定の最適化
```yaml
# docker-compose.yml の修正
environment:
  - NODE_OPTIONS=--max-old-space-size=2048  # 8192 → 2048に削減
deploy:
  resources:
    limits:
      memory: 2G  # 8G → 2Gに削減
    reservations:
      memory: 1G  # 4G → 1Gに削減
```
**効果**: メモリ使用量75%削減

#### 1.3 Vite開発設定の最適化
```typescript
// vite.config.ts の修正
server: {
  watch: {
    usePolling: false,  // ポーリングを無効化
    // または環境変数で制御
    usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
  }
}
```
**効果**: 開発環境でのCPU/メモリ使用量削減

### フェーズ2: 中期的な改善（1-2週間で実施）

#### 2.1 画像最適化
- **WebP形式への変換**: 50-70%のサイズ削減
- **レスポンシブ画像の実装**: srcsetを使用
- **遅延読み込み**: Intersection Observer APIの活用
- **画像圧縮**: TinyPNGやImageOptimの使用

```tsx
// 画像コンポーネントの実装例
const OptimizedImage = ({ src, alt }) => {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img src={src} alt={alt} loading="lazy" />
    </picture>
  );
};
```
**効果**: 初期ロード時間50%短縮、メモリ使用量30%削減

#### 2.2 大規模コンポーネントの分割
```tsx
// DashboardSidebarの分割例
const DashboardSidebar = lazy(() => import('./DashboardSidebar'));
const NavigationSection = lazy(() => import('./NavigationSection'));
const UserSection = lazy(() => import('./UserSection'));
const SettingsSection = lazy(() => import('./SettingsSection'));
```
**効果**: コンポーネント単位のメモリ使用量30-40%削減

#### 2.3 MUIの動的インポート
```tsx
// 重いMUIコンポーネントの動的インポート
const DataGrid = lazy(() => import('@mui/x-data-grid').then(module => ({
  default: module.DataGrid
})));
```
**効果**: 初期バンドルサイズ20%削減

### フェーズ3: 長期的な最適化（1-2ヶ月で実施）

#### 3.1 マイクロフロントエンド化
- ガイド機能を別アプリケーションに分離
- チャット機能のモジュール化
- 管理画面の独立化

#### 3.2 軽量ライブラリへの移行検討
- **MUI → Headless UI + TailwindCSS**: 60-70%のサイズ削減
- **Framer Motion → CSS Animations**: 必要に応じて部分的移行
- **React Query → SWR**: より軽量な選択肢

#### 3.3 ビルド最適化の強化
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-mui': ['@mui/material'],
        'vendor-motion': ['framer-motion'],
        'vendor-utils': ['lodash', 'date-fns'],
      }
    }
  },
  // ツリーシェイキングの強化
  treeshake: {
    moduleSideEffects: false,
  }
}
```

## 実装優先順位と期待効果

| 優先度 | 施策 | 実装コスト | 期待効果 |
|--------|------|-----------|----------|
| 1 | 不要依存関係の削除 | 低（1日） | バンドルサイズ20-30%削減 |
| 2 | Docker設定最適化 | 低（数時間） | メモリ使用量75%削減 |
| 3 | 画像最適化 | 中（3-5日） | 初期ロード50%高速化 |
| 4 | コンポーネント分割 | 中（1週間） | メモリ使用量30-40%削減 |
| 5 | MUI動的インポート | 中（3-5日） | 初期バンドル20%削減 |

## 監視とメトリクス

### 導入推奨ツール
1. **webpack-bundle-analyzer**: バンドルサイズの可視化
2. **React DevTools Profiler**: コンポーネントのレンダリング性能
3. **Chrome DevTools Memory Profiler**: メモリリークの検出
4. **Docker stats**: コンテナのリソース使用状況

### 成功指標
- **初期ロード時間**: 現在の50%以下（目標: 2秒以下）
- **メモリ使用量**: 2GB以下（現在の25%）
- **バンドルサイズ**: 1MB以下（gzip圧縮後）
- **Time to Interactive**: 3秒以下

## まとめ

現状の調査により、以下の主要な問題が判明しました：

1. **過剰なメモリ設定**（8GB）と未使用ライブラリ
2. **最適化されていない画像アセット**（2.2MB）
3. **肥大化したコンポーネント**（最大1279行）
4. **重複する機能**（認証ストアの二重実装）

これらの問題に対して、段階的なアプローチで改善を進めることで、メモリ使用量を現在の25%程度まで削減できる見込みです。特に、即効性のある「不要な依存関係の削除」と「Docker設定の最適化」から着手することを推奨します。

## 次のステップ

1. **バックアップの作成**: 変更前の現在の状態を保存
2. **フェーズ1の実施**: 不要な依存関係の削除とDocker設定の最適化
3. **効果測定**: メモリ使用量とパフォーマンスの計測
4. **段階的な改善**: 効果を確認しながら次のフェーズへ進行

これらの改善により、Dockerコンテナのメモリ不足問題を解決し、より快適な開発環境を実現できます。