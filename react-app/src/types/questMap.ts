// 探Qマップの型定義

export enum NodeType {
  CURRENT = 'current',      // 現在地
  CHOICE = 'choice',        // 選択肢
  FUTURE = 'future',        // 未来
  GOAL = 'goal'            // ゴール
}

export enum NodeStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress', 
  COMPLETED = 'completed'
}

export enum EdgeType {
  SOLID = 'solid',          // 実線（確定的な関係）
  DOTTED = 'dotted'         // 点線（可能性のある関係）
}

export interface QuestNode {
  id: string;
  title: string;
  description?: string;
  type: NodeType;
  status: NodeStatus;
  category?: string;
  x: number;
  y: number;
  isRecommended?: boolean;  // 推奨フラグ
  aiComment?: string;       // AIからのコメント
  userNote?: string;        // ユーザーメモ
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;        // 親ノード（細分化時）
  children?: string[];      // 子ノード（拡散時）
}

export interface QuestEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  weight?: number;          // エッジの重み（距離感を表現）
  label?: string;           // エッジのラベル
}

export interface Quest {
  id: string;
  title: string;
  goal: string;             // ゴールの説明
  currentSituation: string; // 現在の状況
  userId: string;
  nodes: QuestNode[];
  edges: QuestEdge[];
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface MapViewState {
  zoom: number;
  centerX: number;
  centerY: number;
}

// API レスポンス型
export interface CreateQuestRequest {
  goal: string;
  currentSituation: string;
}

export interface CreateQuestResponse {
  quest: Quest;
}

export interface GenerateNodesRequest {
  questId: string;
  goal: string;
  currentSituation: string;
}

export interface GenerateNodesResponse {
  nodes: QuestNode[];
  edges: QuestEdge[];
}

export interface BreakdownNodeRequest {
  questId: string;
  nodeId: string;
}

export interface BreakdownNodeResponse {
  childNodes: QuestNode[];
  edges: QuestEdge[];
}

export interface ExpandNodeRequest {
  questId: string;
  nodeId: string;
}

export interface ExpandNodeResponse {
  relatedNodes: QuestNode[];
  edges: QuestEdge[];
}

export interface CompleteNodeRequest {
  questId: string;
  nodeId: string;
  feedback: string;
  newCurrentSituation?: string;
}

export interface CompleteNodeResponse {
  updatedNode: QuestNode;
  aiComment: string;
  suggestions?: QuestNode[];
}

export interface ConsultAIRequest {
  questId: string;
  nodeId: string;
  question: string;
}

export interface ConsultAIResponse {
  advice: string;
  suggestedActions?: string[];
}

// UI状態管理用の型
export interface QuestMapUIState {
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;
  viewState: MapViewState;
  showNodeMenu: boolean;
  nodeMenuPosition: { x: number; y: number } | null;
  isInputModalOpen: boolean;
  isCompletionModalOpen: boolean;
  isConsultModalOpen: boolean;
}

// D3.js関連の型
export interface D3Node extends QuestNode {
  fx?: number | null;  // 固定されたx座標
  fy?: number | null;  // 固定されたy座標
  vx?: number;         // x方向の速度
  vy?: number;         // y方向の速度
}

export interface D3Edge extends QuestEdge {
  source: D3Node;
  target: D3Node;
}

export interface D3SimulationData {
  nodes: D3Node[];
  edges: D3Edge[];
}

// エラー型
export interface QuestMapError {
  code: string;
  message: string;
  details?: any;
}

// ノードアクションの型
export type NodeAction = 'consult' | 'breakdown' | 'expand' | 'complete';

export interface NodeActionConfig {
  action: NodeAction;
  label: string;
  icon: string;
  color: string;
}

// ノードスタイル設定
export interface NodeStyleConfig {
  [NodeType.CURRENT]: {
    color: string;
    icon: string;
    size: number;
  };
  [NodeType.CHOICE]: {
    color: string;
    icon: string;
    size: number;
  };
  [NodeType.FUTURE]: {
    color: string;
    icon: string;
    size: number;
  };
  [NodeType.GOAL]: {
    color: string;
    icon: string;
    size: number;
  };
}

// アニメーション設定
export interface AnimationConfig {
  duration: number;
  easing: string;
}

// Zustandストア用の型
export interface QuestMapStore {
  // 状態
  currentQuest: Quest | null;
  quests: Quest[];
  ui: QuestMapUIState;
  
  // アクション
  createQuest: (request: CreateQuestRequest) => Promise<void>;
  generateNodes: (request: GenerateNodesRequest) => Promise<void>;
  breakdownNode: (request: BreakdownNodeRequest) => Promise<void>;
  expandNode: (request: ExpandNodeRequest) => Promise<void>;
  completeNode: (request: CompleteNodeRequest) => Promise<void>;
  consultAI: (request: ConsultAIRequest) => Promise<string>;
  
  // UI アクション
  setSelectedNode: (nodeId: string | null) => void;
  setViewState: (viewState: Partial<MapViewState>) => void;
  setNodeMenuOpen: (open: boolean, position?: { x: number; y: number }) => void;
  setInputModalOpen: (open: boolean) => void;
  setCompletionModalOpen: (open: boolean) => void;
  setConsultModalOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  
  // データ更新
  updateNodePosition: (nodeId: string, position: NodePosition) => void;
  updateNode: (nodeId: string, updates: Partial<QuestNode>) => void;
  addNodes: (nodes: QuestNode[]) => void;
  addEdges: (edges: QuestEdge[]) => void;
  
  // クリーンアップ
  clearQuest: () => void;
  reset: () => void;
}