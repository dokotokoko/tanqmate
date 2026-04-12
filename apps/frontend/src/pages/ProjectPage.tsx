import React, { memo, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  TextField,
  ClickAwayListener,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import projectPageService, {
  type ProjectPageMemo as Memo,
  type ProjectPageProject as Project,
  type ProjectPageProjectPayload,
} from '../services/project-page/projectPageService';
import { borderRadius, colors, shadows } from '../styles/design-system';

const ProjectPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuthStore();
  const { isChatOpen, toggleChat, setCurrentProject } = useChatStore();

  const [project, setProject] = useState<Project | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [editingField, setEditingField] = useState<'question' | 'hypothesis' | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const loadProject = async () => {
    if (!projectId) {
      return;
    }

    const data = await projectPageService.getProject(projectId);
    setProject(data);
  };

  const loadMemos = async () => {
    if (!projectId) {
      return;
    }

    const data = await projectPageService.getProjectMemos(projectId);
    setMemos(data);
  };

  const refreshProject = async () => {
    if (!projectId) {
      return;
    }

    try {
      const data = await projectPageService.getProject(projectId);
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const refreshMemos = async () => {
    if (!projectId) {
      return;
    }

    try {
      const data = await projectPageService.getProjectMemos(projectId);
      setMemos(data);
    } catch (error) {
      console.error('Error fetching memos:', error);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadInitialData = async () => {
      setIsLoading(true);
      setProject(null);
      setMemos([]);

      const [projectResult, memoResult] = await Promise.allSettled([loadProject(), loadMemos()]);

      if (isCancelled) {
        return;
      }

      if (projectResult.status === 'rejected') {
        console.error('Error fetching project:', projectResult.reason);
      }

      if (memoResult.status === 'rejected') {
        console.error('Error fetching memos:', memoResult.reason);
      }

      setIsLoading(false);
    };

    void loadInitialData();
    setCurrentProject(projectId);

    return () => {
      isCancelled = true;
    };
  }, [projectId, setCurrentProject]);

  useEffect(() => {
    if (user && !isChatOpen) {
      const timerId = window.setTimeout(() => toggleChat(), 500);
      return () => window.clearTimeout(timerId);
    }

    return undefined;
  }, [user, isChatOpen, toggleChat]);

  const updateProject = async (field: 'question' | 'hypothesis', value: string) => {
    if (!project || !projectId) {
      return;
    }

    const updateData: ProjectPageProjectPayload = {
      theme: project.theme,
      question: field === 'question' ? value : project.question,
      hypothesis: field === 'hypothesis' ? value : project.hypothesis,
    };

    try {
      await projectPageService.updateProject(projectId, updateData);
      await refreshProject();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const startEditing = (field: 'question' | 'hypothesis') => {
    setEditingField(field);
    setEditingValue(project?.[field] || '');
  };

  const saveEdit = async () => {
    if (editingField && editingValue.trim() !== (project?.[editingField] || '')) {
      await updateProject(editingField, editingValue.trim());
    }
    setEditingField(null);
    setEditingValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  const handleCreateMemo = async () => {
    if (!projectId) {
      return;
    }

    try {
      const newMemo = await projectPageService.createProjectMemo(projectId, {
        title: '',
        content: '',
      });

      await refreshMemos();
      navigate(`/app/projects/${projectId}/memos/${newMemo.id}`);
    } catch (error) {
      console.error('Error creating memo:', error);
    }
  };

  const handleDeleteMemo = async (memoId: number) => {
    if (!window.confirm('このメモを削除しますか？')) return;

    try {
      await projectPageService.deleteMemo(memoId);
      await refreshMemos();
      setMenuAnchor(null);
      setSelectedMemo(null);
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, memo: Memo) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedMemo(memo);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMemo(null);
  };

  const getContentPreview = (content: string): string => {
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();

    return cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent;
  };

  const getGridColumns = () => {
    if (isMobile) {
      return 1;
    }

    if (isChatOpen) {
      return 2;
    }

    return 3;
  };

  const getGridItemProps = () => {
    const columns = getGridColumns();
    if (isMobile) {
      return { xs: 12 };
    }

    if (columns === 2) {
      return { xs: 12, sm: 6, md: 6 };
    }

    return { xs: 12, sm: 6, md: 4 };
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography sx={{ color: colors.text.secondary }}>読み込み中...</Typography>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography sx={{ color: colors.text.secondary }}>プロジェクトが見つかりません</Typography>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 600, color: colors.text.primary }}>
              探究プロジェクト
            </Typography>
            <Button
              variant="contained"
              startIcon={<PsychologyIcon />}
              onClick={toggleChat}
              sx={{
                backgroundColor: colors.accentWarm.main,
                color: colors.text.inverse,
                '&:hover': {
                  backgroundColor: colors.accentWarm.hover,
                  boxShadow: shadows.accent,
                },
                borderRadius: borderRadius.button,
                px: 3,
                py: 1.5,
              }}
            >
              AIアシスタント
            </Button>
          </Box>

          {project && (
            <Card sx={{ mb: 4, borderRadius: borderRadius.card, backgroundColor: colors.background.paper, border: `1px solid ${colors.border.soft}`, boxShadow: shadows.card.default }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: colors.text.primary }}>
                  {project.theme}
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: colors.text.primary }}>
                    問い
                  </Typography>
                  {editingField === 'question' ? (
                    <ClickAwayListener onClickAway={saveEdit}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          fullWidth
                          value={editingValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setEditingValue(e.target.value)
                          }
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          multiline
                          rows={2}
                        />
                        <IconButton onClick={saveEdit} color="primary">
                          <CheckIcon />
                        </IconButton>
                        <IconButton onClick={cancelEdit}>
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    </ClickAwayListener>
                  ) : (
                    <Box
                      onClick={() => startEditing('question')}
                      sx={{
                        p: 2,
                        border: `1px dashed ${colors.border.soft}`,
                        borderRadius: borderRadius.md,
                        cursor: 'pointer',
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: colors.background.subtle,
                        '&:hover': {
                          backgroundColor: colors.accentWarm.soft,
                        },
                      }}
                    >
                      <Typography color={project.question ? colors.text.primary : colors.text.secondary}>
                        {project.question || 'クリックして問いを設定...'}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: colors.text.primary }}>
                    仮説
                  </Typography>
                  {editingField === 'hypothesis' ? (
                    <ClickAwayListener onClickAway={saveEdit}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          fullWidth
                          value={editingValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                            setEditingValue(e.target.value)
                          }
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                          multiline
                          rows={2}
                        />
                        <IconButton onClick={saveEdit} color="primary">
                          <CheckIcon />
                        </IconButton>
                        <IconButton onClick={cancelEdit}>
                          <CloseIcon />
                        </IconButton>
                      </Box>
                    </ClickAwayListener>
                  ) : (
                    <Box
                      onClick={() => startEditing('hypothesis')}
                      sx={{
                        p: 2,
                        border: `1px dashed ${colors.border.soft}`,
                        borderRadius: borderRadius.md,
                        cursor: 'pointer',
                        minHeight: 60,
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: colors.background.subtle,
                        '&:hover': {
                          backgroundColor: colors.accentWarm.soft,
                        },
                      }}
                    >
                      <Typography color={project.hypothesis ? colors.text.primary : colors.text.secondary}>
                        {project.hypothesis || 'クリックして仮説を設定...'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: colors.text.primary }}>
              メモ
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateMemo}
              sx={{
                backgroundColor: colors.accentWarm.main,
                color: colors.text.inverse,
                '&:hover': {
                  backgroundColor: colors.accentWarm.hover,
                  boxShadow: shadows.accent,
                },
                borderRadius: borderRadius.button,
              }}
            >
              新しいメモ
            </Button>
          </Box>

          <Grid container spacing={3}>
            <AnimatePresence>
              {memos.map((memo: Memo) => (
                <Grid item {...getGridItemProps()} key={memo.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        backgroundColor: colors.background.paper,
                        border: `1px solid ${colors.border.soft}`,
                        borderRadius: borderRadius.card,
                        boxShadow: shadows.card.default,
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: shadows.card.hover,
                          borderColor: colors.border.warm,
                        },
                      }}
                      onClick={() => navigate(`/app/projects/${projectId}/memos/${memo.id}`)}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            mb: 2,
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1, pr: 1, color: colors.text.primary }}>
                            {memo.title}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e: React.MouseEvent<HTMLElement>) => handleMenuOpen(e, memo)}
                            sx={{ opacity: 0.7, color: colors.text.muted, '&:hover': { opacity: 1, backgroundColor: colors.background.subtle, color: colors.text.secondary } }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.5,
                            minHeight: '3.5em',
                            color: colors.text.secondary,
                          }}
                        >
                          {getContentPreview(memo.content)}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                          <DescriptionIcon fontSize="small" sx={{ color: colors.text.muted }} />
                          <Typography variant="caption" color="text.secondary" sx={{ color: colors.text.muted }}>
                            {new Date(memo.updated_at).toLocaleDateString('ja-JP')}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>

          {memos.length === 0 && !isLoading && (
            <Box sx={{ textAlign: 'center', py: 8, backgroundColor: colors.background.paper, border: `1px solid ${colors.border.soft}`, borderRadius: borderRadius.card }}>
              <DescriptionIcon sx={{ fontSize: 64, color: colors.text.muted, mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ color: colors.text.primary }}>
                まだメモがありません
              </Typography>
              <Typography variant="body2" sx={{ mb: 3, color: colors.text.secondary }}>
                新しいメモを作成して、探究の記録を始めましょう
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateMemo}
                sx={{
                  backgroundColor: colors.accentWarm.main,
                  color: colors.text.inverse,
                  '&:hover': {
                    backgroundColor: colors.accentWarm.hover,
                    boxShadow: shadows.accent,
                  },
                  borderRadius: borderRadius.button,
                }}
              >
                最初のメモを作成
              </Button>
            </Box>
          )}

          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose} PaperProps={{ sx: { backgroundColor: colors.background.paper, border: `1px solid ${colors.border.soft}`, boxShadow: shadows.md, borderRadius: borderRadius.lg } }}>
            <MenuItem
              onClick={() => {
                if (selectedMemo) {
                  navigate(`/app/projects/${projectId}/memos/${selectedMemo.id}`);
                }
                handleMenuClose();
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              編集
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (selectedMemo) {
                  void handleDeleteMemo(selectedMemo.id);
                }
                handleMenuClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              削除
            </MenuItem>
          </Menu>
        </motion.div>
      </Container>

    </>
  );
};

export default memo(ProjectPage);
