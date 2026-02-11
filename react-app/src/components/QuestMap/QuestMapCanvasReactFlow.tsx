import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  Position,
  Handle,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, useTheme, alpha, Typography, Chip } from '@mui/material';
import {
  selectCurrentQuest,
  selectUIState,
  selectUIActions,
  selectDataActions,
} from '../../stores/questMapStore';
import { NodeType, NodeStatus, EdgeType } from '../../types/questMap';
import type { QuestNode, QuestEdge } from '../../types/questMap';

// カスタムノードコンポーネント
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const theme = useTheme();
  const { setSelectedNode, setNodeMenuOpen } = selectUIActions();

  const nodeStyle = useMemo(() => {
    const baseStyle = NODE_STYLES[data.type];
    const statusStyle = STATUS_STYLES[data.status];
    
    return {
      background: statusStyle.fill || baseStyle.color,
      color: '#fff',
      border: selected ? `3px solid ${theme.palette.primary.main}` : `2px solid ${statusStyle.stroke || baseStyle.color}`,
      borderRadius: '50%',
      width: baseStyle.size * 2,
      height: baseStyle.size * 2,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px',
      opacity: statusStyle.opacity,
      cursor: 'pointer',
      boxShadow: data.isRecommended 
        ? '0px 0px 15px rgba(255, 215, 0, 0.8)' 
        : '2px 2px 8px rgba(0,0,0,0.2)',
      transition: 'all 0.3s ease',
      position: 'relative' as const,
    };
  }, [data.type, data.status, data.isRecommended, selected, theme]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedNode(data.id);
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setNodeMenuOpen(true, { x: rect.left + rect.width / 2, y: rect.top });
  }, [data.id, setSelectedNode, setNodeMenuOpen]);

  return (
    <div style={nodeStyle} onClick={handleClick}>
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      
      <div style={{ fontSize: NODE_STYLES[data.type].size * 0.8 }}>
        {NODE_STYLES[data.type].icon}
      </div>
      
      {data.isRecommended && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'gold',
            border: '2px solid orange',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          !
        </div>
      )}
      
      <div
        style={{
          position: 'absolute',
          bottom: -25,
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 'bold',
          color: theme.palette.text.primary,
          textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
          whiteSpace: 'nowrap',
          maxWidth: 150,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.label}
      </div>
      
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
};

// ノードスタイル設定
const NODE_STYLES: Record<NodeType, { color: string; icon: string; size: number }> = {
  [NodeType.CURRENT]: {
    color: '#2E7D32',
    icon: '📍',
    size: 24,
  },
  [NodeType.CHOICE]: {
    color: '#1976D2',
    icon: '🤔',
    size: 20,
  },
  [NodeType.FUTURE]: {
    color: '#F57C00',
    icon: '🔮',
    size: 20,
  },
  [NodeType.GOAL]: {
    color: '#C62828',
    icon: '🎯',
    size: 28,
  },
};

const STATUS_STYLES: Record<NodeStatus, { opacity: number; stroke?: string; strokeWidth?: number; fill?: string }> = {
  [NodeStatus.NOT_STARTED]: { opacity: 1 },
  [NodeStatus.IN_PROGRESS]: { opacity: 0.8, stroke: '#FF9800', strokeWidth: 3 },
  [NodeStatus.COMPLETED]: { opacity: 0.6, fill: '#4CAF50', stroke: '#2E7D32', strokeWidth: 2 },
};

// カスタムノードタイプ定義
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// ReactFlowコンポーネント
const QuestMapCanvasContent: React.FC<{ width?: number; height?: number }> = ({
  width = 1200,
  height = 800,
}) => {
  const theme = useTheme();
  const currentQuest = selectCurrentQuest();
  const ui = selectUIState();
  const { setSelectedNode, setNodeMenuOpen, setViewState } = selectUIActions();
  const { updateNodePosition } = selectDataActions();
  const { fitView } = useReactFlow();

  // ReactFlowのノードとエッジに変換
  const initialNodes = useMemo(() => {
    if (!currentQuest) return [];
    
    return currentQuest.nodes.map((node: QuestNode) => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        ...node,
        label: node.title,
      },
    }));
  }, [currentQuest]);

  const initialEdges = useMemo(() => {
    if (!currentQuest) return [];
    
    return currentQuest.edges.map((edge: QuestEdge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type === EdgeType.DOTTED ? 'step' : 'smoothstep',
      animated: edge.type === EdgeType.DOTTED,
      style: {
        stroke: theme.palette.mode === 'dark' ? '#666' : '#999',
        strokeWidth: 2,
        strokeDasharray: edge.type === EdgeType.DOTTED ? '5 5' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: theme.palette.mode === 'dark' ? '#666' : '#999',
      },
      label: edge.label,
      labelStyle: {
        fill: theme.palette.text.primary,
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: theme.palette.background.paper,
        stroke: theme.palette.divider,
      },
    }));
  }, [currentQuest, theme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ノードの移動が終了したときの処理
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, { x: node.position.x, y: node.position.y });
    },
    [updateNodePosition]
  );

  // ノード選択の処理
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  // 背景クリックの処理
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setNodeMenuOpen(false);
  }, [setSelectedNode, setNodeMenuOpen]);

  // ビューポートの変更を保存
  const onMoveEnd = useCallback(
    (event: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewState({
        zoom: viewport.zoom,
        centerX: viewport.x,
        centerY: viewport.y,
      });
    },
    [setViewState]
  );

  // 初期ビューの設定
  useEffect(() => {
    if (ui.viewState) {
      fitView({
        padding: 0.2,
        duration: 800,
      });
    }
  }, [ui.viewState, fitView]);

  // ノードとエッジの更新
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (!currentQuest) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: theme.palette.text.secondary,
        }}
      >
        <Box sx={{ fontSize: '2rem', mb: 1 }}>🗺️</Box>
        <Typography>クエストを作成してマップを表示しましょう</Typography>
      </Box>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onNodeDragStop={onNodeDragStop}
      onPaneClick={onPaneClick}
      onMoveEnd={onMoveEnd}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
      style={{
        background: theme.palette.mode === 'dark' 
          ? alpha(theme.palette.background.paper, 0.9)
          : alpha(theme.palette.background.default, 0.9),
      }}
    >
      <Controls />
      <MiniMap 
        nodeColor={(node) => {
          const nodeData = node.data as QuestNode;
          return NODE_STYLES[nodeData.type].color;
        }}
        style={{
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }}
      />
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={20} 
        size={1}
        color={theme.palette.divider}
      />
    </ReactFlow>
  );
};

// メインコンポーネント（Provider付き）
const QuestMapCanvasReactFlow: React.FC<{ width?: number; height?: number }> = (props) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      }}
    >
      <ReactFlowProvider>
        <QuestMapCanvasContent {...props} />
      </ReactFlowProvider>
    </Box>
  );
};

export default React.memo(QuestMapCanvasReactFlow);