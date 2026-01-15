import { useCallback, useRef, useEffect } from 'react';
import { selectScrollState, selectScrollActions } from '../stores/chatStore';

interface UseScrollBehaviorProps {
  messageListRef: React.RefObject<HTMLDivElement>;
}

export const useScrollBehavior = ({ messageListRef }: UseScrollBehaviorProps) => {
  const { isUserScrolling, shouldAutoScroll } = selectScrollState();
  const { setUserScrolling, setShouldAutoScroll } = selectScrollActions();
  const scrollTimeoutRef = useRef<number>();

  // Handle scroll events
  const handleScroll = useCallback(() => {
    setUserScrolling(true);
    
    const container = messageListRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
      
      // Set auto-scroll if scroll position is 90% or more to bottom
      setShouldAutoScroll(scrollPercentage > 0.9);
    }
    
    // Reset user scrolling flag after scroll stops
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      setUserScrolling(false);
    }, 150);
  }, [setUserScrolling, setShouldAutoScroll]);

  // Auto-scroll to bottom when needed
  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current;
    if (container && shouldAutoScroll && !isUserScrolling) {
      const scrollOptions: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      };
      
      // Use scrollIntoView on the last child for better behavior
      const lastChild = container.lastElementChild;
      if (lastChild) {
        lastChild.scrollIntoView(scrollOptions);
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [shouldAutoScroll, isUserScrolling]);

  // Auto-scroll on message changes
  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoScroll, isUserScrolling, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleScroll,
    scrollToBottom,
    isUserScrolling,
    shouldAutoScroll,
  };
};