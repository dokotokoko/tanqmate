// src/components/QuestMap/QuestMapLazy.tsx - Lazy loadingとコード分割
import React, { Suspense, lazy, memo } from 'react'
import { Box, CircularProgress, Skeleton } from '@mui/material'
import { ErrorBoundary } from 'react-error-boundary'

// Lazy loaded components
const QuestMapOptimized = lazy(() => 
  import('./QuestMapOptimized').then(module => ({ 
    default: module.QuestMapOptimized 
  }))
)

const QuestMapAIChat = lazy(() => 
  import('./QuestMapAIChat')
)

const QuestMapHelp = lazy(() => 
  import('./QuestMapHelp')
)

const QuestMapSettings = lazy(() => 
  import('./QuestMapSettings')
)

const QuestMapExport = lazy(() => 
  import('./QuestMapExport')
)

// スケルトンローダー
const QuestMapSkeleton = memo(() => (
  <Box
    width="100%"
    height="600px"
    display="flex"
    flexDirection="column"
    gap={2}
    p={2}
  >
    {/* ツールバーエリア */}
    <Box display="flex" gap={1}>
      <Skeleton variant="rectangular" width={120} height={40} />
      <Skeleton variant="rectangular" width={100} height={40} />
      <Skeleton variant="rectangular" width={80} height={40} />
    </Box>
    
    {/* メインキャンバスエリア */}
    <Box position="relative" flex={1}>
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height="100%"
        sx={{ borderRadius: 2 }}
      />
      
      {/* ノードプレースホルダー */}
      <Box
        position="absolute"
        top="20%"
        left="30%"
        width={120}
        height={80}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
      
      <Box
        position="absolute"
        top="40%"
        right="25%"
        width={100}
        height={60}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
      
      <Box
        position="absolute"
        bottom="30%"
        left="20%"
        width={140}
        height={70}
      >
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </Box>
    </Box>
    
    {/* コントロールエリア */}
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Box display="flex" gap={1}>
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="circular" width={40} height={40} />
        <Skeleton variant="circular" width={40} height={40} />
      </Box>
      <Skeleton variant="rectangular" width={200} height={40} />
    </Box>
  </Box>
))

QuestMapSkeleton.displayName = 'QuestMapSkeleton'

// エラーフォールバック
const ErrorFallback = memo<{ 
  error: Error; 
  resetErrorBoundary: () => void 
}>(({ error, resetErrorBoundary }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="400px"
    gap={2}
    p={2}
    textAlign="center"
  >
    <h2>コンポーネントの読み込みに失敗しました</h2>
    <p>詳細: {error.message}</p>
    <button onClick={resetErrorBoundary}>再試行</button>
  </Box>
))

ErrorFallback.displayName = 'ErrorFallback'

// ローディングコンポーネント
const LoadingFallback = memo<{ message?: string }>(({ message = "読み込み中..." }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    gap={2}
    p={4}
  >
    <CircularProgress size={40} />
    <Box component="span" fontSize="14px" color="text.secondary">
      {message}
    </Box>
  </Box>
))

LoadingFallback.displayName = 'LoadingFallback'

// チャンクプリローダー
const preloadChunks = async () => {
  const chunks = [
    () => import('./QuestMapOptimized'),
    () => import('./QuestMapAIChat'),
    () => import('./QuestMapHelp'),
    () => import('./QuestMapSettings'),
    () => import('./QuestMapExport'),
  ]

  // 重要度の高いチャンクから順次プリロード
  const results = await Promise.allSettled(chunks.map(chunk => chunk()))
  
  return results.map((result, index) => ({
    chunk: index,
    success: result.status === 'fulfilled'
  }))
}

// メインレイジーロードコンテナ
interface QuestMapLazyProps {
  questId: number
  activeTab?: 'map' | 'chat' | 'help' | 'settings' | 'export'
  enablePreload?: boolean
  className?: string
}

export const QuestMapLazy: React.FC<QuestMapLazyProps> = memo(({
  questId,
  activeTab = 'map',
  enablePreload = true,
  className
}) => {
  // プリロード実行
  React.useEffect(() => {
    if (enablePreload) {
      // アイドル時間にプリロード実行
      const timeoutId = setTimeout(() => {
        preloadChunks().then(results => {
          console.log('Preload results:', results)
        })
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [enablePreload])

  // アクティブなタブに応じてコンポーネントを切り替え
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'map':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<QuestMapSkeleton />}>
              <QuestMapOptimized 
                questId={questId}
                enableVirtualization={true}
                maxRenderNodes={1000}
              />
            </Suspense>
          </ErrorBoundary>
        )
      
      case 'chat':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingFallback message="AIチャットを読み込み中..." />}>
              <QuestMapAIChat questId={questId} />
            </Suspense>
          </ErrorBoundary>
        )
      
      case 'help':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingFallback message="ヘルプを読み込み中..." />}>
              <QuestMapHelp />
            </Suspense>
          </ErrorBoundary>
        )
      
      case 'settings':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingFallback message="設定を読み込み中..." />}>
              <QuestMapSettings questId={questId} />
            </Suspense>
          </ErrorBoundary>
        )
      
      case 'export':
        return (
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<LoadingFallback message="エクスポート機能を読み込み中..." />}>
              <QuestMapExport questId={questId} />
            </Suspense>
          </ErrorBoundary>
        )
      
      default:
        return (
          <Box p={2}>
            <p>不明なタブ: {activeTab}</p>
          </Box>
        )
    }
  }

  return (
    <Box
      className={`quest-map-lazy ${className || ''}`}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      data-testid="quest-map-lazy"
    >
      {renderActiveComponent()}
    </Box>
  )
})

QuestMapLazy.displayName = 'QuestMapLazy'

// 高次コンポーネント: プリロード機能付き
export const withPreload = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WithPreloadComponent = (props: P) => {
    const [isPreloaded, setIsPreloaded] = React.useState(false)

    React.useEffect(() => {
      preloadChunks().then(() => {
        setIsPreloaded(true)
      })
    }, [])

    return (
      <Component 
        {...props} 
        // @ts-ignore
        isPreloaded={isPreloaded}
      />
    )
  }

  WithPreloadComponent.displayName = `withPreload(${Component.displayName || Component.name})`
  
  return WithPreloadComponent
}

// インターセクションオブザーバー付きLazy loading
export const LazyQuestMapWithIntersection: React.FC<
  QuestMapLazyProps & { threshold?: number }
> = memo(({ threshold = 0.1, ...props }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold])

  return (
    <Box ref={ref} width="100%" height="100%">
      {isVisible ? (
        <QuestMapLazy {...props} />
      ) : (
        <QuestMapSkeleton />
      )}
    </Box>
  )
})

LazyQuestMapWithIntersection.displayName = 'LazyQuestMapWithIntersection'

export default QuestMapLazy