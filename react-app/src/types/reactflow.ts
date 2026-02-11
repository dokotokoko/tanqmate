// ReactFlow関連の型定義
import { Node, Edge, Connection, XYPosition } from '@xyflow/react';
import { QuestNode, QuestEdge } from './questMap';

// カスタムノードデータ型
export interface CustomNodeData extends QuestNode {
  label: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeDragStop?: (nodeId: string, position: XYPosition) => void;
}

// ReactFlowのノード型
export type ReactFlowNode = Node<CustomNodeData>;

// ReactFlowのエッジ型
export type ReactFlowEdge = Edge<QuestEdge>;

// ReactFlowのインスタンス型
export interface ReactFlowInstance {
  fitView: (options?: { padding?: number; duration?: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoomLevel: number, options?: { duration?: number }) => void;
  getNodes: () => ReactFlowNode[];
  getEdges: () => ReactFlowEdge[];
  getNode: (id: string) => ReactFlowNode | undefined;
  getEdge: (id: string) => ReactFlowEdge | undefined;
  setNodes: (nodes: ReactFlowNode[]) => void;
  setEdges: (edges: ReactFlowEdge[]) => void;
  addNodes: (nodes: ReactFlowNode[]) => void;
  addEdges: (edges: ReactFlowEdge[]) => void;
  deleteElements: (params: { nodes?: ReactFlowNode[]; edges?: ReactFlowEdge[] }) => void;
  toObject: () => { nodes: ReactFlowNode[]; edges: ReactFlowEdge[]; viewport: { x: number; y: number; zoom: number } };
  project: (position: XYPosition) => XYPosition;
  screenToFlowPosition: (position: XYPosition) => XYPosition;
  flowToScreenPosition: (position: XYPosition) => XYPosition;
}

// ビューポート型
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// コンテキストメニューのオプション
export interface ContextMenuOptions {
  nodeId: string;
  position: XYPosition;
  nodeType: string;
  nodeStatus: string;
}

// ノードツールバーのオプション
export interface NodeToolbarOptions {
  isVisible: boolean;
  nodeId: string | null;
  position: XYPosition | null;
}

// エッジのアニメーション設定
export interface EdgeAnimationConfig {
  duration: number;
  strokeDasharray?: string;
  strokeDashoffset?: string;
}

// レイアウト設定
export interface LayoutConfig {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing: number;
  levelSpacing: number;
  animated: boolean;
}

// エクスポート設定
export interface ExportConfig {
  format: 'png' | 'svg' | 'json';
  filename: string;
  backgroundColor?: string;
  padding?: number;
}

// ミニマップ設定
export interface MiniMapConfig {
  nodeColor: (node: ReactFlowNode) => string;
  nodeStrokeColor?: (node: ReactFlowNode) => string;
  nodeClassName?: (node: ReactFlowNode) => string;
  maskColor?: string;
  pannable?: boolean;
  zoomable?: boolean;
}

// コントロール設定
export interface ControlsConfig {
  showZoom?: boolean;
  showFitView?: boolean;
  showInteractive?: boolean;
  fitViewOptions?: {
    padding?: number;
    includeHiddenNodes?: boolean;
    minZoom?: number;
    maxZoom?: number;
    duration?: number;
  };
}

// 背景設定
export interface BackgroundConfig {
  variant?: 'dots' | 'lines' | 'cross';
  gap?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

// パネル設定
export interface PanelConfig {
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  style?: React.CSSProperties;
  className?: string;
}

// ドラッグ＆ドロップ設定
export interface DragConfig {
  enableDragging: boolean;
  enableNodeDrag: boolean;
  enablePaneDrag: boolean;
  dragThreshold: number;
}

// 選択設定
export interface SelectionConfig {
  multiSelectionKeyCode: string | null;
  selectionKeyCode: string | null;
  deleteKeyCode: string | null;
  panActivationKeyCode: string | null;
}

// インタラクション設定
export interface InteractionConfig {
  zoomOnScroll: boolean;
  zoomOnPinch: boolean;
  panOnScroll: boolean;
  panOnScrollSpeed: number;
  panOnDrag: boolean;
  zoomOnDoubleClick: boolean;
  selectionOnDrag: boolean;
  preventScrolling: boolean;
  nodesDraggable: boolean;
  nodesConnectable: boolean;
  nodesFocusable: boolean;
  edgesFocusable: boolean;
  edgesUpdatable: boolean;
  elementsSelectable: boolean;
  elevateNodesOnSelect: boolean;
}

// ReactFlowの設定全体
export interface ReactFlowConfig {
  viewport: Viewport;
  miniMap: MiniMapConfig;
  controls: ControlsConfig;
  background: BackgroundConfig;
  interaction: InteractionConfig;
  selection: SelectionConfig;
  drag: DragConfig;
  layout: LayoutConfig;
  export: ExportConfig;
}

// イベントハンドラー型
export interface ReactFlowEventHandlers {
  onNodeClick?: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onNodeMouseEnter?: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onNodeMouseMove?: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onNodeMouseLeave?: (event: React.MouseEvent, node: ReactFlowNode) => void;
  onNodeDragStart?: (event: React.MouseEvent, node: ReactFlowNode, nodes: ReactFlowNode[]) => void;
  onNodeDrag?: (event: React.MouseEvent, node: ReactFlowNode, nodes: ReactFlowNode[]) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: ReactFlowNode, nodes: ReactFlowNode[]) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onEdgeContextMenu?: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onEdgeMouseEnter?: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onEdgeMouseMove?: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onEdgeMouseLeave?: (event: React.MouseEvent, edge: ReactFlowEdge) => void;
  onConnect?: (connection: Connection) => void;
  onConnectStart?: (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }) => void;
  onConnectEnd?: (event: React.MouseEvent | React.TouchEvent) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onPaneScroll?: (event?: React.WheelEvent) => void;
  onMove?: (event: React.MouseEvent | React.TouchEvent | null, viewport: Viewport) => void;
  onMoveStart?: (event: React.MouseEvent | React.TouchEvent | null, viewport: Viewport) => void;
  onMoveEnd?: (event: React.MouseEvent | React.TouchEvent | null, viewport: Viewport) => void;
  onSelectionChange?: (params: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }) => void;
  onSelectionDragStart?: (event: React.MouseEvent, nodes: ReactFlowNode[]) => void;
  onSelectionDrag?: (event: React.MouseEvent, nodes: ReactFlowNode[]) => void;
  onSelectionDragStop?: (event: React.MouseEvent, nodes: ReactFlowNode[]) => void;
  onSelectionContextMenu?: (event: React.MouseEvent, nodes: ReactFlowNode[]) => void;
  onInit?: (reactFlowInstance: ReactFlowInstance) => void;
}

// ストア型（ReactFlowの状態管理）
export interface ReactFlowStore {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  viewport: Viewport;
  selectedNodes: string[];
  selectedEdges: string[];
  isInitialized: boolean;
  instance: ReactFlowInstance | null;
  
  // アクション
  setNodes: (nodes: ReactFlowNode[]) => void;
  setEdges: (edges: ReactFlowEdge[]) => void;
  addNode: (node: ReactFlowNode) => void;
  addEdge: (edge: ReactFlowEdge) => void;
  updateNode: (nodeId: string, updates: Partial<ReactFlowNode>) => void;
  updateEdge: (edgeId: string, updates: Partial<ReactFlowEdge>) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  setViewport: (viewport: Viewport) => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
  setInstance: (instance: ReactFlowInstance) => void;
  reset: () => void;
}