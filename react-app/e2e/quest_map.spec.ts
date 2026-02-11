// e2e/quest_map.spec.ts - 探Qマップ機能のE2Eテスト
import { test, expect, Page, Browser, BrowserContext } from '@playwright/test'

// テストデータ
const TEST_QUEST = {
  goal: "プログラミングスキルを身につける",
  initialContext: "現在Python基礎を学習中、実践的なスキルを身につけたい"
}

const TEST_NODES = [
  {
    title: "Python基礎文法",
    description: "変数、制御文、関数の基礎を学ぶ",
    type: "action"
  },
  {
    title: "実践プロジェクト",
    description: "簡単なWebアプリケーションを作成",
    type: "action"
  },
  {
    title: "コードレビュー",
    description: "作成したコードをレビューしてもらう",
    type: "milestone"
  }
]

// ページオブジェクトモデル
class QuestMapPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/quest-map')
  }

  async createQuest(goal: string, context?: string) {
    await this.page.click('[data-testid="create-quest-button"]')
    await this.page.fill('[data-testid="quest-goal-input"]', goal)
    
    if (context) {
      await this.page.fill('[data-testid="quest-context-input"]', context)
    }
    
    await this.page.click('[data-testid="create-quest-submit"]')
  }

  async waitForQuestMapLoad() {
    await this.page.waitForSelector('[data-testid="quest-map-canvas"]', {
      state: 'visible',
      timeout: 10000
    })
  }

  async getNodes() {
    return await this.page.locator('[data-testid^="quest-node-"]').all()
  }

  async getEdges() {
    return await this.page.locator('[data-testid^="quest-edge-"]').all()
  }

  async selectNode(nodeId: string) {
    await this.page.click(`[data-testid="quest-node-${nodeId}"]`)
  }

  async doubleClickNode(nodeId: string) {
    await this.page.dblclick(`[data-testid="quest-node-${nodeId}"]`)
  }

  async rightClickNode(nodeId: string) {
    await this.page.click(`[data-testid="quest-node-${nodeId}"]`, { button: 'right' })
  }

  async dragNode(nodeId: string, fromX: number, fromY: number, toX: number, toY: number) {
    const node = this.page.locator(`[data-testid="quest-node-${nodeId}"]`)
    await node.dragTo(node, {
      sourcePosition: { x: fromX, y: fromY },
      targetPosition: { x: toX, y: toY }
    })
  }

  async generateNodes(context: string, nodeCount: number = 5) {
    await this.page.click('[data-testid="generate-nodes-button"]')
    await this.page.fill('[data-testid="generation-context-input"]', context)
    await this.page.fill('[data-testid="node-count-input"]', nodeCount.toString())
    await this.page.click('[data-testid="generate-submit"]')
  }

  async breakdownNode(nodeId: string, detailLevel: number = 3) {
    await this.selectNode(nodeId)
    await this.page.click('[data-testid="breakdown-node-button"]')
    await this.page.fill('[data-testid="detail-level-input"]', detailLevel.toString())
    await this.page.click('[data-testid="breakdown-submit"]')
  }

  async expandNode(nodeId: string, alternativeCount: number = 3) {
    await this.selectNode(nodeId)
    await this.page.click('[data-testid="expand-node-button"]')
    await this.page.fill('[data-testid="alternative-count-input"]', alternativeCount.toString())
    await this.page.click('[data-testid="expand-submit"]')
  }

  async completeNode(nodeId: string, feedback?: string, rating?: number) {
    await this.doubleClickNode(nodeId)
    
    if (feedback) {
      await this.page.fill('[data-testid="completion-feedback"]', feedback)
    }
    
    if (rating) {
      await this.page.click(`[data-testid="rating-${rating}"]`)
    }
    
    await this.page.click('[data-testid="complete-node-submit"]')
  }

  async openAIChat() {
    await this.page.click('[data-testid="ai-chat-button"]')
  }

  async sendAIMessage(message: string) {
    await this.page.fill('[data-testid="ai-chat-input"]', message)
    await this.page.click('[data-testid="ai-chat-send"]')
  }

  async waitForAIResponse() {
    await this.page.waitForSelector('[data-testid="ai-response"]', {
      state: 'visible',
      timeout: 15000
    })
  }

  async zoomIn() {
    await this.page.click('[data-testid="zoom-in-button"]')
  }

  async zoomOut() {
    await this.page.click('[data-testid="zoom-out-button"]')
  }

  async resetZoom() {
    await this.page.click('[data-testid="reset-zoom-button"]')
  }

  async toggleFullscreen() {
    await this.page.click('[data-testid="fullscreen-toggle"]')
  }

  async saveQuestMap() {
    await this.page.click('[data-testid="save-quest-map"]')
  }

  async exportQuestMap(format: 'png' | 'svg' | 'json') {
    await this.page.click('[data-testid="export-menu"]')
    await this.page.click(`[data-testid="export-${format}"]`)
  }

  async getErrorMessage() {
    return await this.page.textContent('[data-testid="error-message"]')
  }

  async getSuccessMessage() {
    return await this.page.textContent('[data-testid="success-message"]')
  }

  async getLoadingState() {
    return await this.page.locator('[data-testid="loading-indicator"]').isVisible()
  }

  async getNodeCount() {
    const nodes = await this.getNodes()
    return nodes.length
  }

  async getEdgeCount() {
    const edges = await this.getEdges()
    return edges.length
  }

  async getSelectedNode() {
    return await this.page.locator('[data-testid^="quest-node-"].selected').first()
  }
}

// テストスイート
test.describe('探Qマップ機能', () => {
  let questMapPage: QuestMapPage

  test.beforeEach(async ({ page }) => {
    questMapPage = new QuestMapPage(page)
    
    // ログイン処理（必要に応じて）
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-submit"]')
    
    // QuestMapページに移動
    await questMapPage.goto()
  })

  test.describe('クエスト作成とマップ初期化', () => {
    test('新しいクエストを作成できる', async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      
      // 成功メッセージの確認
      const successMessage = await questMapPage.getSuccessMessage()
      expect(successMessage).toContain('クエストが作成されました')
      
      // マップが正しく表示される
      await questMapPage.waitForQuestMapLoad()
      expect(await questMapPage.getNodeCount()).toBeGreaterThan(0)
    })

    test('必須フィールドなしではクエストを作成できない', async () => {
      await questMapPage.createQuest('') // 空の目標
      
      const errorMessage = await questMapPage.getErrorMessage()
      expect(errorMessage).toContain('目標は必須です')
    })

    test('初期マップに適切なノードが表示される', async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
      
      const nodeCount = await questMapPage.getNodeCount()
      expect(nodeCount).toBeGreaterThanOrEqual(1) // 最低1つ（ゴール）ノード
      
      // ゴールノードの存在確認
      const goalNode = questMapPage.page.locator('[data-testid^="quest-node-"].node-goal')
      await expect(goalNode).toBeVisible()
    })
  })

  test.describe('ノードインタラクション', () => {
    test.beforeEach(async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
    })

    test('ノードをクリックして選択できる', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      if (initialNodeCount > 0) {
        await questMapPage.selectNode('1')
        
        const selectedNode = await questMapPage.getSelectedNode()
        await expect(selectedNode).toBeVisible()
        await expect(selectedNode).toHaveClass(/selected/)
      }
    })

    test('ノードをダブルクリックで完了できる', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      if (initialNodeCount > 0) {
        await questMapPage.completeNode('1', '完了しました', 5)
        
        // ノードが完了状態に更新される
        const completedNode = questMapPage.page.locator('[data-testid="quest-node-1"].status-completed')
        await expect(completedNode).toBeVisible()
        
        const successMessage = await questMapPage.getSuccessMessage()
        expect(successMessage).toContain('ノードが完了されました')
      }
    })

    test('ノードを右クリックでメニューが表示される', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      if (initialNodeCount > 0) {
        await questMapPage.rightClickNode('1')
        
        // コンテキストメニューが表示される
        const contextMenu = questMapPage.page.locator('[data-testid="node-context-menu"]')
        await expect(contextMenu).toBeVisible()
        
        // メニューアイテムの確認
        await expect(questMapPage.page.locator('[data-testid="menu-complete"]')).toBeVisible()
        await expect(questMapPage.page.locator('[data-testid="menu-breakdown"]')).toBeVisible()
        await expect(questMapPage.page.locator('[data-testid="menu-expand"]')).toBeVisible()
      }
    })

    test('ノードをドラッグして位置を変更できる', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      if (initialNodeCount > 0) {
        // ノードの初期位置を取得
        const node = questMapPage.page.locator('[data-testid="quest-node-1"]')
        const initialBox = await node.boundingBox()
        
        // ノードをドラッグ
        await questMapPage.dragNode('1', 0, 0, 100, 100)
        
        // 位置が変更されたことを確認
        const newBox = await node.boundingBox()
        expect(newBox?.x).not.toBe(initialBox?.x)
        expect(newBox?.y).not.toBe(initialBox?.y)
      }
    })
  })

  test.describe('AI機能統合', () => {
    test.beforeEach(async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
    })

    test('AIによるノード生成機能', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      
      await questMapPage.generateNodes('Python学習の具体的ステップ', 5)
      
      // ローディング状態の確認
      expect(await questMapPage.getLoadingState()).toBe(true)
      
      // 新しいノードが生成される
      await questMapPage.page.waitForFunction(
        (initialCount) => {
          const nodes = document.querySelectorAll('[data-testid^="quest-node-"]')
          return nodes.length > initialCount
        },
        initialNodeCount,
        { timeout: 15000 }
      )
      
      const finalNodeCount = await questMapPage.getNodeCount()
      expect(finalNodeCount).toBeGreaterThan(initialNodeCount)
      
      const successMessage = await questMapPage.getSuccessMessage()
      expect(successMessage).toContain('ノードが生成されました')
    })

    test('ノードの細分化機能', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      if (initialNodeCount > 0) {
        await questMapPage.breakdownNode('1', 3)
        
        // 細分化されたノードが追加される
        await questMapPage.page.waitForFunction(
          (initialCount) => {
            const nodes = document.querySelectorAll('[data-testid^="quest-node-"]')
            return nodes.length > initialCount
          },
          initialNodeCount,
          { timeout: 15000 }
        )
        
        const finalNodeCount = await questMapPage.getNodeCount()
        expect(finalNodeCount).toBeGreaterThan(initialNodeCount)
      }
    })

    test('ノードの拡散（代替案生成）機能', async () => {
      const initialNodeCount = await questMapPage.getNodeCount()
      if (initialNodeCount > 0) {
        await questMapPage.expandNode('1', 3)
        
        // 代替ノードが追加される
        await questMapPage.page.waitForFunction(
          (initialCount) => {
            const nodes = document.querySelectorAll('[data-testid^="quest-node-"]')
            return nodes.length > initialCount
          },
          initialNodeCount,
          { timeout: 15000 }
        )
        
        const finalNodeCount = await questMapPage.getNodeCount()
        expect(finalNodeCount).toBeGreaterThan(initialNodeCount)
      }
    })

    test('AIチャット機能', async () => {
      await questMapPage.openAIChat()
      
      // チャットインターフェースが表示される
      const chatInterface = questMapPage.page.locator('[data-testid="ai-chat-interface"]')
      await expect(chatInterface).toBeVisible()
      
      // メッセージを送信
      await questMapPage.sendAIMessage('このクエストの次のステップは何ですか？')
      
      // AI応答を待機
      await questMapPage.waitForAIResponse()
      
      // 応答が表示されることを確認
      const aiResponse = questMapPage.page.locator('[data-testid="ai-response"]')
      await expect(aiResponse).toBeVisible()
      
      const responseText = await aiResponse.textContent()
      expect(responseText).toBeTruthy()
      expect(responseText!.length).toBeGreaterThan(10)
    })
  })

  test.describe('マップ操作とナビゲーション', () => {
    test.beforeEach(async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
    })

    test('ズーム機能', async () => {
      // ズームイン
      await questMapPage.zoomIn()
      await questMapPage.page.waitForTimeout(500) // アニメーション待機
      
      // ズームアウト
      await questMapPage.zoomOut()
      await questMapPage.page.waitForTimeout(500)
      
      // ズームリセット
      await questMapPage.resetZoom()
      await questMapPage.page.waitForTimeout(500)
      
      // エラーが発生しないことを確認
      const errorMessage = await questMapPage.getErrorMessage()
      expect(errorMessage).toBeNull()
    })

    test('フルスクリーン機能', async () => {
      await questMapPage.toggleFullscreen()
      await questMapPage.page.waitForTimeout(1000)
      
      // フルスクリーン状態の確認（実際のブラウザ挙動に依存）
      const mapContainer = questMapPage.page.locator('[data-testid="quest-map-container"]')
      await expect(mapContainer).toBeVisible()
      
      // フルスクリーン解除
      await questMapPage.toggleFullscreen()
      await questMapPage.page.waitForTimeout(1000)
    })
  })

  test.describe('データ永続化と同期', () => {
    test.beforeEach(async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
    })

    test('クエストマップの保存機能', async () => {
      // ノードを追加/変更
      await questMapPage.generateNodes('追加ノード', 3)
      await questMapPage.page.waitForTimeout(2000)
      
      // 保存実行
      await questMapPage.saveQuestMap()
      
      const successMessage = await questMapPage.getSuccessMessage()
      expect(successMessage).toContain('保存されました')
    })

    test('ページリロード後のデータ復元', async ({ page }) => {
      // ノードを生成
      await questMapPage.generateNodes('テストノード', 3)
      await questMapPage.page.waitForTimeout(2000)
      
      const initialNodeCount = await questMapPage.getNodeCount()
      
      // ページをリロード
      await page.reload()
      await questMapPage.waitForQuestMapLoad()
      
      // データが復元されることを確認
      const restoredNodeCount = await questMapPage.getNodeCount()
      expect(restoredNodeCount).toBe(initialNodeCount)
    })

    test('エクスポート機能', async ({ page }) => {
      // PNG エクスポート
      const downloadPromise = page.waitForEvent('download')
      await questMapPage.exportQuestMap('png')
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('.png')
      
      // JSON エクスポート
      const jsonDownloadPromise = page.waitForEvent('download')
      await questMapPage.exportQuestMap('json')
      const jsonDownload = await jsonDownloadPromise
      expect(jsonDownload.suggestedFilename()).toContain('.json')
    })
  })

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の適切な処理', async ({ page }) => {
      // ネットワークを無効化
      await page.setOffline(true)
      
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      
      // エラーメッセージが表示される
      const errorMessage = await questMapPage.getErrorMessage()
      expect(errorMessage).toContain('ネットワークエラー')
      
      // ネットワークを復元
      await page.setOffline(false)
    })

    test('無効なデータでの適切なエラーハンドリング', async () => {
      // 無効なクエスト作成を試行
      await questMapPage.createQuest('x'.repeat(2000)) // 長すぎる目標
      
      const errorMessage = await questMapPage.getErrorMessage()
      expect(errorMessage).toContain('目標が長すぎます')
    })

    test('AI API エラー時の処理', async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
      
      // AI機能を無効な条件で実行
      await questMapPage.generateNodes('', 0) // 無効な入力
      
      const errorMessage = await questMapPage.getErrorMessage()
      expect(errorMessage).toBeTruthy()
    })
  })

  test.describe('パフォーマンス', () => {
    test('大量のノードでもパフォーマンス問題が発生しない', async ({ page }) => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
      
      // 複数回のノード生成
      const startTime = Date.now()
      
      for (let i = 0; i < 5; i++) {
        await questMapPage.generateNodes(`ステップ ${i + 1}`, 3)
        await questMapPage.page.waitForTimeout(1000)
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // 30秒以内に完了することを確認
      expect(totalTime).toBeLessThan(30000)
      
      // UIが応答性を保っていることを確認
      const finalNodeCount = await questMapPage.getNodeCount()
      expect(finalNodeCount).toBeGreaterThan(10)
      
      // ズーム操作が正常に動作することを確認
      await questMapPage.zoomIn()
      await questMapPage.page.waitForTimeout(500)
      await questMapPage.resetZoom()
    })

    test('リアルタイム更新のパフォーマンス', async ({ page, context }) => {
      // 複数のタブ/コンテキストでのテスト（将来のリアルタイム機能用）
      const secondPage = await context.newPage()
      const secondQuestMapPage = new QuestMapPage(secondPage)
      
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
      
      // 同じクエストを第二のページでも開く
      await secondQuestMapPage.goto()
      // 同じクエストを選択する処理（実装に依存）
      
      // 片方でノード追加
      await questMapPage.generateNodes('リアルタイムテスト', 2)
      
      // もう片方に反映されることを確認（リアルタイム機能が実装されている場合）
      // await secondQuestMapPage.page.waitForTimeout(3000)
      // const secondPageNodeCount = await secondQuestMapPage.getNodeCount()
      // expect(secondPageNodeCount).toBeGreaterThan(1)
      
      await secondPage.close()
    })
  })

  test.describe('アクセシビリティ', () => {
    test.beforeEach(async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
    })

    test('キーボードナビゲーション', async ({ page }) => {
      // Tabキーでノードを選択
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toHaveAttribute('data-testid', /^quest-node-/)
      
      // Enterキーで選択
      await page.keyboard.press('Enter')
      
      const selectedNode = await questMapPage.getSelectedNode()
      await expect(selectedNode).toBeVisible()
    })

    test('スクリーンリーダー対応', async () => {
      // aria-label の存在確認
      const mapCanvas = questMapPage.page.locator('[data-testid="quest-map-canvas"]')
      await expect(mapCanvas).toHaveAttribute('aria-label')
      
      // ノードの適切なラベリング
      const nodes = await questMapPage.getNodes()
      for (const node of nodes.slice(0, 3)) { // 最初の3つをテスト
        await expect(node).toHaveAttribute('aria-label')
        await expect(node).toHaveAttribute('role', 'button')
      }
    })

    test('色覚異常対応', async ({ page }) => {
      // 色だけでなく形状やテキストでも状態が分かることを確認
      const completedNodes = questMapPage.page.locator('[data-testid^="quest-node-"].status-completed')
      const nodeCount = await completedNodes.count()
      
      if (nodeCount > 0) {
        const firstCompletedNode = completedNodes.first()
        
        // 完了アイコンの存在確認
        await expect(firstCompletedNode.locator('[data-testid="completed-icon"]')).toBeVisible()
        
        // テキスト表示の確認
        const nodeText = await firstCompletedNode.textContent()
        expect(nodeText).toBeTruthy()
      }
    })
  })

  test.describe('モバイル対応', () => {
    test.beforeEach(async ({ page }) => {
      // モバイルビューポートに設定
      await page.setViewportSize({ width: 375, height: 667 })
    })

    test('モバイルでの基本操作', async () => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
      
      // タッチ操作での選択
      const nodes = await questMapPage.getNodes()
      if (nodes.length > 0) {
        await nodes[0].tap()
        
        const selectedNode = await questMapPage.getSelectedNode()
        await expect(selectedNode).toBeVisible()
      }
    })

    test('モバイルでのズーム操作', async ({ page }) => {
      await questMapPage.createQuest(TEST_QUEST.goal, TEST_QUEST.initialContext)
      await questMapPage.waitForQuestMapLoad()
      
      // ピンチズーム（シミュレーション）
      const mapCanvas = page.locator('[data-testid="quest-map-canvas"]')
      
      await mapCanvas.touchscreen.tap(100, 100)
      await page.waitForTimeout(500)
      
      // エラーが発生しないことを確認
      const errorMessage = await questMapPage.getErrorMessage()
      expect(errorMessage).toBeNull()
    })
  })
})