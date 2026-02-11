import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

export interface QuestCard {
  id: string;
  label: string;
  emoji: string;
  color: 'teal' | 'yellow' | 'purple' | 'pink' | 'green';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  questCards?: QuestCard[];
}

export interface ResponseStyle {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  prompts?: string[];
  customInstruction?: string;
}

interface ConversationState {
  conversationId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  processingStatus: string | null;
  fallbackUsed: boolean;
  fallbackModel: string | null;
}

interface ChatState {
  // Core message store - single source of truth
  messages: Message[];
  
  // Conversation management
  conversation: ConversationState;
  
  // UI state
  isChatOpen: boolean;
  isHydrated: boolean;
  isHistoryOpen: boolean;
  
  // Scroll behavior
  isUserScrolling: boolean;
  shouldAutoScroll: boolean;
  
  // Context management
  currentProjectId: string | null;
  currentMemoId: string | null;
  currentMemoTitle: string;
  currentMemoContent: string;
  chatPageId: string;
  
  // Message actions - direct store management
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  updateMessage: (id: string, content: string) => void;
  
  // Conversation actions
  setConversationId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean, messageId?: string | null) => void;
  setProcessingStatus: (status: string | null) => void;
  setFallbackInfo: (used: boolean, model: string | null) => void;
  
  // UI actions
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  setHistoryOpen: (open: boolean) => void;
  
  // Scroll actions
  setUserScrolling: (scrolling: boolean) => void;
  setShouldAutoScroll: (shouldScroll: boolean) => void;
  
  // Context actions
  setCurrentMemo: (projectId: string, memoId: string | null, title: string, content: string) => void;
  updateMemoContent: (title: string, content: string) => void;
  clearCurrentMemo: () => void;
  setCurrentProject: (projectId: string) => void;
}

// Selectors for performance optimization
export interface ChatSelectors {
  selectMessages: () => Message[];
  selectConversation: () => ConversationState;
  selectUIState: () => { isChatOpen: boolean; isHistoryOpen: boolean };
  selectScrollState: () => { isUserScrolling: boolean; shouldAutoScroll: boolean };
  selectCurrentMemo: () => { title: string; content: string; projectId: string | null; memoId: string | null };
}

// Utility functions for message management
const normalizeMessage = (message: Message): Message => ({
  ...message,
  timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp || Date.now()),
});

const sortMessages = (messages: Message[]): Message[] => {
  return [...messages].sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
    return timeA - timeB;
  });
};

const isDuplicateMessage = (existing: Message[], newMessage: Message): boolean => {
  return existing.some(msg => {
    // Same ID check
    if (msg.id === newMessage.id) return true;
    
    // Same content and role within 1 second
    if (msg.role === newMessage.role && msg.content === newMessage.content) {
      const msgTime = msg.timestamp instanceof Date ? msg.timestamp.getTime() : 0;
      const newMsgTime = newMessage.timestamp instanceof Date ? newMessage.timestamp.getTime() : 0;
      const timeDiff = Math.abs(msgTime - newMsgTime);
      return timeDiff < 1000; // Within 1 second
    }
    
    return false;
  });
};

export const useChatStore = create<ChatState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Core message state
        messages: [],
        
        // Conversation state
        conversation: {
          conversationId: null,
          isLoading: false,
          isStreaming: false,
          streamingMessageId: null,
          processingStatus: null,
          fallbackUsed: false,
          fallbackModel: null,
        },
        
        // UI state
        isChatOpen: false,
        isHydrated: false,
        isHistoryOpen: false,
        
        // Scroll state
        isUserScrolling: false,
        shouldAutoScroll: true,
        
        // Context state
        currentProjectId: null,
        currentMemoId: null,
        currentMemoTitle: '',
        currentMemoContent: '',
        chatPageId: '',
        
        // Message actions
        addMessage: (message: Message) => {
          set((state) => {
            const normalized = normalizeMessage(message);
            
            // Check for duplicates
            if (isDuplicateMessage(state.messages, normalized)) {
              return state;
            }
            
            // Add and sort messages
            const newMessages = sortMessages([...state.messages, normalized]);
            
            return {
              messages: newMessages,
              shouldAutoScroll: true, // Auto scroll on new message
            };
          });
        },
        
        setMessages: (messages: Message[]) => {
          set(() => ({
            messages: sortMessages(messages.map(normalizeMessage)),
            shouldAutoScroll: true,
          }));
        },
        
        clearMessages: () => {
          set(() => ({
            messages: [],
            shouldAutoScroll: true,
            isUserScrolling: false,
          }));
        },
        
        updateMessage: (id: string, content: string) => {
          set((state) => ({
            messages: state.messages.map(msg => 
              msg.id === id ? { ...msg, content } : msg
            ),
          }));
        },
        
        // Conversation actions
        setConversationId: (id: string | null) => {
          set((state) => ({
            conversation: {
              ...state.conversation,
              conversationId: id,
            },
          }));
        },
        
        setLoading: (loading: boolean) => {
          set((state) => ({
            conversation: {
              ...state.conversation,
              isLoading: loading,
            },
          }));
        },
        
        setStreaming: (streaming: boolean, messageId: string | null = null) => {
          set((state) => ({
            conversation: {
              ...state.conversation,
              isStreaming: streaming,
              streamingMessageId: messageId,
            },
          }));
        },

        setProcessingStatus: (status: string | null) => {
          set((state) => ({
            conversation: {
              ...state.conversation,
              processingStatus: status,
            },
          }));
        },

        setFallbackInfo: (used: boolean, model: string | null) => {
          set((state) => ({
            conversation: {
              ...state.conversation,
              fallbackUsed: used,
              fallbackModel: model,
            },
          }));
        },
        
        // UI actions
        setChatOpen: (open: boolean) => set({ isChatOpen: open }),
        
        toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
        
        setHistoryOpen: (open: boolean) => set({ isHistoryOpen: open }),
        
        // Scroll actions
        setUserScrolling: (scrolling: boolean) => set({ isUserScrolling: scrolling }),
        
        setShouldAutoScroll: (shouldScroll: boolean) => set({ shouldAutoScroll: shouldScroll }),
        
        // Context actions (with idempotency)
        setCurrentMemo: (projectId: string, memoId: string | null, title: string, content: string) => {
          const state = get();
          const chatPageId = `project-${projectId}`;
          
          // Idempotency check
          if (
            state.currentProjectId === projectId &&
            state.currentMemoId === memoId &&
            state.currentMemoTitle === title &&
            state.currentMemoContent === content &&
            state.chatPageId === chatPageId
          ) {
            return;
          }
          
          set({
            currentProjectId: projectId,
            currentMemoId: memoId,
            currentMemoTitle: title,
            currentMemoContent: content,
            chatPageId,
          });
        },
        
        updateMemoContent: (title: string, content: string) => {
          const state = get();
          
          // Idempotency check
          if (
            state.currentMemoTitle === title &&
            state.currentMemoContent === content
          ) {
            return;
          }
          
          set({
            currentMemoTitle: title,
            currentMemoContent: content,
          });
        },
        
        clearCurrentMemo: () => {
          set({
            currentMemoId: null,
            currentMemoTitle: '',
            currentMemoContent: '',
          });
        },
        
        setCurrentProject: (projectId: string) => {
          const state = get();
          const chatPageId = `project-${projectId}`;
          
          // Idempotency check
          if (
            state.currentProjectId === projectId &&
            state.chatPageId === chatPageId
          ) {
            return;
          }
          
          set({
            currentProjectId: projectId,
            chatPageId,
          });
        },
      }),
      {
        name: 'chat-storage',
        // Only persist UI state and context, not messages (loaded from DB)
        partialize: (state) => ({
          isChatOpen: state.isChatOpen,
          currentProjectId: state.currentProjectId,
          currentMemoId: state.currentMemoId,
          currentMemoTitle: state.currentMemoTitle,
          currentMemoContent: state.currentMemoContent,
          chatPageId: state.chatPageId,
          // conversationIdを永続化に追加
          conversation: {
            conversationId: state.conversation.conversationId,
          },
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isHydrated = true;
          }
        },
      }
    )
  )
);

// Performance optimized selectors
export const selectMessages = () => useChatStore((state) => state.messages, shallow);
export const selectConversation = () => useChatStore((state) => state.conversation, shallow);
export const selectUIState = () => useChatStore(
  (state) => ({ 
    isChatOpen: state.isChatOpen, 
    isHistoryOpen: state.isHistoryOpen 
  }), 
  shallow
);
export const selectScrollState = () => useChatStore(
  (state) => ({ 
    isUserScrolling: state.isUserScrolling, 
    shouldAutoScroll: state.shouldAutoScroll 
  }), 
  shallow
);
export const selectCurrentMemo = () => useChatStore(
  (state) => ({
    title: state.currentMemoTitle,
    content: state.currentMemoContent,
    projectId: state.currentProjectId,
    memoId: state.currentMemoId,
  }), 
  shallow
);

// Action selectors (don't change frequently, can be used directly)
export const selectMessageActions = () => useChatStore((state) => ({
  addMessage: state.addMessage,
  setMessages: state.setMessages,
  clearMessages: state.clearMessages,
  updateMessage: state.updateMessage,
}));

export const selectConversationActions = () => useChatStore((state) => ({
  setConversationId: state.setConversationId,
  setLoading: state.setLoading,
  setStreaming: state.setStreaming,
  setProcessingStatus: state.setProcessingStatus,
  setFallbackInfo: state.setFallbackInfo,
}));

export const selectUIActions = () => useChatStore((state) => ({
  setChatOpen: state.setChatOpen,
  toggleChat: state.toggleChat,
  setHistoryOpen: state.setHistoryOpen,
}));

export const selectScrollActions = () => useChatStore((state) => ({
  setUserScrolling: state.setUserScrolling,
  setShouldAutoScroll: state.setShouldAutoScroll,
})); 