import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoScrollProps {
  messages: any[];
  containerRef: React.RefObject<HTMLDivElement>;
  isUserMessage?: boolean; // ユーザーがメッセージを送信したか
}

interface UseAutoScrollReturn {
  handleScroll: () => void;
  scrollToBottom: () => void;
}

const THRESHOLD_PX = 50; // 下端からこのピクセル以内なら「最下部にいる」と判定

export const useAutoScroll = ({ 
  messages, 
  containerRef,
  isUserMessage = false 
}: UseAutoScrollProps): UseAutoScrollReturn => {
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  
  // スクロール位置判定
  const checkIfAtBottom = useCallback((): boolean => {
    if (!containerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= THRESHOLD_PX;
  }, [containerRef]);
  
  // 最下部へスクロール
  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;
    
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    });
  }, [containerRef]);
  
  // スクロールイベントハンドラー
  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom();
    isAtBottomRef.current = atBottom;
  }, [checkIfAtBottom]);
  
  // メッセージ変更時の処理
  useEffect(() => {
    // メッセージ数に変化がない場合はスキップ
    if (messages.length === prevMessageCountRef.current) return;
    
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;
    
    if (!isNewMessage) return; // メッセージが減った場合は何もしない
    
    // 条件に応じてスクロール
    if (isUserMessage || isAtBottomRef.current) {
      // ユーザーがメッセージを送信 OR 最下部付近にいる
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages.length, isUserMessage, scrollToBottom]);
  
  // 初回マウント時は最下部へ
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [scrollToBottom]);
  
  return {
    handleScroll,
    scrollToBottom,
  };
};