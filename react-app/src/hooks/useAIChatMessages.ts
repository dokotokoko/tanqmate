/**
 * @deprecated This hook has been replaced by direct Zustand store usage.
 * Use the chatStore selectors and actions instead:
 * 
 * import { 
 *   selectMessages, 
 *   selectMessageActions,
 *   useChatStore 
 * } from '../stores/chatStore';
 * 
 * // Usage:
 * const messages = selectMessages();
 * const { addMessage, setMessages, clearMessages } = selectMessageActions();
 */

// This file is kept for reference but should not be used.
// All functionality has been moved to the chatStore.