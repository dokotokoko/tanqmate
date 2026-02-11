// src/test/setup.ts - テスト環境セットアップ
import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Libraryのクリーンアップ
afterEach(() => {
  cleanup()
})

// グローバルモック設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// IntersectionObserver のモック
class IntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
})

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
})

// ResizeObserver のモック
class ResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
})

// Web APIs のモック
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(window, 'alert', {
  writable: true,
  value: vi.fn(),
})

// Canvas のモック (D3.js用)
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
  }),
  putImageData: vi.fn(),
  createImageData: vi.fn().mockReturnValue([]),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 0 }),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
})

// SVG のモック (D3.js用)
Object.defineProperty(SVGElement.prototype, 'getBBox', {
  writable: true,
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  }),
})

// Local Storage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: localStorageMock,
})

// CSS のモック
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: vi.fn(),
  }),
})

// URL のモック
Object.defineProperty(window, 'URL', {
  writable: true,
  value: {
    createObjectURL: vi.fn(),
    revokeObjectURL: vi.fn(),
  },
})

// PointerEvent のモック
class PointerEvent extends Event {
  constructor(type: string, props: PointerEventInit) {
    super(type, props)
    this.pointerId = props.pointerId || 0
    this.pressure = props.pressure || 0
    this.pointerType = props.pointerType || 'mouse'
  }
  pointerId: number
  pressure: number
  pointerType: string
}

Object.defineProperty(window, 'PointerEvent', {
  writable: true,
  value: PointerEvent,
})

// WebSocket のモック
class WebSocketMock {
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  
  constructor(url: string, protocols?: string | string[]) {}
  
  send = vi.fn()
  close = vi.fn()
  
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  
  readyState = WebSocketMock.CONNECTING
}

Object.defineProperty(window, 'WebSocket', {
  writable: true,
  value: WebSocketMock,
})

// Performance のモック
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn().mockReturnValue(Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
  },
})

// Request Animation Frame のモック
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: vi.fn().mockImplementation((callback: Function) => {
    return setTimeout(callback, 16)
  }),
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: vi.fn().mockImplementation((id: number) => {
    clearTimeout(id)
  }),
})

// エラー補足の無効化（テスト中のコンソールノイズ削減）
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})