// Main chat component
export { default as AIChat } from './AIChat';

// Core sub-components for chat functionality
export { default as ChatHeader } from './ChatHeader';
export { default as ChatMessage } from './ChatMessage';
export { default as ChatMessageList } from './ChatMessageList';
export { default as ChatInputArea } from './ChatInputArea';

// Supporting components
export { default as ChatHistory } from './ChatHistory';
export { default as QuestCards } from './QuestCards';
export { default as ResponseStyleSelector } from './ResponseStyleSelector';

// Legacy components
export { default as MemoChat } from './MemoChat';
export { default as WorkspaceWithAI } from './WorkspaceWithAI';

// Comprehensive type exports
export type {
  QuestCard,
  Message,
  ResponseStyle,
  AIChatProps,
  ChatHeaderProps,
  ChatMessageProps,
  ChatMessageListProps,
  ChatInputAreaProps,
  QuestCardsProps,
  ResponseStyleSelectorProps,
  ConversationData,
  ChatHistoryProps,
  LoadingFallbackProps,
  ChatAPIRequest,
  ChatAPIResponse
} from './types';

// Re-export for backward compatibility
export type { ResponseStyle as LegacyResponseStyle } from './ChatInputArea';