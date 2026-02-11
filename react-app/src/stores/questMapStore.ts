import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { questMapAPI, handleQuestMapError } from '../api/questMap';
import {
  NodeType,
  NodeStatus,
  EdgeType
} from '../types/questMap';
import type {
  Quest,
  QuestNode,
  QuestEdge,
  QuestMapUIState,
  CreateQuestRequest,
  GenerateNodesRequest,
  BreakdownNodeRequest,
  ExpandNodeRequest,
  CompleteNodeRequest,
  ConsultAIRequest,
  NodePosition,
  MapViewState,
  QuestMapStore as QuestMapStoreInterface
} from '../types/questMap';

// 初期UI状態
const initialUIState: QuestMapUIState = {
  selectedNodeId: null,
  isLoading: false,
  error: null,
  viewState: {
    zoom: 1,
    centerX: 0,
    centerY: 0,
  },
  showNodeMenu: false,
  nodeMenuPosition: null,
  isInputModalOpen: false,
  isCompletionModalOpen: false,
  isConsultModalOpen: false,
};

// ユーティリティ関数
const generateNodeId = (): string => {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateEdgeId = (): string => {
  return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const updateNodeInQuest = (quest: Quest, nodeId: string, updates: Partial<QuestNode>): Quest => {
  return {
    ...quest,
    nodes: quest.nodes.map(node =>
      node.id === nodeId
        ? { ...node, ...updates, updatedAt: new Date() }
        : node
    ),
    updatedAt: new Date(),
  };
};

const addNodesToQuest = (quest: Quest, newNodes: QuestNode[]): Quest => {
  const existingIds = new Set(quest.nodes.map(n => n.id));
  const nodesToAdd = newNodes.filter(node => !existingIds.has(node.id));
  
  return {
    ...quest,
    nodes: [...quest.nodes, ...nodesToAdd],
    updatedAt: new Date(),
  };
};

const addEdgesToQuest = (quest: Quest, newEdges: QuestEdge[]): Quest => {
  const existingIds = new Set(quest.edges.map(e => e.id));
  const edgesToAdd = newEdges.filter(edge => !existingIds.has(edge.id));
  
  return {
    ...quest,
    edges: [...quest.edges, ...edgesToAdd],
    updatedAt: new Date(),
  };
};

export const useQuestMapStore = create<QuestMapStoreInterface>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 状態
        currentQuest: null,
        quests: [],
        ui: initialUIState,

        // クエスト関連アクション
        createQuest: async (request: CreateQuestRequest) => {
          const state = get();
          
          console.group('🎯 Quest Map Store: Creating Quest');
          console.log('📝 Request:', request);
          console.log('🔧 Current State:', state);
          console.groupEnd();
          
          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            console.log('🚀 Calling questMapAPI.createQuest...');
            const response = await questMapAPI.createQuest(request);
            console.log('✅ Quest created successfully:', response);
            
            // バックエンドからの応答をクエスト形式に変換
            const quest: Quest = {
              id: response.id.toString(),
              title: response.goal,
              goal: response.goal,
              currentSituation: request.currentSituation,
              userId: response.user_id.toString(),
              nodes: [], // 初期状態では空
              edges: [],
              createdAt: new Date(response.created_at),
              updatedAt: new Date(response.updated_at),
              isPublic: false
            };
            
            set(state => ({
              currentQuest: quest,
              quests: [quest, ...state.quests],
              ui: { ...state.ui, isLoading: false, isInputModalOpen: false }
            }));
            
            return { quest }; // CreateQuestResponse形式で返す

          } catch (error) {
            console.error('❌ Failed to create quest in store:', error);
            const questMapError = handleQuestMapError(error);
            console.error('📊 Processed error:', questMapError);
            
            set(state => ({
              ui: {
                ...state.ui,
                isLoading: false,
                error: questMapError.message
              }
            }));
            throw error;
          }
        },

        generateNodes: async (request: any) => {
          const state = get();
          
          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            console.log('🚀 Calling generateNodes with:', request);
            const response = await questMapAPI.generateNodes(request);
            console.log('✅ Nodes generated:', response);
            
            // currentQuestの存在を再確認
            const currentState = get();
            if (currentState.currentQuest && response && response.suggested_nodes) {
              // 現在地ノードを作成
              const currentNode: QuestNode = {
                id: 'current-node',
                title: '現在地',
                description: currentState.currentQuest.currentSituation || '',
                type: NodeType.CURRENT,
                status: NodeStatus.COMPLETED,
                category: 'current',
                x: 100,
                y: 400,
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // ゴールノードを作成
              const goalNode: QuestNode = {
                id: 'goal-node',
                title: 'ゴール',
                description: currentState.currentQuest.goal,
                type: NodeType.GOAL,
                status: NodeStatus.NOT_STARTED,
                category: 'goal',
                x: 900,
                y: 150,
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // バックエンドの応答からアクションノードを変換
              const actionNodes: QuestNode[] = response.suggested_nodes.slice(0, 3).map((node: any, index: number) => ({
                id: `action-${Date.now()}-${index}`,
                title: node.title,
                description: node.description,
                type: NodeType.CHOICE,
                status: NodeStatus.NOT_STARTED,
                category: node.category || 'action',
                x: 350,
                y: 250 + index * 120,
                isRecommended: node.priority >= 4,
                aiComment: node.expected_outcome,
                createdAt: new Date(),
                updatedAt: new Date()
              }));

              // 将来のノードを作成（アクションノードの先）
              const futureNodes: QuestNode[] = response.suggested_nodes.slice(3).map((node: any, index: number) => ({
                id: `future-${Date.now()}-${index}`,
                title: node.title,
                description: node.description,
                type: NodeType.FUTURE,
                status: NodeStatus.LOCKED,
                category: node.category || 'action',
                x: 600,
                y: 250 + Math.floor(index / 2) * 120,
                isRecommended: false,
                aiComment: node.expected_outcome,
                createdAt: new Date(),
                updatedAt: new Date()
              }));

              const allNodes = [currentNode, goalNode, ...actionNodes, ...futureNodes];

              // エッジを生成
              const edges: QuestEdge[] = [];
              
              // 現在地からアクションノードへのエッジ
              actionNodes.forEach((node, index) => {
                edges.push({
                  id: `edge-current-action-${index}`,
                  sourceId: 'current-node',
                  targetId: node.id,
                  type: EdgeType.SOLID,
                  weight: 1
                });
              });

              // アクションノードから将来ノードへのエッジ（点線）
              actionNodes.forEach((actionNode, i) => {
                if (futureNodes[i]) {
                  edges.push({
                    id: `edge-action-future-${i}`,
                    sourceId: actionNode.id,
                    targetId: futureNodes[i].id,
                    type: EdgeType.DOTTED,
                    weight: 0.5
                  });
                }
              });

              // 将来ノードからゴールへのエッジ（点線）
              futureNodes.forEach((node, index) => {
                edges.push({
                  id: `edge-future-goal-${index}`,
                  sourceId: node.id,
                  targetId: 'goal-node',
                  type: EdgeType.DOTTED,
                  weight: 0.3
                });
              });

              const updatedQuest = {
                ...currentState.currentQuest,
                nodes: allNodes,
                edges: edges
              };

              set(state => ({
                currentQuest: updatedQuest,
                quests: state.quests.map(quest =>
                  quest && quest.id === updatedQuest.id ? updatedQuest : quest
                ).filter(Boolean), // null値を除外
                ui: { ...state.ui, isLoading: false }
              }));
            }

          } catch (error) {
            const questMapError = handleQuestMapError(error);
            set(state => ({
              ui: {
                ...state.ui,
                isLoading: false,
                error: questMapError.message
              }
            }));
            throw error;
          }
        },

        breakdownNode: async (request: BreakdownNodeRequest) => {
          const state = get();
          
          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            const response = await questMapAPI.breakdownNode(request);
            
            if (state.currentQuest) {
              const updatedQuest = addEdgesToQuest(
                addNodesToQuest(state.currentQuest, response.childNodes),
                response.edges
              );

              set(state => ({
                currentQuest: updatedQuest,
                quests: state.quests.map(quest =>
                  quest.id === updatedQuest.id ? updatedQuest : quest
                ),
                ui: { 
                  ...state.ui, 
                  isLoading: false,
                  showNodeMenu: false,
                  nodeMenuPosition: null
                }
              }));
            }

          } catch (error) {
            const questMapError = handleQuestMapError(error);
            set(state => ({
              ui: {
                ...state.ui,
                isLoading: false,
                error: questMapError.message
              }
            }));
            throw error;
          }
        },

        expandNode: async (request: ExpandNodeRequest) => {
          const state = get();
          
          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            const response = await questMapAPI.expandNode(request);
            
            if (state.currentQuest) {
              const updatedQuest = addEdgesToQuest(
                addNodesToQuest(state.currentQuest, response.relatedNodes),
                response.edges
              );

              set(state => ({
                currentQuest: updatedQuest,
                quests: state.quests.map(quest =>
                  quest.id === updatedQuest.id ? updatedQuest : quest
                ),
                ui: { 
                  ...state.ui, 
                  isLoading: false,
                  showNodeMenu: false,
                  nodeMenuPosition: null
                }
              }));
            }

          } catch (error) {
            const questMapError = handleQuestMapError(error);
            set(state => ({
              ui: {
                ...state.ui,
                isLoading: false,
                error: questMapError.message
              }
            }));
            throw error;
          }
        },

        completeNode: async (nodeId: string, request?: any) => {
          const state = get();
          
          if (state.currentQuest) {
            // ローカルでノードのステータスを更新
            const updatedNodes = state.currentQuest.nodes.map(node => {
              if (node.id === nodeId) {
                return { ...node, status: NodeStatus.COMPLETED };
              }
              // 完了したノードの先のノードをアンロック
              const edge = state.currentQuest?.edges.find(
                e => e.sourceId === nodeId && e.targetId === node.id
              );
              if (edge && node.status === NodeStatus.LOCKED) {
                return { ...node, status: NodeStatus.NOT_STARTED };
              }
              return node;
            });

            // エッジのタイプを更新（完了したノードからのエッジを実線に）
            const updatedEdges = state.currentQuest.edges.map(edge => {
              if (edge.sourceId === nodeId) {
                return { ...edge, type: EdgeType.SOLID };
              }
              return edge;
            });

            const updatedQuest = {
              ...state.currentQuest,
              nodes: updatedNodes,
              edges: updatedEdges,
            };

            set(state => ({
              currentQuest: updatedQuest,
              quests: state.quests.map(q => 
                q.id === updatedQuest.id ? updatedQuest : q
              ),
              ui: { 
                ...state.ui, 
                showNodeMenu: false,
                nodeMenuPosition: null
              }
            }));

            console.log('✅ Node completed:', nodeId);
            
            // API呼び出し（非同期、エラーは無視）
            try {
              await questMapAPI.completeNode({ nodeId, ...request });
            } catch (error) {
              console.error('Failed to sync node completion:', error);
            }
          }
        },

        // ノード細分化処理
        breakdownNode: async (nodeId: string, request?: any) => {
          const state = get();
          if (!state.currentQuest) return;

          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            console.log('🔍 Breaking down node:', nodeId);
            
            // 現在のノードを取得
            const node = state.currentQuest.nodes.find(n => n.id === nodeId);
            if (!node) {
              throw new Error('Node not found');
            }

            // API呼び出し
            const response = await questMapAPI.breakdownNode({
              nodeId,
              questId: state.currentQuest.id,
              detail_level: request?.detail_level || 3,
              context: request?.context
            });

            // サブタスクをノードとして追加
            if (response && response.subtasks) {
              const newNodes: QuestNode[] = response.subtasks.map((task: any, index: number) => ({
                id: `subtask-${nodeId}-${Date.now()}-${index}`,
                title: task.title,
                description: task.description,
                type: NodeType.CHOICE,
                status: NodeStatus.NOT_STARTED,
                category: task.category || 'action',
                x: node.x + 250,
                y: node.y - 50 + (index * 80),
                isRecommended: false,
                aiComment: task.expected_outcome,
                parentId: nodeId,
                createdAt: new Date(),
                updatedAt: new Date()
              }));

              // エッジを追加（親ノードから子ノードへ）
              const newEdges: QuestEdge[] = newNodes.map((childNode, index) => ({
                id: `edge-breakdown-${nodeId}-${index}`,
                sourceId: nodeId,
                targetId: childNode.id,
                type: EdgeType.SOLID,
                weight: 1
              }));

              const updatedQuest = {
                ...state.currentQuest,
                nodes: [...state.currentQuest.nodes, ...newNodes],
                edges: [...state.currentQuest.edges, ...newEdges]
              };

              set(state => ({
                currentQuest: updatedQuest,
                quests: state.quests.map(q => 
                  q.id === updatedQuest.id ? updatedQuest : q
                ),
                ui: { ...state.ui, isLoading: false }
              }));

              console.log('✅ Node breakdown complete:', newNodes.length, 'subtasks created');
            }
          } catch (error) {
            console.error('Failed to breakdown node:', error);
            set(state => ({
              ui: { 
                ...state.ui, 
                isLoading: false, 
                error: 'ノードの細分化に失敗しました' 
              }
            }));
          }
        },

        // ノード拡張処理
        expandNode: async (nodeId: string, request?: any) => {
          const state = get();
          if (!state.currentQuest) return;

          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            console.log('💡 Expanding node:', nodeId);
            
            // 現在のノードを取得
            const node = state.currentQuest.nodes.find(n => n.id === nodeId);
            if (!node) {
              throw new Error('Node not found');
            }

            // API呼び出し
            const response = await questMapAPI.expandNode({
              nodeId,
              questId: state.currentQuest.id,
              alternative_count: request?.alternative_count || 3,
              context: request?.context
            });

            // 代替案をノードとして追加
            if (response && response.alternatives) {
              const newNodes: QuestNode[] = response.alternatives.map((alt: any, index: number) => ({
                id: `alternative-${nodeId}-${Date.now()}-${index}`,
                title: alt.title,
                description: alt.description,
                type: NodeType.CHOICE,
                status: NodeStatus.NOT_STARTED,
                category: alt.category || 'action',
                x: node.x,
                y: node.y + 100 + (index * 80),
                isRecommended: alt.priority >= 4,
                aiComment: alt.rationale,
                alternativeToId: nodeId,
                createdAt: new Date(),
                updatedAt: new Date()
              }));

              // 元のノードと同じターゲットにエッジを追加
              const originalEdges = state.currentQuest.edges.filter(e => e.sourceId === nodeId);
              const newEdges: QuestEdge[] = [];
              
              newNodes.forEach((altNode) => {
                originalEdges.forEach(origEdge => {
                  newEdges.push({
                    id: `edge-alt-${altNode.id}-${origEdge.targetId}`,
                    sourceId: altNode.id,
                    targetId: origEdge.targetId,
                    type: EdgeType.DOTTED,
                    weight: 0.7
                  });
                });
              });

              const updatedQuest = {
                ...state.currentQuest,
                nodes: [...state.currentQuest.nodes, ...newNodes],
                edges: [...state.currentQuest.edges, ...newEdges]
              };

              set(state => ({
                currentQuest: updatedQuest,
                quests: state.quests.map(q => 
                  q.id === updatedQuest.id ? updatedQuest : q
                ),
                ui: { ...state.ui, isLoading: false }
              }));

              console.log('✅ Node expansion complete:', newNodes.length, 'alternatives created');
            }
          } catch (error) {
            console.error('Failed to expand node:', error);
            set(state => ({
              ui: { 
                ...state.ui, 
                isLoading: false, 
                error: '代替案の生成に失敗しました' 
              }
            }));
          }
        },

        consultAI: async (request: ConsultAIRequest): Promise<string> => {
          const state = get();
          
          try {
            set(state => ({
              ui: { ...state.ui, isLoading: true, error: null }
            }));

            const response = await questMapAPI.consultAI(request);
            
            set(state => ({
              ui: { 
                ...state.ui, 
                isLoading: false,
                isConsultModalOpen: false 
              }
            }));

            return response.advice;

          } catch (error) {
            const questMapError = handleQuestMapError(error);
            set(state => ({
              ui: {
                ...state.ui,
                isLoading: false,
                error: questMapError.message
              }
            }));
            throw error;
          }
        },

        // UI アクション
        setSelectedNode: (nodeId: string | null) => {
          set(state => ({
            ui: { 
              ...state.ui, 
              selectedNodeId: nodeId,
              showNodeMenu: false,
              nodeMenuPosition: null
            }
          }));
        },

        setViewState: (viewState: Partial<MapViewState>) => {
          set(state => ({
            ui: {
              ...state.ui,
              viewState: { ...state.ui.viewState, ...viewState }
            }
          }));
        },

        setNodeMenuOpen: (open: boolean, position?: { x: number; y: number }) => {
          set(state => ({
            ui: {
              ...state.ui,
              showNodeMenu: open,
              nodeMenuPosition: open ? position || null : null
            }
          }));
        },

        setInputModalOpen: (open: boolean) => {
          set(state => ({
            ui: { ...state.ui, isInputModalOpen: open }
          }));
        },

        setCompletionModalOpen: (open: boolean) => {
          set(state => ({
            ui: { ...state.ui, isCompletionModalOpen: open }
          }));
        },

        setConsultModalOpen: (open: boolean) => {
          set(state => ({
            ui: { ...state.ui, isConsultModalOpen: open }
          }));
        },

        setError: (error: string | null) => {
          set(state => ({
            ui: { ...state.ui, error }
          }));
        },

        setLoading: (loading: boolean) => {
          set(state => ({
            ui: { ...state.ui, isLoading: loading }
          }));
        },

        // データ更新
        updateNodePosition: (nodeId: string, position: NodePosition) => {
          const state = get();
          
          if (state.currentQuest) {
            const updatedQuest = updateNodeInQuest(
              state.currentQuest,
              nodeId,
              position
            );

            set(state => ({
              currentQuest: updatedQuest,
              quests: state.quests.map(quest =>
                quest.id === updatedQuest.id ? updatedQuest : quest
              )
            }));

            // フロントエンドで生成されたノード（文字列ID）はバックエンドに保存しない
            // バックエンドのノードは数値IDを持つ
            if (!isNaN(Number(nodeId))) {
              // バックエンドに非同期で位置を保存
              questMapAPI.updateNodePosition(state.currentQuest.id, nodeId, position)
                .catch(error => {
                  console.error('Failed to save node position:', error);
                });
            }
          }
        },

        updateNode: (nodeId: string, updates: Partial<QuestNode>) => {
          const state = get();
          
          if (state.currentQuest) {
            const updatedQuest = updateNodeInQuest(
              state.currentQuest,
              nodeId,
              updates
            );

            set(state => ({
              currentQuest: updatedQuest,
              quests: state.quests.map(quest =>
                quest.id === updatedQuest.id ? updatedQuest : quest
              )
            }));
          }
        },

        addNodes: (nodes: QuestNode[]) => {
          const state = get();
          
          if (state.currentQuest) {
            const updatedQuest = addNodesToQuest(state.currentQuest, nodes);

            set(state => ({
              currentQuest: updatedQuest,
              quests: state.quests.map(quest =>
                quest.id === updatedQuest.id ? updatedQuest : quest
              )
            }));
          }
        },

        addEdges: (edges: QuestEdge[]) => {
          const state = get();
          
          if (state.currentQuest) {
            const updatedQuest = addEdgesToQuest(state.currentQuest, edges);

            set(state => ({
              currentQuest: updatedQuest,
              quests: state.quests.map(quest =>
                quest.id === updatedQuest.id ? updatedQuest : quest
              )
            }));
          }
        },

        // クリーンアップ
        clearQuest: () => {
          set(() => ({
            currentQuest: null,
            ui: {
              ...initialUIState,
              viewState: { zoom: 1, centerX: 0, centerY: 0 }
            }
          }));
        },

        reset: () => {
          set(() => ({
            currentQuest: null,
            quests: [],
            ui: initialUIState
          }));
        },
      }),
      {
        name: 'quest-map-storage',
        // UIの一部の状態のみを永続化
        partialize: (state) => ({
          quests: state.quests,
          ui: {
            viewState: state.ui.viewState,
          }
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // 永続化されていない状態を初期化
            state.ui = {
              ...initialUIState,
              viewState: state.ui?.viewState || initialUIState.viewState,
            };
          }
        },
      }
    )
  )
);

// パフォーマンス最適化用のセレクタ
export const selectCurrentQuest = () => 
  useQuestMapStore((state) => state.currentQuest, shallow);

export const selectQuests = () => 
  useQuestMapStore((state) => state.quests, shallow);

export const selectUIState = () => 
  useQuestMapStore((state) => state.ui, shallow);

export const selectNodes = () => 
  useQuestMapStore((state) => state.currentQuest?.nodes || [], shallow);

export const selectEdges = () => 
  useQuestMapStore((state) => state.currentQuest?.edges || [], shallow);

export const selectSelectedNode = () => 
  useQuestMapStore((state) => {
    if (!state.currentQuest || !state.ui.selectedNodeId) return null;
    return state.currentQuest.nodes.find(node => node.id === state.ui.selectedNodeId) || null;
  });

export const selectViewState = () => 
  useQuestMapStore((state) => state.ui.viewState, shallow);

export const selectIsLoading = () => 
  useQuestMapStore((state) => state.ui.isLoading);

export const selectError = () => 
  useQuestMapStore((state) => state.ui.error);

// アクション用のセレクタ
export const selectQuestMapActions = () => useQuestMapStore((state) => ({
  createQuest: state.createQuest,
  generateNodes: state.generateNodes,
  breakdownNode: state.breakdownNode,
  expandNode: state.expandNode,
  completeNode: state.completeNode,
  consultAI: state.consultAI,
}));

export const selectUIActions = () => useQuestMapStore((state) => ({
  setSelectedNode: state.setSelectedNode,
  setViewState: state.setViewState,
  setNodeMenuOpen: state.setNodeMenuOpen,
  setInputModalOpen: state.setInputModalOpen,
  setCompletionModalOpen: state.setCompletionModalOpen,
  setConsultModalOpen: state.setConsultModalOpen,
  setError: state.setError,
  setLoading: state.setLoading,
}));

export const selectDataActions = () => useQuestMapStore((state) => ({
  updateNodePosition: state.updateNodePosition,
  updateNode: state.updateNode,
  addNodes: state.addNodes,
  addEdges: state.addEdges,
  clearQuest: state.clearQuest,
  reset: state.reset,
}));