// src/components/QuestMap/QuestMapOptimized.tsx - パフォーマンス最適化されたQuestMap
import React, { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { Box, CircularProgress, Alert } from '@mui/material'
import { FixedSizeList as List } from 'react-window'
import { areEqual } from 'react-window'
import { debounce, throttle } from 'lodash'

import { QuestNode, QuestEdge, Quest } from '../../types/questMap'
import { useQuestMapStore } from '../../stores/questMapStore'
import QuestMapNode from './QuestMapNode'

// 最適化されたノードコンポーネント
const OptimizedQuestMapNode = memo<{
  node: QuestNode
  isSelected: boolean
  onSelect: (node: QuestNode) => void
  onUpdate: (node: QuestNode) => void
  onComplete: (node: QuestNode) => void
  scale: number
  position: { x: number; y: number }
}>(({
  node,
  isSelected,
  onSelect,
  onUpdate,
  onComplete,
  scale,
  position
}) => {
  return (
    <QuestMapNode
      node={node}
      isSelected={isSelected}
      onSelect={onSelect}
      onUpdate={onUpdate}
      onComplete={onComplete}
      scale={scale}
      position={position}
    />
  )
}, (prevProps, nextProps) => {
  // カスタム比較関数でより細かい制御
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.node.title === nextProps.node.title &&
    prevProps.node.status === nextProps.node.status &&
    prevProps.node.position.x === nextProps.node.position.x &&
    prevProps.node.position.y === nextProps.node.position.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.scale === nextProps.scale
  )
})

OptimizedQuestMapNode.displayName = 'OptimizedQuestMapNode'

// 仮想スクロール用のノードアイテム
interface NodeItemProps {
  index: number
  style: React.CSSProperties
  data: {
    visibleNodes: QuestNode[]
    selectedNode: QuestNode | null
    onNodeSelect: (node: QuestNode) => void
    onNodeUpdate: (node: QuestNode) => void
    onNodeComplete: (node: QuestNode) => void
    scale: number
  }
}

const NodeItem = memo<NodeItemProps>(({ index, style, data }) => {
  const {
    visibleNodes,
    selectedNode,
    onNodeSelect,
    onNodeUpdate,
    onNodeComplete,
    scale
  } = data
  
  const node = visibleNodes[index]
  if (!node) return null

  return (
    <div style={style}>
      <OptimizedQuestMapNode
        node={node}
        isSelected={selectedNode?.id === node.id}
        onSelect={onNodeSelect}
        onUpdate={onNodeUpdate}
        onComplete={onNodeComplete}
        scale={scale}
        position={node.position}
      />
    </div>
  )
}, areEqual)

NodeItem.displayName = 'NodeItem'

// エッジ描画最適化コンポーネント
const OptimizedEdges = memo<{
  edges: QuestEdge[]
  nodes: QuestNode[]
  scale: number
}>(({ edges, nodes, scale }) => {
  // ノード位置のマップを事前計算
  const nodePositions = useMemo(() => {
    const positions = new Map<number, { x: number; y: number }>()
    nodes.forEach(node => {
      positions.set(node.id, node.position)
    })
    return positions
  }, [nodes])

  // 表示可能なエッジのみをフィルタリング
  const visibleEdges = useMemo(() => {
    return edges.filter(edge => {
      const sourcePos = nodePositions.get(edge.source_id)
      const targetPos = nodePositions.get(edge.target_id)
      return sourcePos && targetPos
    })
  }, [edges, nodePositions])

  // SVGパスを事前計算
  const edgePaths = useMemo(() => {
    return visibleEdges.map(edge => {
      const sourcePos = nodePositions.get(edge.source_id)!
      const targetPos = nodePositions.get(edge.target_id)!
      
      // ベジェ曲線でスムーズなエッジを描画
      const controlPointOffset = 50 * scale
      const path = `M ${sourcePos.x} ${sourcePos.y} 
        C ${sourcePos.x + controlPointOffset} ${sourcePos.y}, 
          ${targetPos.x - controlPointOffset} ${targetPos.y}, 
          ${targetPos.x} ${targetPos.y}`
      
      return {
        edge,
        path,
        strokeWidth: (edge.weight || 1) * scale
      }
    })
  }, [visibleEdges, nodePositions, scale])

  return (
    <g data-testid="optimized-edges">
      {edgePaths.map(({ edge, path, strokeWidth }) => (
        <path
          key={edge.id}
          d={path}
          stroke="#666"
          strokeWidth={strokeWidth}
          fill="none"
          data-testid={`quest-edge-${edge.id}`}
          className={`edge edge-${edge.type}`}
        />
      ))}
    </g>
  )
})

OptimizedEdges.displayName = 'OptimizedEdges'

// ビューポート計算フック
const useViewport = (containerRef: React.RefObject<HTMLDivElement>) => {
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scale: 1
  })

  const updateViewport = useCallback(
    throttle(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setViewport(prev => ({
          ...prev,
          width: rect.width,
          height: rect.height
        }))
      }
    }, 100),
    [containerRef]
  )

  useEffect(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [updateViewport])

  return viewport
}

// 表示可能ノードのフィルタリングフック
const useVisibleNodes = (
  nodes: QuestNode[],
  viewport: { x: number; y: number; width: number; height: number; scale: number }
) => {
  return useMemo(() => {
    const margin = 100 // 余裕を持たせるマージン
    const visibleArea = {
      left: viewport.x - margin,
      right: viewport.x + viewport.width + margin,
      top: viewport.y - margin,
      bottom: viewport.y + viewport.height + margin
    }

    return nodes.filter(node => {
      const { x, y } = node.position
      return (
        x >= visibleArea.left &&
        x <= visibleArea.right &&
        y >= visibleArea.top &&
        y <= visibleArea.bottom
      )
    })
  }, [nodes, viewport])
}

// メインコンポーネント
interface QuestMapOptimizedProps {
  questId: number
  className?: string
  enableVirtualization?: boolean
  maxRenderNodes?: number
}

export const QuestMapOptimized: React.FC<QuestMapOptimizedProps> = memo(({
  questId,
  className,
  enableVirtualization = true,
  maxRenderNodes = 1000
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  
  // Zustand store
  const {
    nodes,
    edges,
    selectedNode,
    isLoading,
    error,
    selectNode,
    updateNode,
    completeNode,
    loadQuestGraph
  } = useQuestMapStore()

  // ビューポート計算
  const viewport = useViewport(containerRef)
  
  // 表示可能ノードの計算
  const visibleNodes = useVisibleNodes(nodes, viewport)
  
  // パフォーマンス監視
  const [renderTime, setRenderTime] = useState(0)
  const [nodeCount, setNodeCount] = useState(0)

  // コールバック最適化
  const handleNodeSelect = useCallback((node: QuestNode) => {
    selectNode(node)
  }, [selectNode])

  const handleNodeUpdate = useCallback(
    debounce((node: QuestNode) => {
      updateNode(node)
    }, 300),
    [updateNode]
  )

  const handleNodeComplete = useCallback((node: QuestNode) => {
    completeNode(node.id, {
      feedback: `${node.title}が完了されました`,
      rating: 5
    })
  }, [completeNode])

  // ズーム操作
  const handleZoom = useCallback(
    throttle((delta: number) => {
      setScale(prev => Math.max(0.1, Math.min(5, prev + delta * 0.1)))
    }, 50),
    []
  )

  // 初期データ読み込み
  useEffect(() => {
    if (questId) {
      loadQuestGraph(questId)
    }
  }, [questId, loadQuestGraph])

  // パフォーマンス測定
  useEffect(() => {
    const start = performance.now()
    setNodeCount(visibleNodes.length)
    const end = performance.now()
    setRenderTime(end - start)
  }, [visibleNodes])

  // メモ化された仮想化データ
  const virtualizedData = useMemo(() => ({
    visibleNodes: visibleNodes.slice(0, maxRenderNodes),
    selectedNode,
    onNodeSelect: handleNodeSelect,
    onNodeUpdate: handleNodeUpdate,
    onNodeComplete: handleNodeComplete,
    scale
  }), [
    visibleNodes,
    maxRenderNodes,
    selectedNode,
    handleNodeSelect,
    handleNodeUpdate,
    handleNodeComplete,
    scale
  ])

  // レンダリング
  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="400px"
        data-testid="quest-map-loading"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        data-testid="quest-map-error"
        sx={{ margin: 2 }}
      >
        エラーが発生しました: {error}
      </Alert>
    )
  }

  return (
    <Box
      ref={containerRef}
      className={`quest-map-optimized ${className || ''}`}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#f5f5f5'
      }}
      data-testid="quest-map-optimized"
      onWheel={(e) => {
        e.preventDefault()
        handleZoom(e.deltaY > 0 ? -1 : 1)
      }}
    >
      {/* パフォーマンス情報 */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          position="absolute"
          top={10}
          right={10}
          bgcolor="rgba(0,0,0,0.7)"
          color="white"
          p={1}
          borderRadius={1}
          fontSize="12px"
          zIndex={1000}
        >
          <div>Render Time: {renderTime.toFixed(2)}ms</div>
          <div>Visible Nodes: {nodeCount}/{nodes.length}</div>
          <div>Scale: {scale.toFixed(2)}</div>
        </Box>
      )}

      {/* SVGキャンバス */}
      <svg
        width="100%"
        height="100%"
        data-testid="quest-map-svg"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1
        }}
      >
        <OptimizedEdges
          edges={edges}
          nodes={nodes}
          scale={scale}
        />
      </svg>

      {/* ノードレイヤー */}
      <Box
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        zIndex={2}
      >
        {enableVirtualization && visibleNodes.length > 50 ? (
          // 仮想スクロール使用
          <List
            height={viewport.height}
            itemCount={Math.min(visibleNodes.length, maxRenderNodes)}
            itemSize={100}
            itemData={virtualizedData}
            width={viewport.width}
          >
            {NodeItem}
          </List>
        ) : (
          // 通常レンダリング
          <>
            {visibleNodes.slice(0, maxRenderNodes).map(node => (
              <OptimizedQuestMapNode
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                onSelect={handleNodeSelect}
                onUpdate={handleNodeUpdate}
                onComplete={handleNodeComplete}
                scale={scale}
                position={node.position}
              />
            ))}
          </>
        )}
      </Box>

      {/* コントロール */}
      <Box
        position="absolute"
        bottom={20}
        right={20}
        display="flex"
        gap={1}
        zIndex={1000}
      >
        <button
          onClick={() => handleZoom(1)}
          data-testid="zoom-in"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(-1)}
          data-testid="zoom-out"
        >
          -
        </button>
        <button
          onClick={() => setScale(1)}
          data-testid="reset-zoom"
        >
          Reset
        </button>
      </Box>
    </Box>
  )
})

QuestMapOptimized.displayName = 'QuestMapOptimized'

export default QuestMapOptimized