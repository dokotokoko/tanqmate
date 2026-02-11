import React, { useEffect, useCallback, useRef } from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import { useHotkeys } from 'react-hotkeys-hook';
import type { QuestNode, QuestEdge } from '../../types/questMap';

interface AccessibilityProps {
  nodes: QuestNode[];
  edges: QuestEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeActivate: (nodeId: string) => void;
  onMenuOpen: (nodeId: string) => void;
  onZoom: (direction: 'in' | 'out') => void;
  onCenter: () => void;
  onAnnounce: (message: string) => void;
  reduceMotion?: boolean;
}

// アクセシビリティ用のアナウンスメッセージ
const ANNOUNCE_MESSAGES = {
  nodeSelected: (node: QuestNode) => 
    `${node.title}を選択しました。${node.type}タイプ、${node.status}状態です。`,
  nodeActivated: (node: QuestNode) => 
    `${node.title}を開きました。詳細情報を確認できます。`,
  menuOpened: (node: QuestNode) => 
    `${node.title}のメニューを開きました。利用可能なアクションを選択してください。`,
  zoomedIn: () => 'ズームインしました。',
  zoomedOut: () => 'ズームアウトしました。',
  centered: () => 'マップを中央に配置しました。',
  navigationHelp: () => '矢印キーでノード間を移動、Enterで選択、Spaceでメニューを開きます。',
};

const QuestMapAccessibility: React.FC<AccessibilityProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeActivate,
  onMenuOpen,
  onZoom,
  onCenter,
  onAnnounce,
  reduceMotion = false,
}) => {
  const theme = useTheme();
  const currentIndex = useRef<number>(-1);

  // 選択中のノードのインデックスを更新
  useEffect(() => {
    if (selectedNodeId) {
      const index = nodes.findIndex(node => node.id === selectedNodeId);
      currentIndex.current = index;
    } else {
      currentIndex.current = -1;
    }
  }, [selectedNodeId, nodes]);

  // 次のノードに移動
  const moveToNextNode = useCallback((direction: 'next' | 'previous' | 'up' | 'down' | 'left' | 'right') => {
    if (nodes.length === 0) return;

    let newIndex: number;

    switch (direction) {
      case 'next':
        newIndex = currentIndex.current < nodes.length - 1 ? currentIndex.current + 1 : 0;
        break;
      case 'previous':
        newIndex = currentIndex.current > 0 ? currentIndex.current - 1 : nodes.length - 1;
        break;
      case 'up':
      case 'down':
      case 'left':
      case 'right':
        // 位置ベースのナビゲーション（簡易実装）
        if (currentIndex.current === -1) {
          newIndex = 0;
        } else {
          const currentNode = nodes[currentIndex.current];
          const candidates = nodes.filter((_, index) => index !== currentIndex.current);
          
          // 方向に基づいて最適なノードを選択
          const targetNode = findClosestNodeInDirection(currentNode, candidates, direction);
          newIndex = targetNode ? nodes.findIndex(n => n.id === targetNode.id) : 0;
        }
        break;
      default:
        newIndex = 0;
    }

    const targetNode = nodes[newIndex];
    if (targetNode) {
      onNodeSelect(targetNode.id);
      currentIndex.current = newIndex;
      onAnnounce(ANNOUNCE_MESSAGES.nodeSelected(targetNode));
    }
  }, [nodes, onNodeSelect, onAnnounce]);

  // 方向に基づいて最も近いノードを見つける（簡易実装）
  const findClosestNodeInDirection = (
    currentNode: QuestNode, 
    candidates: QuestNode[], 
    direction: 'up' | 'down' | 'left' | 'right'
  ): QuestNode | null => {
    if (!currentNode.position || candidates.length === 0) {
      return candidates[0] || null;
    }

    const { x: currentX, y: currentY } = currentNode.position;
    
    const validCandidates = candidates.filter(node => {
      if (!node.position) return false;
      const { x, y } = node.position;
      
      switch (direction) {
        case 'up': return y < currentY;
        case 'down': return y > currentY;
        case 'left': return x < currentX;
        case 'right': return x > currentX;
        default: return true;
      }
    });

    if (validCandidates.length === 0) {
      return candidates[0] || null;
    }

    // 最も近い候補を選択
    return validCandidates.reduce((closest, candidate) => {
      if (!closest.position || !candidate.position) return candidate;
      
      const closestDistance = Math.sqrt(
        Math.pow(closest.position.x - currentX, 2) + 
        Math.pow(closest.position.y - currentY, 2)
      );
      
      const candidateDistance = Math.sqrt(
        Math.pow(candidate.position.x - currentX, 2) + 
        Math.pow(candidate.position.y - currentY, 2)
      );
      
      return candidateDistance < closestDistance ? candidate : closest;
    });
  };

  // 現在選択中のノードを取得
  const getCurrentNode = useCallback((): QuestNode | null => {
    return selectedNodeId ? nodes.find(node => node.id === selectedNodeId) || null : null;
  }, [nodes, selectedNodeId]);

  // キーボードショートカットの設定
  useHotkeys('arrowup', (e) => {
    e.preventDefault();
    moveToNextNode('up');
  }, { enableOnContentEditable: true });

  useHotkeys('arrowdown', (e) => {
    e.preventDefault();
    moveToNextNode('down');
  }, { enableOnContentEditable: true });

  useHotkeys('arrowleft', (e) => {
    e.preventDefault();
    moveToNextNode('left');
  }, { enableOnContentEditable: true });

  useHotkeys('arrowright', (e) => {
    e.preventDefault();
    moveToNextNode('right');
  }, { enableOnContentEditable: true });

  useHotkeys('tab', (e) => {
    e.preventDefault();
    moveToNextNode('next');
  }, { enableOnContentEditable: true });

  useHotkeys('shift+tab', (e) => {
    e.preventDefault();
    moveToNextNode('previous');
  }, { enableOnContentEditable: true });

  useHotkeys('enter', (e) => {
    e.preventDefault();
    const currentNode = getCurrentNode();
    if (currentNode) {
      onNodeActivate(currentNode.id);
      onAnnounce(ANNOUNCE_MESSAGES.nodeActivated(currentNode));
    }
  }, { enableOnContentEditable: true });

  useHotkeys('space', (e) => {
    e.preventDefault();
    const currentNode = getCurrentNode();
    if (currentNode) {
      onMenuOpen(currentNode.id);
      onAnnounce(ANNOUNCE_MESSAGES.menuOpened(currentNode));
    }
  }, { enableOnContentEditable: true });

  useHotkeys('escape', (e) => {
    e.preventDefault();
    onNodeSelect(null);
    onAnnounce('選択を解除しました。');
  }, { enableOnContentEditable: true });

  useHotkeys('plus', (e) => {
    e.preventDefault();
    onZoom('in');
    onAnnounce(ANNOUNCE_MESSAGES.zoomedIn());
  }, { enableOnContentEditable: true });

  useHotkeys('minus', (e) => {
    e.preventDefault();
    onZoom('out');
    onAnnounce(ANNOUNCE_MESSAGES.zoomedOut());
  }, { enableOnContentEditable: true });

  useHotkeys('c', (e) => {
    e.preventDefault();
    onCenter();
    onAnnounce(ANNOUNCE_MESSAGES.centered());
  }, { enableOnContentEditable: true });

  useHotkeys('h,f1', (e) => {
    e.preventDefault();
    onAnnounce(ANNOUNCE_MESSAGES.navigationHelp());
  }, { enableOnContentEditable: true });

  // 初回フォーカス時のガイダンス
  useEffect(() => {
    if (nodes.length > 0 && currentIndex.current === -1) {
      // 最初のノードを自動選択（オプション）
      const firstNode = nodes[0];
      if (firstNode) {
        onNodeSelect(firstNode.id);
        onAnnounce(`探Qマップが読み込まれました。${nodes.length}個のクエストノードがあります。${ANNOUNCE_MESSAGES.navigationHelp()}`);
      }
    }
  }, [nodes, onNodeSelect, onAnnounce]);

  return (
    <Box
      role="application"
      aria-label="探Qマップ - インタラクティブなクエスト学習マップ"
      aria-describedby="questmap-instructions"
      tabIndex={0}
      sx={{
        position: 'absolute',
        inset: 0,
        outline: 'none',
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: -2,
        },
      }}
    >
      {/* スクリーンリーダー向けの説明 */}
      <Box
        id="questmap-instructions"
        sx={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        <p>
          探Qマップへようこそ。このマップでは、学習クエストが視覚的に表示されています。
          矢印キーでノード間を移動し、Enterキーで選択、Spaceキーでメニューを開くことができます。
          現在{nodes.length}個のクエストノードと{edges.length}個の接続があります。
        </p>
        <p>
          キーボードショートカット: 
          矢印キー（ノード移動）、Enter（選択）、Space（メニュー）、Escape（選択解除）、
          +/-（ズーム）、C（中央配置）、H（ヘルプ）
        </p>
      </Box>

      {/* フォーカスインジケーター */}
      {selectedNodeId && (
        <Box
          aria-live="polite"
          aria-atomic="true"
          sx={{
            position: 'absolute',
            left: -10000,
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
        >
          {(() => {
            const currentNode = getCurrentNode();
            return currentNode ? `現在の選択: ${currentNode.title}` : '';
          })()}
        </Box>
      )}

      {/* ライブ領域（アナウンス用） */}
      <Box
        aria-live="assertive"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
        role="status"
      />

      {/* 高コントラストモード用のスタイル */}
      {theme.palette.mode === 'dark' && (
        <style>
          {`
            @media (prefers-contrast: high) {
              .quest-node {
                border: 3px solid ${theme.palette.common.white} !important;
              }
              .quest-node.selected {
                border: 3px solid ${theme.palette.warning.main} !important;
                background-color: ${alpha(theme.palette.warning.main, 0.2)} !important;
              }
              .quest-edge {
                stroke: ${theme.palette.common.white} !important;
                stroke-width: 3px !important;
              }
            }
          `}
        </style>
      )}

      {/* 動きの軽減モード */}
      {reduceMotion && (
        <style>
          {`
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          `}
        </style>
      )}
    </Box>
  );
};

export default QuestMapAccessibility;