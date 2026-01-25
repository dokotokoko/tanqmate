// Core types for MemoChat components

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
  timestamp: Date | string | undefined | null;
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

// Component props interfaces
export interface AIChatProps {
  isDashboard?: boolean;
  title?: string;
  initialMessage?: string;
  initialAIResponse?: string;
  memoContent?: string;
  currentMemoContent?: string;
  currentMemoTitle?: string;
  onMessageSend?: (message: string, memoContent: string) => Promise<string>;
  onClose?: () => void;
  autoStart?: boolean;
  onOpenMemo?: () => void;
  showMemoButton?: boolean;
  hideMemoButton?: boolean;
  forceRefresh?: boolean;
  loadHistoryFromDB?: boolean;
  isInitializing?: boolean;
  persistentMode?: boolean;
}

export interface ChatHeaderProps {
  title?: string;
  onClose?: () => void;
  onOpenMemo?: () => void;
  onNewChat?: () => void;
  onOpenHistory?: () => void;
  showMemoButton?: boolean;
  hideMemoButton?: boolean;
  showCloseButton?: boolean;
  showHistoryButton?: boolean;
  showNewChatButton?: boolean;
}

export interface ChatMessageProps {
  message: Message;
  isLast: boolean;
  onQuestCardClick: (cardId: string, cardLabel: string) => void;
}

export interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  isInitializing?: boolean;
  isUserScrolling: boolean;
  shouldAutoScroll: boolean;
  onQuestCardClick: (cardId: string, cardLabel: string) => void;
  onScroll?: () => void;
}

export interface ChatInputAreaProps {
  inputValue: string;
  isLoading: boolean;
  responseStyle: ResponseStyle | null;
  processingStatus?: string | null;
  fallbackUsed?: boolean;
  fallbackModel?: string | null;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
  onStyleChange: (style: ResponseStyle) => void;
}

export interface QuestCardsProps {
  cards: QuestCard[];
  onCardClick: (cardId: string, cardLabel: string) => void;
}

export interface ResponseStyleSelectorProps {
  selectedStyle: ResponseStyle | null;
  onStyleChange: (style: ResponseStyle) => void;
}

// Chat History related types
export interface ConversationData {
  id: string;
  title: string | null;
  message_count: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  is_active: boolean;
}

export interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect: (session: ConversationData & { messages: any[] }) => void;
  currentPageId?: string;
}

// Loading and Error handling types
export interface LoadingFallbackProps {
  text?: string;
  height?: string | number;
}

// API related types
export interface ChatAPIRequest {
  message: string;
  context?: string;
  response_style?: string;
  custom_instruction?: string;
}

export interface ChatAPIResponse {
  response: string;
  conversation_id?: string;
}