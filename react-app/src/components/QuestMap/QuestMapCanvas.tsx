import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  selectCurrentQuest, 
  selectUIState, 
  selectUIActions, 
  selectDataActions,
  selectQuestMapActions 
} from '../../stores/questMapStore';
import { NodeType, NodeStatus } from '../../types/questMap';
import type { 
  QuestNode, 
  QuestEdge
} from '../../types/questMap';
import QuestMapNodeMenu from './QuestMapNodeMenu';
import QuestMapNodeDetail from './QuestMapNodeDetail';

interface QuestMapCanvasProps {
  width?: number;
  height?: number;
}

// UIモックに合わせたカテゴリ設定
const CATS = {
  search: { label: "調べる", icon: "🔍", bg: "#E8F6F5", color: "#0D7377" },
  think:  { label: "考える", icon: "💭", bg: "#FFF9E6", color: "#8B6914" },
  listen: { label: "聞く",   icon: "🎤", bg: "#F3EEFF", color: "#5B21B6" },
  create: { label: "作る",   icon: "📝", bg: "#FDF2F8", color: "#9D174D" },
  data:   { label: "データ", icon: "📊", bg: "#ECFDF5", color: "#047857" },
  action: { label: "アクション", icon: "⚡", bg: "#FFF7ED", color: "#EA580C" }, // デフォルト
};

// UIモックに合わせたノードサイズ設定
const NS = {
  current: { w: 130, h: 88 },
  goal:    { w: 125, h: 125 },
  choice:  { w: 215, h: 90 }, // actionノードと同じ
  future:  { w: 185, h: 64 },
};

// エッジ描画関数
const nRight = (n: QuestNode) => { 
  const s = NS[n.type as keyof typeof NS] || NS.choice; 
  return [n.x + s.w, n.y + s.h / 2]; 
};

const nLeft = (n: QuestNode) => { 
  const s = NS[n.type as keyof typeof NS] || NS.choice; 
  return [n.x, n.y + s.h / 2]; 
};

const bezierPath = (fN: QuestNode, tN: QuestNode) => {
  const [sx, sy] = nRight(fN);
  const [ex, ey] = nLeft(tN);
  const dx = ex - sx;
  const cp = Math.max(55, Math.abs(dx) * 0.42);
  return `M${sx},${sy} C${sx + cp},${sy} ${ex - cp},${ey} ${ex},${ey}`;
};

const QuestMapCanvas: React.FC<QuestMapCanvasProps> = ({ 
  width = 1200, 
  height = 800 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentQuest = selectCurrentQuest();
  const ui = selectUIState();
  const { setSelectedNode, setNodeMenuOpen } = selectUIActions();
  const { updateNodePosition } = selectDataActions();
  const { completeNode, breakdownNode, expandNode } = selectQuestMapActions();
  
  // メニューの状態管理
  const [menuState, setMenuState] = useState<{
    isOpen: boolean;
    node: QuestNode | null;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    node: null,
    position: { x: 0, y: 0 },
  });

  // 詳細モーダルの状態管理
  const [detailState, setDetailState] = useState<{
    isOpen: boolean;
    node: QuestNode | null;
  }>({
    isOpen: false,
    node: null,
  });

  const [dimensions, setDimensions] = useState({ width, height });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    dragNode: QuestNode | null;
    dragOffset: { x: number; y: number };
    isPanning: boolean;
    panStart: { x: number; y: number; panX: number; panY: number };
  }>({
    isDragging: false,
    dragNode: null,
    dragOffset: { x: 0, y: 0 },
    isPanning: false,
    panStart: { x: 0, y: 0, panX: 0, panY: 0 },
  });

  // レスポンシブ対応
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      setDimensions({
        width: rect.width || width,
        height: rect.height || height,
      });
    }
  }, [width, height]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Wheel event with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      const newZoom = Math.max(0.35, Math.min(2.2, zoom + (event.deltaY > 0 ? -0.07 : 0.07)));
      setZoom(newZoom);
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelNative);
    };
  }, [zoom]);

  // ノードクリックハンドラー（左クリック：詳細表示）
  const handleNodeClick = useCallback((node: QuestNode, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (node.type === NodeType.CHOICE || node.type === NodeType.FUTURE) {
      console.log('Node clicked (left):', node);
      setSelectedNode(node.id);
      
      // 詳細モーダルを開く
      setDetailState({
        isOpen: true,
        node: node,
      });
    } else {
      setSelectedNode(node.id);
    }
  }, [setSelectedNode]);

  // ノード右クリックハンドラー（右クリック：メニュー表示）
  const handleNodeRightClick = useCallback((node: QuestNode, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (node.type === NodeType.CHOICE || node.type === NodeType.FUTURE) {
      console.log('Node clicked (right):', node);
      setSelectedNode(node.id);
      
      // メニュー表示位置を計算してストアに設定
      const rect = event.currentTarget.getBoundingClientRect();
      const position = {
        x: rect.right + 10,
        y: rect.top,
      };
      
      console.log('Opening node menu at position:', position);
      setNodeMenuOpen(true, position);
    }
  }, [setSelectedNode, setNodeMenuOpen]);
  
  // メニューを閉じる
  const handleCloseMenu = useCallback(() => {
    setMenuState({
      isOpen: false,
      node: null,
      position: { x: 0, y: 0 },
    });
  }, []);
  
  // ノード完了ハンドラ
  const handleCompleteNode = useCallback(async (nodeId: string) => {
    console.log('🎯 handleCompleteNode called:', nodeId);
    if (completeNode) {
      console.log('✅ Calling completeNode...');
      await completeNode(nodeId, {
        feedback: 'タスクを完了しました',
      });
    } else {
      console.error('❌ completeNode function is undefined!');
    }
    handleCloseMenu();
  }, [completeNode, handleCloseMenu]);
  
  // ノード細分化ハンドラ  
  const handleBreakdownNode = useCallback(async (nodeId: string) => {
    console.log('🔍 handleBreakdownNode called:', nodeId);
    if (breakdownNode) {
      console.log('🔍 Calling breakdownNode...');
      await breakdownNode(nodeId, {});
    } else {
      console.error('❌ breakdownNode function is undefined!');
    }
    handleCloseMenu();
  }, [breakdownNode, handleCloseMenu]);
  
  // ノード拡張ハンドラ
  const handleExpandNode = useCallback(async (nodeId: string) => {
    console.log('💡 handleExpandNode called:', nodeId);
    if (expandNode) {
      console.log('💡 Calling expandNode...');
      await expandNode(nodeId, {});
    } else {
      console.error('❌ expandNode function is undefined!');
    }
    handleCloseMenu();
  }, [expandNode, handleCloseMenu]);

  // マウスイベントハンドラー
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!currentQuest) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;
    const mapX = (clientX - pan.x) / zoom;
    const mapY = (clientY - pan.y) / zoom;

    // ノードのヒットテスト
    const hitNode = currentQuest.nodes.find(node => {
      const nodeSize = NS[node.type as keyof typeof NS] || NS.choice;
      return mapX >= node.x && mapX <= node.x + nodeSize.w &&
             mapY >= node.y && mapY <= node.y + nodeSize.h;
    });

    if (hitNode && (hitNode.type === NodeType.CHOICE || hitNode.type === NodeType.FUTURE)) {
      // ノードドラッグ開始（CHOICEとFUTUREノードのみ）
      setDragState({
        isDragging: true,
        dragNode: hitNode,
        dragOffset: { x: mapX - hitNode.x, y: mapY - hitNode.y },
        isPanning: false,
        panStart: { x: 0, y: 0, panX: 0, panY: 0 },
      });
    } else {
      // パン開始
      setDragState({
        isDragging: false,
        dragNode: null,
        dragOffset: { x: 0, y: 0 },
        isPanning: true,
        panStart: { x: clientX, y: clientY, panX: pan.x, panY: pan.y },
      });
      // メニューを閉じる
      handleCloseMenu();
      setNodeMenuOpen(false);
      setSelectedNode(null);
    }
  }, [currentQuest, pan, zoom, setNodeMenuOpen, setSelectedNode]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;

    if (dragState.isDragging && dragState.dragNode) {
      // ノードドラッグ中
      const mapX = (clientX - pan.x) / zoom;
      const mapY = (clientY - pan.y) / zoom;
      const newX = mapX - dragState.dragOffset.x;
      const newY = mapY - dragState.dragOffset.y;
      
      updateNodePosition(dragState.dragNode.id, { x: newX, y: newY });
    } else if (dragState.isPanning) {
      // パン中
      const deltaX = clientX - dragState.panStart.x;
      const deltaY = clientY - dragState.panStart.y;
      setPan({
        x: dragState.panStart.panX + deltaX,
        y: dragState.panStart.panY + deltaY,
      });
    }
  }, [dragState, pan, zoom, updateNodePosition]);

  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      dragNode: null,
      dragOffset: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0, panX: 0, panY: 0 },
    });
  }, []);

  // ノードレンダリング関数
  const renderNode = useCallback((node: QuestNode) => {
    const nodeSize = NS[node.type as keyof typeof NS] || NS.choice;
    const isSelected = ui.selectedNodeId === node.id;

    if (node.type === NodeType.CURRENT) {
      return (
        <div
          key={node.id}
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleNodeRightClick(node, e)}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: nodeSize.w,
            height: nodeSize.h,
            borderRadius: 16,
            background: 'linear-gradient(140deg, #34D399 0%, #059669 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            color: '#FFF',
            zIndex: 10,
            userSelect: 'none',
            boxShadow: '0 4px 16px rgba(5,150,105,0.3), 0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 2 }}>👤</div>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-jp)' }}>現在地</div>
        </div>
      );
    }

    if (node.type === NodeType.GOAL) {
      return (
        <div
          key={node.id}
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleNodeRightClick(node, e)}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: nodeSize.w,
            height: nodeSize.h,
            borderRadius: '50%',
            background: 'linear-gradient(140deg, #FFB088 0%, #F97316 60%, #EA580C 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            color: '#FFF',
            zIndex: 10,
            userSelect: 'none',
            boxShadow: '0 6px 24px rgba(249,115,22,0.35), 0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: 30, lineHeight: 1 }}>🏆</div>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-jp)', marginTop: 2 }}>ゴール</div>
        </div>
      );
    }

    if (node.type === NodeType.CHOICE) {
      const cat = CATS[node.category as keyof typeof CATS] || CATS.action;
      const isRec = node.isRecommended;
      const isDone = node.status === NodeStatus.COMPLETED;

      return (
        <div
          key={node.id}
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleNodeRightClick(node, e)}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: nodeSize.w,
            padding: '12px 14px',
            borderRadius: 12,
            background: isDone ? '#F7F7F7' : '#FFF',
            border: isRec ? '2.5px solid #FF8C5A' : isSelected ? '2px solid #4A90D9' : '1px solid #E8E8E8',
            boxShadow: isSelected ? '0 6px 20px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.08)',
            cursor: isDone ? 'default' : 'pointer',
            transform: isSelected ? 'translateY(-2px)' : 'none',
            transition: 'box-shadow 0.2s, transform 0.2s',
            zIndex: isSelected ? 50 : 5,
            userSelect: 'none',
            opacity: isDone ? 0.6 : 1,
          }}
        >
          {isRec && (
            <div style={{
              position: 'absolute',
              top: -11,
              right: 12,
              padding: '2px 10px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #FF8C5A, #F97316)',
              color: '#FFF',
              fontSize: 10,
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(249,115,22,0.3)',
              fontFamily: 'var(--font-jp)',
            }}>おすすめ</div>
          )}
          {isDone && (
            <div style={{
              position: 'absolute',
              top: -11,
              right: 12,
              padding: '2px 10px',
              borderRadius: 8,
              background: '#9CA3AF',
              color: '#FFF',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'var(--font-jp)',
            }}>✓ 完了</div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              flexShrink: 0,
              background: isDone ? '#ECECEC' : cat.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              marginTop: 1,
            }}>{cat.icon}</div>
            <div style={{
              fontSize: 13.5,
              fontWeight: 700,
              lineHeight: 1.4,
              color: isDone ? '#999' : '#1A1A2E',
              fontFamily: 'var(--font-jp)',
            }}>{node.title}</div>
          </div>
          <div style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 7,
            background: isDone ? '#ECECEC' : cat.bg,
            color: isDone ? '#999' : cat.color,
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: 'var(--font-jp)',
          }}>{cat.label}</div>
        </div>
      );
    }

    if (node.type === NodeType.FUTURE) {
      return (
        <div
          key={node.id}
          onClick={(e) => handleNodeClick(node, e)}
          onContextMenu={(e) => handleNodeRightClick(node, e)}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: nodeSize.w,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.55)',
            border: '1.5px dashed #C8C8C8',
            opacity: 0.55,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <div style={{ fontSize: 10, color: '#AAA', fontWeight: 600, marginBottom: 3, fontFamily: 'var(--font-en)', letterSpacing: '0.04em' }}>Future</div>
          <div style={{ fontSize: 12, color: '#777', fontWeight: 600, lineHeight: 1.35, fontFamily: 'var(--font-jp)' }}>{node.title}</div>
        </div>
      );
    }

    return null;
  }, [ui.selectedNodeId, handleNodeClick, handleNodeRightClick]);

  // エッジレンダリング関数
  const renderEdges = useCallback(() => {
    if (!currentQuest?.edges) return null;

    return currentQuest.edges.map(edge => {
      const sourceNode = currentQuest.nodes.find(n => n.id === edge.sourceId);
      const targetNode = currentQuest.nodes.find(n => n.id === edge.targetId);
      
      if (!sourceNode || !targetNode) return null;

      const path = bezierPath(sourceNode, targetNode);
      const isSolid = edge.type === 'solid';
      
      return (
        <path
          key={edge.id}
          d={path}
          fill="none"
          stroke={isSolid ? '#FF8C5A' : '#9A928A'}
          strokeWidth={isSolid ? 2.5 : 2}
          strokeDasharray={isSolid ? 'none' : '6 4'}
          strokeLinecap="round"
          opacity={isSolid ? 0.85 : 0.5}
          style={{ pointerEvents: 'none' }}
        />
      );
    });
  }, [currentQuest]);

  if (!currentQuest) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8A8A9A',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
        <div>クエストを作成してマップを表示しましょう</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: dragState.isPanning ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 変換レイヤー */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}>
        {/* SVGエッジ */}
        <svg
          width="4000"
          height="3000"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <marker id="as" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M0,1.5 L10,5 L0,8.5" fill="#FF8C5A" opacity="0.85" />
            </marker>
            <marker id="ad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0,2 L10,5 L0,8" fill="#9A928A" opacity="0.6" />
            </marker>
          </defs>
          {renderEdges()}
        </svg>

        {/* ノード */}
        {currentQuest.nodes.map(node => renderNode(node))}
      </div>
      
      {/* ノードメニュー - ストアベースのQuestMapNodeMenuを使用（右クリック） */}
      <QuestMapNodeMenu />
      
      {/* ノード詳細モーダル（左クリック） */}
      <QuestMapNodeDetail
        node={detailState.node}
        open={detailState.isOpen}
        onClose={() => {
          setDetailState({ isOpen: false, node: null });
        }}
        onComplete={async (nodeId) => {
          await completeNode(String(nodeId), { feedback: 'タスクを完了しました' });
          setDetailState({ isOpen: false, node: null });
        }}
      />
    </div>
  );
};

export default React.memo(QuestMapCanvas);