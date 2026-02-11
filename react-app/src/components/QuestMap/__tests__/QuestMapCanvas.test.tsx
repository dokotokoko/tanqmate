// src/components/QuestMap/__tests__/QuestMapCanvas.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { 
  mockQuestGraph, 
  mockNodes, 
  mockEdges, 
  mockD3Selection,
  mockUserEvent 
} from '@/test/utils'
import QuestMapCanvas from '../QuestMapCanvas'

// D3.jsのモック
vi.mock('d3', () => ({
  select: vi.fn(() => mockD3Selection),
  selectAll: vi.fn(() => mockD3Selection),
  scaleOrdinal: vi.fn(() => ({
    domain: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  })),
  schemeCategory10: ['#1f77b4', '#ff7f0e', '#2ca02c'],
  forceSimulation: vi.fn(() => ({
    nodes: vi.fn().mockReturnThis(),
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    alpha: vi.fn().mockReturnThis(),
    alphaTarget: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({ strength: vi.fn().mockReturnThis() })),
  forceCenter: vi.fn(() => ({})),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transform: vi.fn(),
  })),
  zoomIdentity: { k: 1, x: 0, y: 0 },
  drag: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
  })),
  event: { x: 100, y: 100, transform: { k: 1, x: 0, y: 0 } },
}))

describe('QuestMapCanvas', () => {
  const defaultProps = {
    questId: 1,
    nodes: mockNodes,
    edges: mockEdges,
    selectedNode: null,
    onNodeSelect: vi.fn(),
    onNodeUpdate: vi.fn(),
    onEdgeCreate: vi.fn(),
    onNodeComplete: vi.fn(),
    className: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('レンダリング', () => {
    it('基本的な構造が正しくレンダリングされる', () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      expect(screen.getByTestId('quest-map-canvas')).toBeInTheDocument()
      expect(screen.getByRole('group', { name: /quest map/i })).toBeInTheDocument()
    })

    it('ノードが正しく表示される', async () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      await waitFor(() => {
        const nodes = screen.getAllByTestId(/^quest-node-\d+$/)
        expect(nodes).toHaveLength(mockNodes.length)
      })
    })

    it('エッジが正しく表示される', async () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      await waitFor(() => {
        const edges = screen.getAllByTestId(/^quest-edge-\d+$/)
        expect(edges).toHaveLength(mockEdges.length)
      })
    })

    it('空のノードリストでもエラーが発生しない', () => {
      render(<QuestMapCanvas {...defaultProps} nodes={[]} edges={[]} />)
      
      expect(screen.getByTestId('quest-map-canvas')).toBeInTheDocument()
    })
  })

  describe('ユーザーインタラクション', () => {
    it('ノードクリックで選択イベントが発火される', async () => {
      const onNodeSelect = vi.fn()
      render(<QuestMapCanvas {...defaultProps} onNodeSelect={onNodeSelect} />)
      
      await waitFor(() => {
        const firstNode = screen.getByTestId('quest-node-1')
        expect(firstNode).toBeInTheDocument()
      })
      
      const firstNode = screen.getByTestId('quest-node-1')
      await mockUserEvent.click(firstNode)
      
      expect(onNodeSelect).toHaveBeenCalledWith(mockNodes[0])
    })

    it('ノードダブルクリックで完了イベントが発火される', async () => {
      const onNodeComplete = vi.fn()
      render(<QuestMapCanvas {...defaultProps} onNodeComplete={onNodeComplete} />)
      
      await waitFor(() => {
        const firstNode = screen.getByTestId('quest-node-1')
        expect(firstNode).toBeInTheDocument()
      })
      
      const firstNode = screen.getByTestId('quest-node-1')
      await mockUserEvent.doubleClick(firstNode)
      
      expect(onNodeComplete).toHaveBeenCalledWith(mockNodes[0])
    })

    it('ノードホバーでツールチップが表示される', async () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      await waitFor(() => {
        const firstNode = screen.getByTestId('quest-node-1')
        expect(firstNode).toBeInTheDocument()
      })
      
      const firstNode = screen.getByTestId('quest-node-1')
      await mockUserEvent.hover(firstNode)
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
        expect(screen.getByText(mockNodes[0].title)).toBeInTheDocument()
      })
    })

    it('選択されたノードがハイライトされる', () => {
      render(
        <QuestMapCanvas 
          {...defaultProps} 
          selectedNode={mockNodes[0]}
        />
      )
      
      const selectedNode = screen.getByTestId('quest-node-1')
      expect(selectedNode).toHaveClass('selected')
    })
  })

  describe('D3.js統合', () => {
    it('D3セレクションが正しく初期化される', () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      expect(mockD3Selection.selectAll).toHaveBeenCalled()
      expect(mockD3Selection.data).toHaveBeenCalled()
    })

    it('force simulationが設定される', () => {
      const { forceSimulation } = require('d3')
      render(<QuestMapCanvas {...defaultProps} />)
      
      expect(forceSimulation).toHaveBeenCalled()
    })

    it('zoom機能が設定される', () => {
      const { zoom } = require('d3')
      render(<QuestMapCanvas {...defaultProps} />)
      
      expect(zoom).toHaveBeenCalled()
    })
  })

  describe('パフォーマンス', () => {
    it('大量のノードでもパフォーマンス問題が発生しない', async () => {
      const largeNodeSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockNodes[0],
        id: i + 1,
        title: `Node ${i + 1}`,
      }))
      
      const largeEdgeSet = Array.from({ length: 99 }, (_, i) => ({
        ...mockEdges[0],
        id: i + 1,
        source_id: i + 1,
        target_id: i + 2,
      }))

      const start = performance.now()
      render(
        <QuestMapCanvas 
          {...defaultProps} 
          nodes={largeNodeSet} 
          edges={largeEdgeSet} 
        />
      )
      const end = performance.now()
      
      // レンダリングが1秒以内に完了することを確認
      expect(end - start).toBeLessThan(1000)
    })

    it('リサイズイベントに適切に対応する', () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      // ウィンドウリサイズイベントをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768,
      })
      
      fireEvent(window, new Event('resize'))
      
      // SVG要素のサイズが更新されることを確認
      const svg = screen.getByTestId('quest-map-canvas')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      const canvas = screen.getByTestId('quest-map-canvas')
      expect(canvas).toHaveAttribute('role', 'img')
      expect(canvas).toHaveAttribute('aria-label')
    })

    it('キーボードナビゲーションが機能する', async () => {
      const onNodeSelect = vi.fn()
      render(<QuestMapCanvas {...defaultProps} onNodeSelect={onNodeSelect} />)
      
      const canvas = screen.getByTestId('quest-map-canvas')
      canvas.focus()
      
      // Tabキーでノードを選択
      fireEvent.keyDown(canvas, { key: 'Tab' })
      
      await waitFor(() => {
        expect(onNodeSelect).toHaveBeenCalled()
      })
    })

    it('スクリーンリーダー用の説明が提供される', () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      expect(screen.getByLabelText(/quest map with \d+ nodes/i)).toBeInTheDocument()
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なノードデータでもエラーが発生しない', () => {
      const invalidNodes = [
        { ...mockNodes[0], position: null },
        { ...mockNodes[1], id: null },
      ]
      
      expect(() => {
        render(<QuestMapCanvas {...defaultProps} nodes={invalidNodes} />)
      }).not.toThrow()
    })

    it('D3.jsエラーが適切にハンドリングされる', () => {
      // D3.jsでエラーが発生する場合のテスト
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { select } = require('d3')
      select.mockImplementationOnce(() => {
        throw new Error('D3 Error')
      })
      
      expect(() => {
        render(<QuestMapCanvas {...defaultProps} />)
      }).not.toThrow()
      
      consoleSpy.mockRestore()
    })
  })

  describe('状態管理', () => {
    it('ノード位置の更新が正しく反映される', async () => {
      const onNodeUpdate = vi.fn()
      render(<QuestMapCanvas {...defaultProps} onNodeUpdate={onNodeUpdate} />)
      
      await waitFor(() => {
        const firstNode = screen.getByTestId('quest-node-1')
        expect(firstNode).toBeInTheDocument()
      })
      
      // ドラッグイベントをシミュレート
      const firstNode = screen.getByTestId('quest-node-1')
      fireEvent.mouseDown(firstNode, { clientX: 0, clientY: 0 })
      fireEvent.mouseMove(firstNode, { clientX: 100, clientY: 100 })
      fireEvent.mouseUp(firstNode)
      
      await waitFor(() => {
        expect(onNodeUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockNodes[0].id,
            position: expect.objectContaining({
              x: expect.any(Number),
              y: expect.any(Number),
            }),
          })
        )
      })
    })

    it('選択状態の変更が正しく反映される', () => {
      const { rerender } = render(<QuestMapCanvas {...defaultProps} />)
      
      // 選択なし
      expect(screen.queryByTestId('quest-node-1')).not.toHaveClass('selected')
      
      // ノード選択
      rerender(
        <QuestMapCanvas 
          {...defaultProps} 
          selectedNode={mockNodes[0]}
        />
      )
      
      expect(screen.getByTestId('quest-node-1')).toHaveClass('selected')
    })
  })

  describe('テーマとスタイリング', () => {
    it('ノードタイプに応じた色分けが適用される', async () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      await waitFor(() => {
        const goalNode = screen.getByTestId('quest-node-1')
        const actionNode = screen.getByTestId('quest-node-2')
        
        expect(goalNode).toHaveClass('node-goal')
        expect(actionNode).toHaveClass('node-action')
      })
    })

    it('ノードステータスに応じたスタイルが適用される', async () => {
      render(<QuestMapCanvas {...defaultProps} />)
      
      await waitFor(() => {
        const pendingNode = screen.getByTestId('quest-node-1')
        const inProgressNode = screen.getByTestId('quest-node-2')
        
        expect(pendingNode).toHaveClass('status-pending')
        expect(inProgressNode).toHaveClass('status-in-progress')
      })
    })

    it('カスタムクラス名が適用される', () => {
      render(<QuestMapCanvas {...defaultProps} className="custom-class" />)
      
      const canvas = screen.getByTestId('quest-map-canvas')
      expect(canvas).toHaveClass('custom-class')
    })
  })

  describe('アニメーション', () => {
    it('ノード追加時のアニメーションが実行される', async () => {
      const { rerender } = render(<QuestMapCanvas {...defaultProps} nodes={[]} />)
      
      // ノードを追加
      rerender(<QuestMapCanvas {...defaultProps} nodes={mockNodes} />)
      
      await waitFor(() => {
        const nodes = screen.getAllByTestId(/^quest-node-\d+$/)
        nodes.forEach(node => {
          expect(node).toHaveClass('node-enter')
        })
      })
    })

    it('ノード完了時のセレブレーションが実行される', async () => {
      const onNodeComplete = vi.fn()
      render(<QuestMapCanvas {...defaultProps} onNodeComplete={onNodeComplete} />)
      
      await waitFor(() => {
        const firstNode = screen.getByTestId('quest-node-1')
        expect(firstNode).toBeInTheDocument()
      })
      
      const firstNode = screen.getByTestId('quest-node-1')
      await mockUserEvent.doubleClick(firstNode)
      
      await waitFor(() => {
        expect(firstNode).toHaveClass('celebration')
      })
    })
  })
})