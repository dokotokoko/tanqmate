import { useEffect, useCallback, useRef } from 'react';

interface EventHandler {
  (): void;
}

interface UseEventManagerProps {
  onNewChat?: EventHandler;
  onHistoryOpen?: EventHandler;
}

export const useEventManager = ({ onNewChat, onHistoryOpen }: UseEventManagerProps) => {
  const listenersRef = useRef<Map<string, EventHandler>>(new Map());

  // Register event listener
  const addEventListener = useCallback((eventName: string, handler: EventHandler) => {
    // Remove existing listener if any
    const existingHandler = listenersRef.current.get(eventName);
    if (existingHandler) {
      window.removeEventListener(eventName, existingHandler);
    }
    
    // Add new listener
    window.addEventListener(eventName, handler);
    listenersRef.current.set(eventName, handler);
    
    return () => {
      window.removeEventListener(eventName, handler);
      listenersRef.current.delete(eventName);
    };
  }, []);

  // Remove event listener
  const removeEventListener = useCallback((eventName: string) => {
    const handler = listenersRef.current.get(eventName);
    if (handler) {
      window.removeEventListener(eventName, handler);
      listenersRef.current.delete(eventName);
    }
  }, []);

  // Remove all event listeners
  const removeAllEventListeners = useCallback(() => {
    listenersRef.current.forEach((handler, eventName) => {
      window.removeEventListener(eventName, handler);
    });
    listenersRef.current.clear();
  }, []);

  // Dispatch custom event
  const dispatchCustomEvent = useCallback((eventName: string, detail?: any) => {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }, []);

  // Setup default chat events
  useEffect(() => {
    const cleanupFunctions: Array<() => void> = [];

    if (onNewChat) {
      const cleanup = addEventListener('newChatRequest', onNewChat);
      cleanupFunctions.push(cleanup);
    }

    if (onHistoryOpen) {
      const cleanup = addEventListener('historyOpenRequest', onHistoryOpen);
      cleanupFunctions.push(cleanup);
    }

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [onNewChat, onHistoryOpen, addEventListener]);

  // Cleanup all listeners on unmount
  useEffect(() => {
    return removeAllEventListeners;
  }, [removeAllEventListeners]);

  return {
    addEventListener,
    removeEventListener,
    removeAllEventListeners,
    dispatchCustomEvent,
  };
};