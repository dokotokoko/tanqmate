import React, { useRef, useEffect } from 'react';
import { NodeStatus } from '../../types/questMap';
import type { QuestNode } from '../../types/questMap';

interface QuestNodeMenuProps {
  node: QuestNode;
  position: { x: number; y: number };
  onClose: () => void;
  onComplete: (nodeId: string) => void;
  onBreakdown: (nodeId: string) => void;
  onExpand: (nodeId: string) => void;
}

const QuestNodeMenu: React.FC<QuestNodeMenuProps> = ({
  node,
  position,
  onClose,
  onComplete,
  onBreakdown,
  onExpand,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const menuItems = [
    {
      icon: '✅',
      label: '完了にする',
      action: () => {
        console.log('✅ Complete menu item clicked for node:', node.id);
        onComplete(node.id);
      },
      disabled: node.status === NodeStatus.COMPLETED,
      color: '#34D399',
    },
    {
      icon: '🔍',
      label: '細分化する',
      action: () => {
        console.log('🔍 Breakdown menu item clicked for node:', node.id);
        onBreakdown(node.id);
      },
      disabled: false,
      color: '#4A90D9',
    },
    {
      icon: '💡',
      label: '別の方法を探す',
      action: () => {
        console.log('💡 Expand menu item clicked for node:', node.id);
        onExpand(node.id);
      },
      disabled: false,
      color: '#F97316',
    },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)',
        padding: 8,
        minWidth: 180,
        fontFamily: 'var(--font-jp)',
      }}
    >
      {/* ノード情報 */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #F0F0F0',
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
          {node.title}
        </div>
        {node.description && (
          <div style={{ fontSize: 11, color: '#7A7A8A', lineHeight: 1.4 }}>
            {node.description.length > 50 
              ? node.description.substring(0, 50) + '...' 
              : node.description}
          </div>
        )}
      </div>

      {/* メニューアイテム */}
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            if (!item.disabled) {
              item.action();
              onClose();
            }
          }}
          disabled={item.disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: item.disabled ? '#F7F7F7' : 'transparent',
            borderRadius: 8,
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            textAlign: 'left',
            opacity: item.disabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.background = '#F5F5F5';
            }
          }}
          onMouseLeave={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span style={{ 
            fontSize: 13, 
            fontWeight: 500, 
            color: item.disabled ? '#9A9A9A' : '#3A3A4A',
            fontFamily: 'var(--font-jp)',
          }}>
            {item.label}
          </span>
        </button>
      ))}

      {/* AIコメント */}
      {node.aiComment && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            borderTop: '1px solid #F0F0F0',
            fontSize: 11,
            color: '#7A7A8A',
            lineHeight: 1.5,
          }}
        >
          💡 {node.aiComment}
        </div>
      )}
    </div>
  );
};

export default QuestNodeMenu;