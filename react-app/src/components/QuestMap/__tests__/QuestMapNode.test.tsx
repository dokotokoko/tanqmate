// src/components/QuestMap/__tests__/QuestMapNode.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { mockNodes, mockUserEvent } from '@/test/utils'
import QuestMapNode from '../QuestMapNode'

describe('QuestMapNode', () => {
  const defaultProps = {
    node: mockNodes[0],
    isSelected: false,
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
    onComplete: vi.fn(),
    onMenuOpen: vi.fn(),
    scale: 1,
    position: { x: 100, y: 100 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('レンダリング', () => {
    it('ノードが正しくレンダリングされる', () => {
      render(<QuestMapNode {...defaultProps} />)
      
      expect(screen.getByTestId(`quest-node-${mockNodes[0].id}`)).toBeInTheDocument()
      expect(screen.getByText(mockNodes[0].title)).toBeInTheDocument()
    })

    it('ノードタイプに応じたクラスが適用される', () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveClass(`node-${mockNodes[0].type}`)
    })

    it('ノードステータスに応じたクラスが適用される', () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveClass(`status-${mockNodes[0].status}`)
    })

    it('選択状態のクラスが適用される', () => {
      render(<QuestMapNode {...defaultProps} isSelected={true} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveClass('selected')
    })

    it('ノードの位置が正しく設定される', () => {
      render(<QuestMapNode {...defaultProps} position={{ x: 200, y: 300 }} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveStyle({
        transform: 'translate(200px, 300px)'
      })
    })

    it('スケールが正しく適用される', () => {
      render(<QuestMapNode {...defaultProps} scale={1.5} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveStyle({
        transform: expect.stringContaining('scale(1.5)')
      })
    })
  })

  describe('ユーザーインタラクション', () => {
    it('クリックで選択イベントが発火される', async () => {
      const onSelect = vi.fn()
      render(<QuestMapNode {...defaultProps} onSelect={onSelect} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      await mockUserEvent.click(nodeElement)
      
      expect(onSelect).toHaveBeenCalledWith(mockNodes[0])
    })

    it('ダブルクリックで完了イベントが発火される', async () => {
      const onComplete = vi.fn()
      render(<QuestMapNode {...defaultProps} onComplete={onComplete} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      await mockUserEvent.doubleClick(nodeElement)
      
      expect(onComplete).toHaveBeenCalledWith(mockNodes[0])
    })

    it('右クリックでメニューが開く', async () => {
      const onMenuOpen = vi.fn()
      render(<QuestMapNode {...defaultProps} onMenuOpen={onMenuOpen} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      fireEvent.contextMenu(nodeElement)
      
      expect(onMenuOpen).toHaveBeenCalledWith(mockNodes[0], expect.any(Object))
    })

    it('ホバーでツールチップが表示される', async () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      await mockUserEvent.hover(nodeElement)
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
        expect(screen.getByText(mockNodes[0].description)).toBeInTheDocument()
      })
    })

    it('ドラッグで位置更新イベントが発火される', async () => {
      const onUpdate = vi.fn()
      render(<QuestMapNode {...defaultProps} onUpdate={onUpdate} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      
      fireEvent.mouseDown(nodeElement, { clientX: 100, clientY: 100 })
      fireEvent.mouseMove(nodeElement, { clientX: 200, clientY: 200 })
      fireEvent.mouseUp(nodeElement)
      
      expect(onUpdate).toHaveBeenCalledWith({
        ...mockNodes[0],
        position: { x: expect.any(Number), y: expect.any(Number) }
      })
    })

    it('キーボードナビゲーションが機能する', () => {
      const onSelect = vi.fn()
      render(<QuestMapNode {...defaultProps} onSelect={onSelect} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      nodeElement.focus()
      
      fireEvent.keyDown(nodeElement, { key: 'Enter' })
      expect(onSelect).toHaveBeenCalledWith(mockNodes[0])
      
      fireEvent.keyDown(nodeElement, { key: ' ' })
      expect(onSelect).toHaveBeenCalledTimes(2)
    })
  })

  describe('ノードタイプ固有の表示', () => {
    it('ゴールノードが適切に表示される', () => {
      const goalNode = { ...mockNodes[0], type: 'goal' }
      render(<QuestMapNode {...defaultProps} node={goalNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${goalNode.id}`)
      expect(nodeElement).toHaveClass('node-goal')
      expect(screen.getByTestId('goal-icon')).toBeInTheDocument()
    })

    it('アクションノードが適切に表示される', () => {
      const actionNode = { ...mockNodes[1], type: 'action' }
      render(<QuestMapNode {...defaultProps} node={actionNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${actionNode.id}`)
      expect(nodeElement).toHaveClass('node-action')
      expect(screen.getByTestId('action-icon')).toBeInTheDocument()
    })

    it('マイルストーンノードが適切に表示される', () => {
      const milestoneNode = { ...mockNodes[0], type: 'milestone' }
      render(<QuestMapNode {...defaultProps} node={milestoneNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${milestoneNode.id}`)
      expect(nodeElement).toHaveClass('node-milestone')
      expect(screen.getByTestId('milestone-icon')).toBeInTheDocument()
    })

    it('分解ノードが適切に表示される', () => {
      const breakdownNode = { ...mockNodes[0], type: 'breakdown' }
      render(<QuestMapNode {...defaultProps} node={breakdownNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${breakdownNode.id}`)
      expect(nodeElement).toHaveClass('node-breakdown')
      expect(screen.getByTestId('breakdown-icon')).toBeInTheDocument()
    })
  })

  describe('ステータス表示', () => {
    it('未開始ステータスが適切に表示される', () => {
      const pendingNode = { ...mockNodes[0], status: 'pending' }
      render(<QuestMapNode {...defaultProps} node={pendingNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${pendingNode.id}`)
      expect(nodeElement).toHaveClass('status-pending')
      expect(screen.getByTestId('pending-indicator')).toBeInTheDocument()
    })

    it('進行中ステータスが適切に表示される', () => {
      const inProgressNode = { ...mockNodes[0], status: 'in_progress' }
      render(<QuestMapNode {...defaultProps} node={inProgressNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${inProgressNode.id}`)
      expect(nodeElement).toHaveClass('status-in-progress')
      expect(screen.getByTestId('progress-indicator')).toBeInTheDocument()
    })

    it('完了ステータスが適切に表示される', () => {
      const completedNode = { ...mockNodes[0], status: 'completed' }
      render(<QuestMapNode {...defaultProps} node={completedNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${completedNode.id}`)
      expect(nodeElement).toHaveClass('status-completed')
      expect(screen.getByTestId('completed-indicator')).toBeInTheDocument()
    })

    it('ブロック中ステータスが適切に表示される', () => {
      const blockedNode = { ...mockNodes[0], status: 'blocked' }
      render(<QuestMapNode {...defaultProps} node={blockedNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${blockedNode.id}`)
      expect(nodeElement).toHaveClass('status-blocked')
      expect(screen.getByTestId('blocked-indicator')).toBeInTheDocument()
    })

    it('キャンセル済みステータスが適切に表示される', () => {
      const cancelledNode = { ...mockNodes[0], status: 'cancelled' }
      render(<QuestMapNode {...defaultProps} node={cancelledNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${cancelledNode.id}`)
      expect(nodeElement).toHaveClass('status-cancelled')
      expect(screen.getByTestId('cancelled-indicator')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定される', () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveAttribute('role', 'button')
      expect(nodeElement).toHaveAttribute('aria-label')
      expect(nodeElement).toHaveAttribute('tabIndex', '0')
    })

    it('選択状態がスクリーンリーダーに伝わる', () => {
      render(<QuestMapNode {...defaultProps} isSelected={true} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveAttribute('aria-selected', 'true')
    })

    it('ノードの説明がアクセシブルテキストに含まれる', () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveAttribute('aria-describedby')
    })

    it('フォーカス時の視覚的インジケーターが表示される', () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      nodeElement.focus()
      
      expect(nodeElement).toHaveClass('focused')
    })
  })

  describe('パフォーマンス', () => {
    it('頻繁な再レンダリングでも適切に動作する', () => {
      const { rerender } = render(<QuestMapNode {...defaultProps} />)
      
      const start = performance.now()
      
      // 100回再レンダリング
      for (let i = 0; i < 100; i++) {
        rerender(
          <QuestMapNode 
            {...defaultProps} 
            position={{ x: i, y: i }}
            scale={1 + i * 0.01}
          />
        )
      }
      
      const end = performance.now()
      
      expect(end - start).toBeLessThan(100) // 100ms以内
    })

    it('メモ化が適切に動作する', () => {
      const renderSpy = vi.fn()
      
      const TestNode = () => {
        renderSpy()
        return <QuestMapNode {...defaultProps} />
      }
      
      const { rerender } = render(<TestNode />)
      
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // プロパティが変更されない場合は再レンダリングされない
      rerender(<TestNode />)
      expect(renderSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('アニメーション', () => {
    it('マウントアニメーションが実行される', async () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      
      await waitFor(() => {
        expect(nodeElement).toHaveClass('node-enter')
      })
    })

    it('ステータス変更アニメーションが実行される', async () => {
      const { rerender } = render(<QuestMapNode {...defaultProps} />)
      
      const completedNode = { ...mockNodes[0], status: 'completed' }
      rerender(<QuestMapNode {...defaultProps} node={completedNode} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${completedNode.id}`)
      
      await waitFor(() => {
        expect(nodeElement).toHaveClass('status-change')
      })
    })

    it('ホバーアニメーションが実行される', async () => {
      render(<QuestMapNode {...defaultProps} />)
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      await mockUserEvent.hover(nodeElement)
      
      expect(nodeElement).toHaveClass('hovered')
    })
  })

  describe('エラーハンドリング', () => {
    it('無効なノードデータでもエラーが発生しない', () => {
      const invalidNode = {
        ...mockNodes[0],
        title: null,
        position: undefined
      }
      
      expect(() => {
        render(<QuestMapNode {...defaultProps} node={invalidNode} />)
      }).not.toThrow()
    })

    it('コールバック関数がundefinedでもエラーが発生しない', () => {
      expect(() => {
        render(
          <QuestMapNode 
            {...defaultProps} 
            onSelect={undefined}
            onUpdate={undefined}
            onComplete={undefined}
          />
        )
      }).not.toThrow()
    })

    it('位置データが無効でもエラーが発生しない', () => {
      expect(() => {
        render(
          <QuestMapNode 
            {...defaultProps} 
            position={{ x: NaN, y: NaN }}
          />
        )
      }).not.toThrow()
    })
  })

  describe('カスタマイゼーション', () => {
    it('カスタムクラス名が適用される', () => {
      render(
        <QuestMapNode 
          {...defaultProps} 
          className="custom-node-class"
        />
      )
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveClass('custom-node-class')
    })

    it('カスタムスタイルが適用される', () => {
      const customStyle = { backgroundColor: 'red', color: 'white' }
      render(
        <QuestMapNode 
          {...defaultProps} 
          style={customStyle}
        />
      )
      
      const nodeElement = screen.getByTestId(`quest-node-${mockNodes[0].id}`)
      expect(nodeElement).toHaveStyle(customStyle)
    })

    it('カスタムアイコンが表示される', () => {
      const customIcon = <div data-testid="custom-icon">Custom</div>
      render(
        <QuestMapNode 
          {...defaultProps} 
          customIcon={customIcon}
        />
      )
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })
})