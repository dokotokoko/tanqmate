import React, { useState, useEffect } from 'react';
import { tokenManager } from '../../utils/tokenManager';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  Clear as ClearIcon,
  Schedule as ScheduleIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Import types from shared types file
import type { ConversationData, ChatHistoryProps } from './types';

const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  onSessionSelect,
  currentPageId,
}) => {
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    conversationId: string;
  } | null>(null);

  // 会話リストを取得
  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Supabase Auth の access token を取得
      const token = tokenManager.getAccessToken();
      
      if (!token) {
        console.error('認証トークンが見つかりません');
        return;
      }

      // 新しい会話管理APIから会話リストを取得
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      console.log('🔍 API呼び出し開始:', {
        url: `${apiBaseUrl}/conversations?limit=50&is_active=true`,
        token: token.substring(0, 20) + '...' // ログ用にトークンの一部のみ表示
      });
      
      const response = await fetch(`${apiBaseUrl}/conversations?limit=50&is_active=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 API レスポンス:', result);
        
        const conversationList: ConversationData[] = result.conversations || [];
        
        console.log(`✅ 会話リスト取得成功:`, {
          total: conversationList.length,
          hasMore: result.has_more,
          totalCount: result.total_count,
          conversations: conversationList.slice(0, 5).map(c => ({
            id: c.id,
            title: c.title,
            message_count: c.message_count,
            is_active: c.is_active
          }))
        });

        setConversations(conversationList);
      } else {
        console.error('❌ 会話リスト取得エラー:', {
          status: response.status,
          statusText: response.statusText
        });
        
        // エラーレスポンスの内容も確認
        try {
          const errorData = await response.text();
          console.error('❌ エラーレスポンス内容:', errorData);
        } catch (e) {
          console.error('❌ エラーレスポンス読み取り失敗');
        }
      }
    } catch (error) {
      console.error('会話リスト取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 会話のメッセージを取得
  const fetchConversationMessages = async (conversationId: string): Promise<any[]> => {
    try {
      const token = tokenManager.getAccessToken();
      
      if (!token) {
        console.error('認証トークンが見つかりません');
        return [];
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}/messages?limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const messages = await response.json();
        return messages;
      } else {
        console.error('メッセージ取得エラー:', response.status);
        return [];
      }
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
      return [];
    }
  };

  // 会話削除
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const token = tokenManager.getAccessToken();
      
      if (!token) {
        console.error('認証トークンが見つかりません');
        return;
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        await fetchConversations(); // 会話リストを再取得
      } else {
        console.error('会話削除エラー:', response.status);
      }
    } catch (error) {
      console.error('会話削除エラー:', error);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  // 会話選択時の処理
  const handleConversationSelect = async (conversation: ConversationData) => {
    setSelectedConversation(conversation.id);
    console.log('🖱️ 会話選択:', {
      conversationId: conversation.id,
      title: conversation.title,
      messageCount: conversation.message_count
    });

    // メッセージを取得してonSessionSelectコールバックを呼び出し
    const messages = await fetchConversationMessages(conversation.id);
    
    onSessionSelect({
      ...conversation,
      messages: messages,
      conversation_id: conversation.id, // AIChat.tsxで使用
    });
  };

  // タイトル表示用の関数
  const getDisplayTitle = (conversation: ConversationData): string => {
    if (conversation.title && conversation.title !== 'untitled') {
      return conversation.title;
    }
    return '無題の会話';
  };

  // 時間フォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return '今';
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  // コンテキストメニューを開く
  const handleContextMenu = (event: React.MouseEvent, conversationId: string) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            conversationId,
          }
        : null,
    );
  };

  // コンテキストメニューを閉じる
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // 削除を実行
  const handleDeleteFromMenu = () => {
    if (contextMenu) {
      setConversationToDelete(contextMenu.conversationId);
      setDeleteDialogOpen(true);
      handleCloseContextMenu();
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '320px',
        height: '100vh',
        zIndex: 1300,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          borderRadius: 0,
        }}
      >
        {/* ヘッダー */}
        <Box sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              対話履歴
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <ClearIcon />
          </IconButton>
        </Box>

        {/* 会話リスト */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                読み込み中...
              </Typography>
            </Box>
          ) : conversations.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                まだ会話履歴がありません
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {conversations.map((conversation) => (
                <ListItem
                  key={conversation.id}
                  sx={{
                    px: 1,
                    py: 0.25,
                  }}
                  onContextMenu={(e) => handleContextMenu(e, conversation.id)}
                >
                  <ListItemButton
                    onClick={() => handleConversationSelect(conversation)}
                    selected={selectedConversation === conversation.id}
                    disableRipple
                    sx={{
                      borderRadius: '8px',
                      py: 1,
                      px: 1.5,
                      minHeight: 'auto',
                      transition: 'background 80ms ease-out, transform 60ms ease-out',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:active': {
                        transform: 'scale(0.985)',
                        backgroundColor: 'action.selected',
                        transition: 'background 0ms, transform 0ms',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                        '&:hover': {
                          backgroundColor: 'action.selected',
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: '2px',
                          backgroundColor: 'primary.main',
                          borderRadius: '0 2px 2px 0',
                        },
                      },
                    }}
                  >
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* タイトル行（アイコン、タイトル、日付） */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ChatIcon sx={{ fontSize: '1rem', color: 'primary.main', flexShrink: 0 }} />
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          sx={{ 
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getDisplayTitle(conversation)}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.disabled"
                          sx={{ flexShrink: 0 }}
                        >
                          {formatTime(conversation.updated_at)}
                        </Typography>
                      </Box>
                      
                      {/* 最後のメッセージ（存在する場合） */}
                      {conversation.last_message && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: '1rem', flexShrink: 0 }} /> {/* アイコン分のスペーサー */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.3,
                              flex: 1,
                            }}
                          >
                            {conversation.last_message}
                          </Typography>
                          <Chip
                            label={conversation.message_count}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.65rem', 
                              height: '16px',
                              '& .MuiChip-label': {
                                px: 0.5,
                              }
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* 右クリックメニュー */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        sx={{
          '& .MuiPaper-root': {
            minWidth: 120,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }
        }}
      >
        <MenuItem 
          onClick={handleDeleteFromMenu}
          sx={{
            fontSize: '0.875rem',
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText',
            }
          }}
        >
          <DeleteIcon sx={{ fontSize: '1rem', mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 会話削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>会話を削除</DialogTitle>
        <DialogContent>
          <Typography>
            この会話を削除しますか？この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default ChatHistory;
