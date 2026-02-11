// src/test/utils.tsx - テストユーティリティ
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { vi } from 'vitest'

// テーマの作成
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// カスタムレンダー関数
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// re-export everything
export * from '@testing-library/react'
export { customRender as render }

// QuestMapStore のモック
export const mockQuestMapStore = {
  // State
  currentQuest: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  isLoading: false,
  error: null,
  
  // Actions
  createQuest: vi.fn(),
  updateQuest: vi.fn(),
  deleteQuest: vi.fn(),
  loadQuestGraph: vi.fn(),
  addNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  selectNode: vi.fn(),
  clearSelection: vi.fn(),
  addEdge: vi.fn(),
  updateEdge: vi.fn(),
  deleteEdge: vi.fn(),
  completeNode: vi.fn(),
  generateNodes: vi.fn(),
  breakdownNode: vi.fn(),
  expandNode: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  clearError: vi.fn(),
  reset: vi.fn(),
}

// Mock Quest データ
export const mockQuest = {
  id: 1,
  user_id: 123,
  goal: "プログラミングスキルを身につける",
  current_status: "in_progress",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z"
}

// Mock Node データ
export const mockNodes = [
  {
    id: 1,
    quest_id: 1,
    type: "goal",
    title: "プログラミングマスター",
    description: "プログラミングの基礎から応用まで習得する",
    category: "programming",
    status: "pending",
    position: { x: 0, y: 0 },
    parent_id: null,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    quest_id: 1,
    type: "action",
    title: "Python基礎学習",
    description: "Python基礎文法とライブラリを学ぶ",
    category: "programming",
    status: "in_progress",
    position: { x: 100, y: 100 },
    parent_id: 1,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    quest_id: 1,
    type: "action",
    title: "Web開発実践",
    description: "FlaskまたはDjangoでWebアプリを作る",
    category: "programming",
    status: "pending",
    position: { x: 200, y: 100 },
    parent_id: 1,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]

// Mock Edge データ
export const mockEdges = [
  {
    id: 1,
    quest_id: 1,
    source_id: 1,
    target_id: 2,
    type: "next",
    weight: 1,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    quest_id: 1,
    source_id: 1,
    target_id: 3,
    type: "next",
    weight: 1,
    metadata: {},
    created_at: "2024-01-01T00:00:00Z"
  }
]

// Mock Graph データ
export const mockQuestGraph = {
  quest: mockQuest,
  nodes: mockNodes,
  edges: mockEdges,
  statistics: {
    total_nodes: 3,
    total_edges: 2,
    completed_nodes: 0,
    pending_nodes: 2,
    in_progress_nodes: 1
  }
}

// D3 モック用ヘルパー
export const mockD3Selection = {
  selectAll: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  data: vi.fn().mockReturnThis(),
  enter: vi.fn().mockReturnThis(),
  exit: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
  append: vi.fn().mockReturnThis(),
  attr: vi.fn().mockReturnThis(),
  style: vi.fn().mockReturnThis(),
  text: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  call: vi.fn().mockReturnThis(),
  join: vi.fn().mockReturnThis(),
  datum: vi.fn().mockReturnThis(),
  classed: vi.fn().mockReturnThis(),
  property: vi.fn().mockReturnThis(),
  node: vi.fn().mockReturnValue(document.createElement('div')),
  nodes: vi.fn().mockReturnValue([]),
  size: vi.fn().mockReturnValue(0),
  empty: vi.fn().mockReturnValue(false),
  each: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  merge: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  raise: vi.fn().mockReturnThis(),
  lower: vi.fn().mockReturnThis(),
}

// ユーザーイベントヘルパー
export const mockUserEvent = {
  click: async (element: Element) => {
    const event = new MouseEvent('click', { bubbles: true })
    element.dispatchEvent(event)
  },
  doubleClick: async (element: Element) => {
    const event = new MouseEvent('dblclick', { bubbles: true })
    element.dispatchEvent(event)
  },
  hover: async (element: Element) => {
    const mouseEnter = new MouseEvent('mouseenter', { bubbles: true })
    const mouseOver = new MouseEvent('mouseover', { bubbles: true })
    element.dispatchEvent(mouseEnter)
    element.dispatchEvent(mouseOver)
  },
  unhover: async (element: Element) => {
    const mouseLeave = new MouseEvent('mouseleave', { bubbles: true })
    const mouseOut = new MouseEvent('mouseout', { bubbles: true })
    element.dispatchEvent(mouseLeave)
    element.dispatchEvent(mouseOut)
  },
  type: async (element: Element, text: string) => {
    const input = element as HTMLInputElement
    input.value = text
    const event = new Event('input', { bubbles: true })
    element.dispatchEvent(event)
  }
}

// アサーションヘルパー
export const expectQuestMapStructure = (container: HTMLElement) => {
  expect(container.querySelector('[data-testid="quest-map-canvas"]')).toBeInTheDocument()
}

export const expectNodeStructure = (nodeElement: HTMLElement) => {
  expect(nodeElement).toHaveAttribute('data-testid')
  expect(nodeElement.getAttribute('data-testid')).toMatch(/^quest-node-\d+$/)
}

export const expectEdgeStructure = (edgeElement: HTMLElement) => {
  expect(edgeElement).toHaveAttribute('data-testid')
  expect(edgeElement.getAttribute('data-testid')).toMatch(/^quest-edge-\d+$/)
}

// Zustand Store テストヘルパー
export const createMockStore = (initialState = {}) => {
  const state = { ...mockQuestMapStore, ...initialState }
  
  return {
    getState: () => state,
    setState: vi.fn((updater) => {
      if (typeof updater === 'function') {
        Object.assign(state, updater(state))
      } else {
        Object.assign(state, updater)
      }
    }),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  }
}

// API モック
export const mockAPI = {
  createQuest: vi.fn().mockResolvedValue(mockQuest),
  getQuest: vi.fn().mockResolvedValue(mockQuest),
  updateQuest: vi.fn().mockResolvedValue(mockQuest),
  deleteQuest: vi.fn().mockResolvedValue({ success: true }),
  getQuestGraph: vi.fn().mockResolvedValue(mockQuestGraph),
  generateNodes: vi.fn().mockResolvedValue({
    suggested_nodes: [
      { title: "Python基礎", description: "基礎文法学習" },
      { title: "Web開発", description: "実践プロジェクト" }
    ],
    reasoning: "段階的学習"
  }),
  breakdownNode: vi.fn().mockResolvedValue({
    subtasks: [
      { title: "変数学習", description: "変数の使い方" },
      { title: "関数学習", description: "関数の定義と呼び出し" }
    ]
  }),
  expandNode: vi.fn().mockResolvedValue({
    alternatives: [
      { title: "オンライン学習", description: "Udemyコース" },
      { title: "書籍学習", description: "技術書での学習" }
    ]
  }),
  completeNode: vi.fn().mockResolvedValue({
    ...mockNodes[0],
    status: "completed"
  })
}

// WebSocket モック
export const createMockWebSocket = () => {
  const mockWS = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }
  
  return mockWS
}

// タイマーテストヘルパー
export const advanceTimersAndFlush = async (ms = 0) => {
  vi.advanceTimersByTime(ms)
  await new Promise(resolve => setTimeout(resolve, 0))
}

// スナップショットテストヘルパー
export const createSnapshot = (component: ReactElement) => {
  const { container } = customRender(component)
  return container.firstChild
}