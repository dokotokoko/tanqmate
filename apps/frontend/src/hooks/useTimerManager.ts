import { useRef, useCallback, useEffect } from 'react';

export const useTimerManager = () => {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a managed timeout
  const setManagedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  // Create a managed interval
  const setManagedInterval = useCallback((callback: () => void, interval: number) => {
    const timer = setInterval(callback, interval);
    timersRef.current.add(timer as any);
    return timer;
  }, []);

  // Clear specific timer
  const clearManagedTimer = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    timersRef.current.delete(timer);
  }, []);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timer => {
      clearTimeout(timer);
    });
    timersRef.current.clear();
  }, []);

  // Create abort controller for async operations
  const createAbortController = useCallback(() => {
    // Abort previous controller if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  }, []);

  // Get current abort signal
  const getAbortSignal = useCallback(() => {
    return abortControllerRef.current?.signal;
  }, []);

  // Cleanup all resources
  const cleanup = useCallback(() => {
    clearAllTimers();
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [clearAllTimers]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    setManagedTimeout,
    setManagedInterval,
    clearManagedTimer,
    clearAllTimers,
    createAbortController,
    getAbortSignal,
    cleanup,
  };
};