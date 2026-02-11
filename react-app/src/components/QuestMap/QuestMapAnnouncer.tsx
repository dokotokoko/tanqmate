import React, { useState, useEffect, useRef } from 'react';
import { Box, useTheme } from '@mui/material';

interface AnnouncementQueueItem {
  id: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: number;
}

interface QuestMapAnnouncerProps {
  className?: string;
}

// アナウンス管理クラス
class AnnouncementManager {
  private queue: AnnouncementQueueItem[] = [];
  private currentTimeout: NodeJS.Timeout | null = null;
  private callbacks: Set<(message: string, priority: string) => void> = new Set();

  // コールバック登録
  subscribe(callback: (message: string, priority: string) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // アナウンス追加
  announce(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    const announcement: AnnouncementQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      message: message.trim(),
      priority,
      timestamp: Date.now(),
    };

    // 緊急度に応じてキューの位置を決定
    switch (priority) {
      case 'urgent':
        // 緊急メッセージは最優先
        this.queue.unshift(announcement);
        break;
      case 'high':
        // 高優先度は緊急メッセージの後に挿入
        const urgentCount = this.queue.filter(item => item.priority === 'urgent').length;
        this.queue.splice(urgentCount, 0, announcement);
        break;
      case 'medium':
      case 'low':
      default:
        // 通常の優先度はキューの末尾に追加
        this.queue.push(announcement);
        break;
    }

    // 重複メッセージの除去（直近3秒以内の同じメッセージ）
    this.removeDuplicates();

    // 即座に処理を開始
    this.processQueue();
  }

  // 重複メッセージの除去
  private removeDuplicates() {
    const now = Date.now();
    const seen = new Set<string>();
    
    this.queue = this.queue.filter(item => {
      // 3秒以内の重複メッセージを除去
      if (now - item.timestamp < 3000 && seen.has(item.message)) {
        return false;
      }
      seen.add(item.message);
      return true;
    });
  }

  // キューの処理
  private processQueue() {
    if (this.queue.length === 0 || this.currentTimeout) {
      return;
    }

    const announcement = this.queue.shift();
    if (!announcement) return;

    // コールバック実行
    this.callbacks.forEach(callback => {
      callback(announcement.message, announcement.priority);
    });

    // 優先度に応じた遅延設定
    const delay = this.getDelayForPriority(announcement.priority);
    
    this.currentTimeout = setTimeout(() => {
      this.currentTimeout = null;
      this.processQueue(); // 次のアナウンスを処理
    }, delay);
  }

  // 優先度に応じた遅延時間の取得
  private getDelayForPriority(priority: string): number {
    switch (priority) {
      case 'urgent': return 100;   // 0.1秒
      case 'high': return 500;     // 0.5秒
      case 'medium': return 1000;  // 1秒
      case 'low': return 2000;     // 2秒
      default: return 1000;
    }
  }

  // キューのクリア
  clear() {
    this.queue = [];
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  // キューの状態取得
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.currentTimeout !== null,
    };
  }
}

// グローバルインスタンス
const globalAnnouncer = new AnnouncementManager();

// React Hook
export const useAnnouncer = () => {
  return {
    announce: (message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
      globalAnnouncer.announce(message, priority);
    },
    clear: () => globalAnnouncer.clear(),
    getStatus: () => globalAnnouncer.getQueueStatus(),
  };
};

const QuestMapAnnouncer: React.FC<QuestMapAnnouncerProps> = ({ className }) => {
  const theme = useTheme();
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [currentPriority, setCurrentPriority] = useState<string>('medium');
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = globalAnnouncer.subscribe((message, priority) => {
      setCurrentMessage(message);
      setCurrentPriority(priority);

      // 優先度に応じてaria-live領域を選択
      const isUrgent = priority === 'urgent' || priority === 'high';
      const targetRef = isUrgent ? assertiveRef : politeRef;
      
      if (targetRef.current) {
        // 一時的にメッセージをクリアしてから設定（スクリーンリーダーの確実な読み上げのため）
        targetRef.current.textContent = '';
        setTimeout(() => {
          if (targetRef.current) {
            targetRef.current.textContent = message;
          }
        }, 50);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <Box className={className} sx={{ position: 'absolute', left: -10000, top: 0 }}>
      {/* 通常のアナウンス用（polite） */}
      <div
        ref={politeRef}
        aria-live="polite"
        aria-atomic="true"
        role="status"
        style={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      
      {/* 緊急アナウンス用（assertive） */}
      <div
        ref={assertiveRef}
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        style={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      {/* デバッグ用（開発時のみ表示） */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 10,
            left: 10,
            background: alpha(theme.palette.background.paper, 0.9),
            color: theme.palette.text.primary,
            padding: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            maxWidth: 300,
            zIndex: 9999,
            border: `1px solid ${theme.palette.divider}`,
            display: currentMessage ? 'block' : 'none',
          }}
        >
          <Box sx={{ fontWeight: 'bold', mb: 0.5 }}>
            アナウンス ({currentPriority})
          </Box>
          <Box>{currentMessage}</Box>
        </Box>
      )}
    </Box>
  );
};

// 便利な関数をエクスポート
export const announceToUser = (message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
  globalAnnouncer.announce(message, priority);
};

export const clearAnnouncements = () => {
  globalAnnouncer.clear();
};

export default QuestMapAnnouncer;