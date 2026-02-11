import React, { useCallback, useState } from 'react';
import { 
  selectUIState, 
  selectUIActions, 
  selectSelectedNode,
  selectQuestMapActions,
  selectIsLoading 
} from '../../stores/questMapStore';
import { NodeStatus, NodeType } from '../../types/questMap';

interface QuestMapNodeMenuProps {
  anchorPosition?: { x: number; y: number } | null;
  open?: boolean;
  onClose?: () => void;
}

const QuestMapNodeMenu: React.FC<QuestMapNodeMenuProps> = ({ 
  anchorPosition: externalPosition,
  open: externalOpen,
  onClose: externalOnClose 
}) => {
  console.log('QuestMapNodeMenu: Component rendering');
  console.log('Props:', { externalPosition, externalOpen, externalOnClose });
  
  const ui = selectUIState();
  const selectedNode = selectSelectedNode();
  const { 
    setNodeMenuOpen, 
    setCompletionModalOpen, 
    setConsultModalOpen 
  } = selectUIActions();
  const { 
    breakdownNode, 
    expandNode 
  } = selectQuestMapActions();
  const isLoading = selectIsLoading();
  
  console.log('Store state:', {
    ui,
    selectedNode,
    isLoading
  });

  // 外部から制御される場合とストアから制御される場合の両方をサポート
  const isOpen = externalOpen !== undefined ? externalOpen : ui.showNodeMenu;
  const position = externalPosition !== undefined ? externalPosition : ui.nodeMenuPosition;
  const handleClose = externalOnClose || (() => setNodeMenuOpen(false));

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // メニューアクション
  const handleAction = useCallback(async (action: string) => {
    console.log(`QuestMapNodeMenu: handleAction called with action: ${action}`);
    console.log('Selected node:', selectedNode);
    
    if (!selectedNode) {
      console.warn('No selected node, returning');
      return;
    }

    try {
      setLoadingAction(action);
      console.log(`Executing action: ${action} for node ${selectedNode.id}`);
      
      switch (action) {
        case 'ai':
          console.log('Opening AI consultation modal');
          setConsultModalOpen(true);
          break;
        case 'breakdown':
          console.log('Calling breakdownNode with nodeId:', selectedNode.id);
          await breakdownNode(selectedNode.id);
          console.log('breakdownNode completed successfully');
          break;
        case 'expand':
          console.log('Calling expandNode with nodeId:', selectedNode.id);
          await expandNode(selectedNode.id);
          console.log('expandNode completed successfully');
          break;
        case 'complete':
          console.log('Opening completion modal');
          setCompletionModalOpen(true);
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
      
      console.log('Closing menu after action');
      handleClose();
    } catch (error) {
      console.error(`Failed to execute ${action}:`, error);
      console.error('Error details:', error);
    } finally {
      setLoadingAction(null);
    }
  }, [selectedNode, setConsultModalOpen, setCompletionModalOpen, breakdownNode, expandNode, handleClose]);

  console.log('Render conditions:', {
    selectedNode: !!selectedNode,
    position: !!position,
    isOpen,
    willRender: !(!selectedNode || !position || !isOpen)
  });

  if (!selectedNode || !position || !isOpen) {
    console.log('QuestMapNodeMenu: Not rendering due to conditions');
    return null;
  }
  
  console.log('QuestMapNodeMenu: Rendering menu UI');

  // UIモックに基づいたメニュー項目
  const items = [
    { key: "ai", icon: "💬", label: "AIに相談・質問" },
    { key: "breakdown", icon: "🔍", label: "細分化" },
    { key: "expand", icon: "🌐", label: "拡散" },
    { key: "complete", icon: "✅", label: "完了する" },
  ];

  // UIモック風のスタイルでレンダリング
  return (
    <div 
      onClick={e => e.stopPropagation()} 
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: position.x + 12,
        top: position.y - 76,
        width: 192,
        background: '#FFF',
        borderRadius: 14,
        boxShadow: '0 6px 28px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.06)',
        padding: '6px 0',
        zIndex: 200,
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {items.map((it, i) => (
        <button 
          key={it.key}
          onClick={(e) => {
            console.log(`Button clicked: ${it.label} (${it.key})`);
            e.preventDefault();
            e.stopPropagation();
            handleAction(it.key);
          }}
          onMouseDown={e => {
            console.log(`MouseDown on button: ${it.key}`);
            e.stopPropagation();
          }}
          disabled={loadingAction === it.key || isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '11px 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: it.key === 'complete' ? '#059669' : '#444',
            fontFamily: 'var(--font-jp)',
            textAlign: 'left',
            borderTop: i > 0 ? '1px solid #F5F5F5' : 'none',
            transition: 'background-color 0.2s',
            opacity: (loadingAction === it.key || isLoading) ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loadingAction && !isLoading) {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: 15, width: 22, textAlign: 'center' }}>{it.icon}</span>
          {it.label}
          {loadingAction === it.key && (
            <div style={{
              marginLeft: 'auto',
              width: 12,
              height: 12,
              border: '2px solid #ddd',
              borderTopColor: '#666',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          )}
        </button>
      ))}
      
      {/* CSS アニメーション */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(QuestMapNodeMenu);