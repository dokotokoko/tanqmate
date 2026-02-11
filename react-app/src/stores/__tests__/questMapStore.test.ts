// src/stores/__tests__/questMapStore.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { 
  mockQuest, 
  mockNodes, 
  mockEdges, 
  mockQuestGraph,
  mockAPI 
} from '@/test/utils'

// API関数をモック
vi.mock('@/api/questMap', () => mockAPI)

// Zustand store をダイナミックインポートでテスト
const importQuestMapStore = async () => {
  const module = await import('@/stores/questMapStore')
  return module.useQuestMapStore
}

describe('questMapStore', () => {
  let useQuestMapStore: any

  beforeEach(async () => {
    useQuestMapStore = await importQuestMapStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // ストアをリセット
    act(() => {
      useQuestMapStore.getState().reset()
    })
  })

  describe('初期状態', () => {
    it('適切な初期値を持つ', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      expect(result.current.currentQuest).toBeNull()
      expect(result.current.nodes).toEqual([])
      expect(result.current.edges).toEqual([])
      expect(result.current.selectedNode).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('クエスト操作', () => {
    it('クエスト作成が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      await act(async () => {
        await result.current.createQuest({
          goal: "プログラミングスキルを身につける",
          initial_context: "現在Python基礎を学習中"
        })
      })

      expect(mockAPI.createQuest).toHaveBeenCalledWith({
        goal: "プログラミングスキルを身につける",
        initial_context: "現在Python基礎を学習中"
      })
      expect(result.current.currentQuest).toEqual(mockQuest)
      expect(result.current.error).toBeNull()
    })

    it('クエスト作成時のエラーハンドリング', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      mockAPI.createQuest.mockRejectedValueOnce(new Error('API Error'))

      await act(async () => {
        await result.current.createQuest({
          goal: "テストクエスト"
        })
      })

      expect(result.current.error).toBe('API Error')
      expect(result.current.currentQuest).toBeNull()
    })

    it('クエスト更新が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      // 初期クエストを設定
      act(() => {
        result.current.setCurrentQuest(mockQuest)
      })

      const updateData = { current_status: "completed" }
      
      await act(async () => {
        await result.current.updateQuest(mockQuest.id, updateData)
      })

      expect(mockAPI.updateQuest).toHaveBeenCalledWith(mockQuest.id, updateData)
    })

    it('クエスト削除が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.setCurrentQuest(mockQuest)
      })

      await act(async () => {
        await result.current.deleteQuest(mockQuest.id)
      })

      expect(mockAPI.deleteQuest).toHaveBeenCalledWith(mockQuest.id)
      expect(result.current.currentQuest).toBeNull()
    })
  })

  describe('グラフデータ読み込み', () => {
    it('クエストグラフが正しく読み込まれる', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      await act(async () => {
        await result.current.loadQuestGraph(mockQuest.id)
      })

      expect(mockAPI.getQuestGraph).toHaveBeenCalledWith(mockQuest.id)
      expect(result.current.currentQuest).toEqual(mockQuestGraph.quest)
      expect(result.current.nodes).toEqual(mockQuestGraph.nodes)
      expect(result.current.edges).toEqual(mockQuestGraph.edges)
    })

    it('グラフ読み込み時のローディング状態', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      // ローディング状態をテスト
      const loadPromise = act(async () => {
        return result.current.loadQuestGraph(mockQuest.id)
      })

      expect(result.current.isLoading).toBe(true)
      
      await loadPromise
      
      expect(result.current.isLoading).toBe(false)
    })

    it('グラフ読み込みエラーのハンドリング', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      mockAPI.getQuestGraph.mockRejectedValueOnce(new Error('Network Error'))

      await act(async () => {
        await result.current.loadQuestGraph(mockQuest.id)
      })

      expect(result.current.error).toBe('Network Error')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('ノード操作', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useQuestMapStore())
      act(() => {
        result.current.setCurrentQuest(mockQuest)
        result.current.setNodes(mockNodes)
      })
    })

    it('ノード追加が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      const newNode = {
        id: 999,
        quest_id: mockQuest.id,
        type: "action",
        title: "新しいノード",
        description: "テスト用ノード",
        category: "test",
        status: "pending",
        position: { x: 300, y: 300 },
        parent_id: null,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      act(() => {
        result.current.addNode(newNode)
      })

      expect(result.current.nodes).toHaveLength(mockNodes.length + 1)
      expect(result.current.nodes.find(n => n.id === 999)).toEqual(newNode)
    })

    it('ノード更新が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      const updatedNode = {
        ...mockNodes[0],
        title: "更新されたタイトル",
        status: "completed"
      }

      act(() => {
        result.current.updateNode(updatedNode)
      })

      const node = result.current.nodes.find(n => n.id === mockNodes[0].id)
      expect(node?.title).toBe("更新されたタイトル")
      expect(node?.status).toBe("completed")
    })

    it('ノード削除が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.deleteNode(mockNodes[0].id)
      })

      expect(result.current.nodes).toHaveLength(mockNodes.length - 1)
      expect(result.current.nodes.find(n => n.id === mockNodes[0].id)).toBeUndefined()
    })

    it('ノード選択が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.selectNode(mockNodes[0])
      })

      expect(result.current.selectedNode).toEqual(mockNodes[0])
    })

    it('ノード選択解除が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.selectNode(mockNodes[0])
        result.current.clearSelection()
      })

      expect(result.current.selectedNode).toBeNull()
    })

    it('ノード完了が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      await act(async () => {
        await result.current.completeNode(mockNodes[0].id, {
          feedback: "完了しました",
          rating: 5
        })
      })

      expect(mockAPI.completeNode).toHaveBeenCalledWith(mockNodes[0].id, {
        feedback: "完了しました",
        rating: 5
      })
    })
  })

  describe('エッジ操作', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useQuestMapStore())
      act(() => {
        result.current.setCurrentQuest(mockQuest)
        result.current.setNodes(mockNodes)
        result.current.setEdges(mockEdges)
      })
    })

    it('エッジ追加が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      const newEdge = {
        id: 999,
        quest_id: mockQuest.id,
        source_id: mockNodes[0].id,
        target_id: mockNodes[1].id,
        type: "dependency",
        weight: 1,
        metadata: {},
        created_at: new Date().toISOString()
      }

      act(() => {
        result.current.addEdge(newEdge)
      })

      expect(result.current.edges).toHaveLength(mockEdges.length + 1)
      expect(result.current.edges.find(e => e.id === 999)).toEqual(newEdge)
    })

    it('エッジ更新が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      const updatedEdge = {
        ...mockEdges[0],
        type: "dependency",
        weight: 5
      }

      act(() => {
        result.current.updateEdge(updatedEdge)
      })

      const edge = result.current.edges.find(e => e.id === mockEdges[0].id)
      expect(edge?.type).toBe("dependency")
      expect(edge?.weight).toBe(5)
    })

    it('エッジ削除が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.deleteEdge(mockEdges[0].id)
      })

      expect(result.current.edges).toHaveLength(mockEdges.length - 1)
      expect(result.current.edges.find(e => e.id === mockEdges[0].id)).toBeUndefined()
    })
  })

  describe('AI機能', () => {
    it('ノード生成が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      await act(async () => {
        await result.current.generateNodes({
          quest_id: mockQuest.id,
          context: "プログラミング学習",
          node_count: 5
        })
      })

      expect(mockAPI.generateNodes).toHaveBeenCalledWith({
        quest_id: mockQuest.id,
        context: "プログラミング学習",
        node_count: 5
      })
    })

    it('ノード分解が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      await act(async () => {
        await result.current.breakdownNode({
          node_id: mockNodes[0].id,
          detail_level: 3,
          context: "初心者向け"
        })
      })

      expect(mockAPI.breakdownNode).toHaveBeenCalledWith({
        node_id: mockNodes[0].id,
        detail_level: 3,
        context: "初心者向け"
      })
    })

    it('ノード拡散が正しく動作する', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      await act(async () => {
        await result.current.expandNode({
          node_id: mockNodes[0].id,
          alternative_count: 3,
          context: "代替手法"
        })
      })

      expect(mockAPI.expandNode).toHaveBeenCalledWith({
        node_id: mockNodes[0].id,
        alternative_count: 3,
        context: "代替手法"
      })
    })
  })

  describe('ユーティリティ機能', () => {
    it('ローディング状態の設定が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('エラー状態の設定が正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.setError("テストエラー")
      })

      expect(result.current.error).toBe("テストエラー")
    })

    it('エラーのクリアが正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.setError("テストエラー")
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('ストアのリセットが正しく動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      // データを設定
      act(() => {
        result.current.setCurrentQuest(mockQuest)
        result.current.setNodes(mockNodes)
        result.current.setEdges(mockEdges)
        result.current.selectNode(mockNodes[0])
        result.current.setError("エラー")
      })

      // リセット実行
      act(() => {
        result.current.reset()
      })

      // 初期状態に戻っていることを確認
      expect(result.current.currentQuest).toBeNull()
      expect(result.current.nodes).toEqual([])
      expect(result.current.edges).toEqual([])
      expect(result.current.selectedNode).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('パフォーマンス', () => {
    it('大量のノードでも適切に動作する', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockNodes[0],
        id: i + 1,
        title: `Node ${i + 1}`,
      }))

      const start = performance.now()
      
      act(() => {
        result.current.setNodes(largeNodeSet)
      })

      const end = performance.now()

      expect(result.current.nodes).toHaveLength(1000)
      expect(end - start).toBeLessThan(100) // 100ms以内
    })

    it('頻繁な更新でもパフォーマンス問題が発生しない', () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.setNodes(mockNodes)
      })

      const start = performance.now()
      
      // 100回連続でノード更新
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateNode({
            ...mockNodes[0],
            title: `Updated ${i}`,
          })
        }
      })

      const end = performance.now()

      expect(end - start).toBeLessThan(50) // 50ms以内
      expect(result.current.nodes[0].title).toBe("Updated 99")
    })
  })

  describe('並行処理', () => {
    it('複数の非同期操作が適切に処理される', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      const promises = [
        result.current.createQuest({ goal: "クエスト1" }),
        result.current.generateNodes({ quest_id: 1, node_count: 3 }),
        result.current.loadQuestGraph(1)
      ]

      await act(async () => {
        await Promise.all(promises)
      })

      // エラーが発生せず、最終的に一貫した状態になることを確認
      expect(result.current.error).toBeNull()
    })

    it('並行更新時の競合状態が適切に処理される', async () => {
      const { result } = renderHook(() => useQuestMapStore())
      
      act(() => {
        result.current.setNodes(mockNodes)
      })

      // 同じノードに対する並行更新
      await act(async () => {
        await Promise.all([
          result.current.updateNode({ ...mockNodes[0], title: "Title 1" }),
          result.current.updateNode({ ...mockNodes[0], title: "Title 2" }),
          result.current.updateNode({ ...mockNodes[0], title: "Title 3" }),
        ])
      })

      // 最後の更新が適用されることを確認
      const node = result.current.nodes.find(n => n.id === mockNodes[0].id)
      expect(node?.title).toBeDefined()
    })
  })
})