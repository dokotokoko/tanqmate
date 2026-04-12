import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft,
  ArrowBack,
  Save as SaveIcon,
  Cancel as CancelIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import CreateProjectDialog from '../Project/CreateProjectDialog';
import EditProjectDialog from '../Project/EditProjectDialog';
import MemoEditor from '../MemoEditor';
import { borderRadius, colors, shadows } from '../../styles/design-system';

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
  created_at: string;
  updated_at: string;
  memo_count: number;
}

interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  project_id?: number;
}

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  isMobile?: boolean;
}

type ViewMode = 'projects' | 'project-detail' | 'memo-detail' | 'memo-create';

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isOpen, onToggle, width, isMobile = false }) => {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuthStore();
  const { setCurrentMemo, updateMemoContent, setCurrentProject } = useChatStore();
  
  // 表示モードと選択状態
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  
  // データ
  const [projects, setProjects] = useState<Project[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ダイアログ状態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);
  const [memoMenuAnchor, setMemoMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuMemo, setMenuMemo] = useState<Memo | null>(null);
  
  // メモ編集状態
  const [memoContent, setMemoContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getAuthHeaders = () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('認証セッションが見つかりません。再ログインしてください。');
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  };

  // プロジェクト一覧の取得
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`プロジェクトの取得に失敗しました (${response.status})`);
      }
      
      const data = await response.json();
      setProjects(data);
      
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの取得でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // メモ一覧の取得
  const fetchMemos = async (projectId: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/memos`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setMemos(data);
    } catch (error) {
      console.error('Error fetching memos:', error);
      setError(error instanceof Error ? error.message : 'メモの取得でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // メモの取得
  const fetchMemo = async (projectId: number, memoId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/memos/${memoId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setSelectedMemo(data);
      const content = data.title ? `${data.title}\n\n${data.content}` : data.content;
      setMemoContent(content);
      
      // チャットストアにメモ情報を設定
      setCurrentMemo(projectId.toString(), memoId.toString(), data.title, data.content);
    } catch (error) {
      console.error('Error fetching memo:', error);
      setError(error instanceof Error ? error.message : 'メモの取得でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // メモの保存
  const saveMemo = async () => {
    if (!selectedProject || (!selectedMemo && viewMode !== 'memo-create')) return;
    
    try {
      setIsSaving(true);
      const lines = memoContent.split('\n');
      const title = lines[0] || '無題のメモ';
      const content = lines.slice(2).join('\n');

      if (viewMode === 'memo-create') {
        // 新規作成
        const response = await fetch(`${API_BASE_URL}/projects/${selectedProject.id}/memos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ title, content }),
        });

        if (!response.ok) throw new Error('メモの作成に失敗しました');
        
        const newMemo = await response.json();
        setSelectedMemo(newMemo);
        setViewMode('memo-detail');
        await fetchMemos(selectedProject.id);
      } else if (selectedMemo) {
        // 更新
        const response = await fetch(`${API_BASE_URL}/memos/${selectedMemo.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ title, content, project_id: selectedProject.id }),
        });

        if (!response.ok) throw new Error('メモの更新に失敗しました');
        
        const updatedMemo = await response.json();
        setSelectedMemo(updatedMemo);
        await fetchMemos(selectedProject.id);
      }
      
      // チャットストアにメモ情報を更新
      updateMemoContent(title, content);
    } catch (error) {
      console.error('Error saving memo:', error);
      setError(error instanceof Error ? error.message : 'メモの保存でエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  // メモの削除
  const deleteMemo = async (memoId: number) => {
    if (!selectedProject || !confirm('このメモを削除しますか？')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/memos/${memoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('メモの削除に失敗しました');
      
      await fetchMemos(selectedProject.id);
      if (selectedMemo?.id === memoId) {
        setViewMode('project-detail');
        setSelectedMemo(null);
        setMemoContent('');
      }
    } catch (error) {
      console.error('Error deleting memo:', error);
      setError(error instanceof Error ? error.message : 'メモの削除でエラーが発生しました');
    }
  };

  useEffect(() => {
    if (user && isOpen && viewMode === 'projects') {
      fetchProjects();
    }
  }, [user, isOpen, viewMode]);

  // プロジェクト作成の処理
  const handleCreateProject = async (projectData: {
    theme: string;
    question?: string;
    hypothesis?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('プロジェクトの作成に失敗しました');
      }
      
      await fetchProjects();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました');
    }
  };

  // プロジェクト編集の処理
  const handleEditProject = async (projectId: number, projectData: {
    theme: string;
    question?: string;
    hypothesis?: string;
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('プロジェクトの更新に失敗しました');
      }
      
      await fetchProjects();
      setIsEditDialogOpen(false);
      setMenuProject(null);
    } catch (error) {
      console.error('Error editing project:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの更新に失敗しました');
    }
  };

  // プロジェクト削除の処理
  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('プロジェクトの削除に失敗しました');
      
      await fetchProjects();
      setMenuAnchor(null);
      setMenuProject(null);
      if (selectedProject?.id === projectId) {
        setViewMode('projects');
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました');
    }
  };

  // プロジェクトクリックハンドラー
  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setViewMode('project-detail');
    setCurrentProject(project.id.toString());
    await fetchMemos(project.id);
  };

  // メモクリックハンドラー
  const handleMemoClick = async (memo: Memo) => {
    if (selectedProject) {
      setViewMode('memo-detail');
      await fetchMemo(selectedProject.id, memo.id);
    }
  };

  // 新規メモ作成ハンドラー
  const handleCreateMemo = () => {
    setViewMode('memo-create');
    setSelectedMemo(null);
    setMemoContent('新しいメモ\n※改行して1行開ける\nここに内容を書いてください。');
  };

  // 戻るボタンハンドラー
  const handleBack = () => {
    if (viewMode === 'memo-detail' || viewMode === 'memo-create') {
      setViewMode('project-detail');
      setSelectedMemo(null);
      setMemoContent('');
    } else if (viewMode === 'project-detail') {
      setViewMode('projects');
      setSelectedProject(null);
      setMemos([]);
    }
  };

  // メニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuProject(project);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMemoMenuOpen = (event: React.MouseEvent<HTMLElement>, memo: Memo) => {
    event.stopPropagation();
    setMemoMenuAnchor(event.currentTarget);
    setMenuMemo(memo);
  };

  const handleMemoMenuClose = () => {
    setMemoMenuAnchor(null);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Box
            component={motion.div}
            initial={{ width: 0 }}
            animate={{ width }}
            exit={{ width: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            sx={{
              width,
              height: '100vh',
              backgroundColor: colors.background.paper,
              borderLeft: 1,
              borderColor: colors.border.soft,
              boxShadow: shadows.lg,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: isMobile ? 'fixed' : 'relative',
              right: isMobile ? 0 : 'auto',
              top: isMobile ? 0 : 'auto',
              zIndex: isMobile ? 1200 : 'auto',
            }}
          >
            {/* Header */}
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: colors.border.soft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.background.paper,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {viewMode !== 'projects' && (
                  <IconButton 
                    onClick={handleBack} 
                    size="small"
                    sx={{
                      borderRadius: borderRadius.md,
                      color: colors.text.muted,
                      '&:hover': {
                        backgroundColor: colors.background.subtle,
                        color: colors.text.secondary,
                      }
                    }}
                  >
                    <ArrowBack />
                  </IconButton>
                )}
                <Typography variant="h6" fontWeight={600} sx={{ color: colors.text.primary }}>
                  {viewMode === 'projects' ? 'ダッシュボード' : 
                   viewMode === 'project-detail' ? selectedProject?.theme :
                   viewMode === 'memo-create' ? '新しいメモ' :
                   selectedMemo?.title}
                </Typography>
              </Box>
              <IconButton 
                onClick={onToggle} 
                size="small"
                sx={{
                  borderRadius: borderRadius.md,
                  color: colors.text.muted,
                  '&:hover': {
                    backgroundColor: colors.background.subtle,
                    color: colors.text.secondary,
                  }
                }}
              >
                <ChevronLeft />
              </IconButton>
            </Box>

            {/* Breadcrumbs */}
            {viewMode !== 'projects' && (
              <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: colors.border.soft, backgroundColor: colors.background.paper }}>
                <Breadcrumbs separator="›" aria-label="breadcrumb">
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                      setViewMode('projects');
                      setSelectedProject(null);
                    }}
                    sx={{ 
                      cursor: 'pointer',
                      color: colors.text.secondary,
                      textDecoration: 'none',
                      '&:hover': {
                        color: colors.accentWarm.main,
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    プロジェクト
                  </Link>
                  {selectedProject && (
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => viewMode !== 'project-detail' && setViewMode('project-detail')}
                      sx={{ 
                        cursor: viewMode === 'project-detail' ? 'default' : 'pointer',
                        color: colors.text.secondary,
                        textDecoration: 'none',
                        '&:hover': {
                          color: colors.accentWarm.main,
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {selectedProject.theme}
                    </Link>
                  )}
                  {(viewMode === 'memo-detail' || viewMode === 'memo-create') && (
                    <Typography variant="body2" sx={{ color: colors.text.primary }}>
                      {viewMode === 'memo-create' ? '新しいメモ' : selectedMemo?.title}
                    </Typography>
                  )}
                </Breadcrumbs>
              </Box>
            )}

            {/* Content */}
            <Box sx={{ 
              flex: 1, 
              overflow: 'auto', 
              p: 3,
              backgroundColor: colors.background.paper,
              // スクロールバーを非表示
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              '-ms-overflow-style': 'none',
              'scrollbar-width': 'none',
            }}>
              {isLoading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              ) : viewMode === 'projects' ? (
                <>
                  {/* プロジェクト一覧 */}
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateDialogOpen(true)}
                    sx={{
                      mb: 2,
                      backgroundColor: colors.accentWarm.main,
                      borderRadius: borderRadius.button,
                      boxShadow: shadows.accent,
                      textTransform: 'none',
                      fontWeight: 500,
                      color: colors.text.inverse,
                      '&:hover': {
                        backgroundColor: colors.accentWarm.hover,
                        boxShadow: shadows.accentHover,
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    新しいプロジェクト
                  </Button>

                  <Divider sx={{ 
                    mb: 2,
                    borderColor: colors.border.soft,
                    opacity: 0.6
                  }} />

                  <Typography variant="subtitle2" fontWeight={600} sx={{ 
                    mb: 1,
                    color: colors.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '11px'
                  }}>
                    探究プロジェクト
                  </Typography>

                  {projects.length === 0 ? (
                    <Card sx={{ 
                      textAlign: 'center', 
                      py: 3,
                      backgroundColor: colors.background.subtle,
                      borderRadius: borderRadius.card,
                      border: `1px solid ${colors.border.soft}`,
                      boxShadow: shadows.sm
                    }}>
                      <DescriptionIcon sx={{ fontSize: 48, color: colors.text.muted, mb: 1 }} />
                      <Typography variant="body2" sx={{ color: colors.text.muted }}>
                        プロジェクトがありません
                      </Typography>
                    </Card>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {projects.map((project) => (
                        <ListItem
                          key={project.id}
                          disablePadding
                          sx={{ mb: 1 }}
                        >
                          <Card sx={{ 
                            width: '100%',
                            backgroundColor: colors.background.subtle,
                            borderRadius: borderRadius.card,
                            border: `1px solid ${colors.border.soft}`,
                            boxShadow: shadows.sm,
                            '&:hover': {
                              backgroundColor: colors.accentWarm.soft,
                              boxShadow: shadows.card.hover,
                            }
                          }}>
                            <ListItemButton
                              onClick={() => handleProjectClick(project)}
                              sx={{ 
                                p: 1.5,
                                borderRadius: borderRadius.card,
                                '&:hover': {
                                  backgroundColor: 'transparent'
                                }
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" fontWeight={500} noWrap sx={{ color: colors.text.primary }}>
                                  {project.theme}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="caption" sx={{ color: colors.text.muted }}>
                                    {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                                  </Typography>
                                  {project.memo_count > 0 && (
                                    <Chip 
                                      label={`${project.memo_count} メモ`} 
                                      size="small" 
                                      sx={{ 
                                        ml: 1,
                                        backgroundColor: colors.background.default,
                                        color: colors.text.secondary,
                                        fontSize: '11px',
                                        border: `1px solid ${colors.border.soft}`
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, project)}
                                sx={{ 
                                  ml: 1,
                                  borderRadius: borderRadius.md,
                                  color: colors.text.muted,
                                  '&:hover': {
                                    backgroundColor: colors.background.subtle,
                                    color: colors.text.secondary,
                                  }
                                }}
                              >
                                <MoreIcon fontSize="small" />
                              </IconButton>
                            </ListItemButton>
                          </Card>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              ) : viewMode === 'project-detail' ? (
                <>
                  {/* プロジェクト詳細とメモ一覧 */}
                  {selectedProject && (
                    <Box sx={{ mb: 2 }}>
                      {selectedProject.question && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ 
                            color: colors.text.muted,
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            探究の問い
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: colors.text.primary,
                            mt: 0.5,
                            lineHeight: 1.6
                          }}>
                            {selectedProject.question}
                          </Typography>
                        </Box>
                      )}
                      {selectedProject.hypothesis && (
                        <Box>
                          <Typography variant="caption" sx={{ 
                            color: colors.text.muted,
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            仮説
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: colors.text.primary,
                            mt: 0.5,
                            lineHeight: 1.6
                          }}>
                            {selectedProject.hypothesis}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<NoteAddIcon />}
                    onClick={handleCreateMemo}
                    sx={{ 
                      mb: 2,
                      borderRadius: borderRadius.button,
                      borderColor: colors.border.soft,
                      color: colors.text.secondary,
                      backgroundColor: colors.background.paper,
                      textTransform: 'none',
                      fontWeight: 500,
                      boxShadow: shadows.sm,
                      '&:hover': {
                        borderColor: colors.accentWarm.main,
                        color: colors.accentWarm.main,
                        backgroundColor: colors.accentWarm.soft,
                        boxShadow: shadows.card.hover,
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    新しいメモを作成
                  </Button>

                  <Divider sx={{ 
                    mb: 2,
                    borderColor: colors.border.soft,
                    opacity: 0.6
                  }} />

                  <Typography variant="subtitle2" fontWeight={600} sx={{ 
                    mb: 1,
                    color: colors.text.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '11px'
                  }}>
                    メモ一覧
                  </Typography>

                  {memos.length === 0 ? (
                    <Card sx={{ 
                      textAlign: 'center', 
                      py: 3,
                      backgroundColor: colors.background.subtle,
                      borderRadius: borderRadius.card,
                      border: `1px solid ${colors.border.soft}`,
                      boxShadow: shadows.sm
                    }}>
                      <DescriptionIcon sx={{ fontSize: 36, color: colors.text.muted, mb: 1 }} />
                      <Typography variant="body2" sx={{ color: colors.text.muted }}>
                        メモがありません
                      </Typography>
                    </Card>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {memos.map((memo) => (
                        <ListItem
                          key={memo.id}
                          disablePadding
                          sx={{ mb: 1 }}
                        >
                          <Card sx={{ 
                            width: '100%',
                            backgroundColor: colors.background.subtle,
                            borderRadius: borderRadius.card,
                            border: `1px solid ${colors.border.soft}`,
                            boxShadow: shadows.sm,
                            '&:hover': {
                              backgroundColor: colors.accentWarm.soft,
                              boxShadow: shadows.card.hover,
                            }
                          }}>
                            <ListItemButton
                              onClick={() => handleMemoClick(memo)}
                              sx={{ 
                                p: 1.5,
                                borderRadius: borderRadius.card,
                                '&:hover': {
                                  backgroundColor: 'transparent'
                                }
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={500} noWrap sx={{ color: colors.text.primary }}>
                                  {memo.title}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.text.muted }}>
                                  {new Date(memo.updated_at).toLocaleDateString('ja-JP')}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMemoMenuOpen(e, memo)}
                                sx={{ 
                                  ml: 1,
                                  borderRadius: borderRadius.md,
                                  color: colors.text.muted,
                                  '&:hover': {
                                    backgroundColor: colors.background.subtle,
                                    color: colors.text.secondary,
                                  }
                                }}
                              >
                                <MoreIcon fontSize="small" />
                              </IconButton>
                            </ListItemButton>
                          </Card>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              ) : (viewMode === 'memo-detail' || viewMode === 'memo-create') ? (
                <>
                  {/* メモ詳細/編集 */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  </Box>

                  <Paper sx={{ 
                    p: 3,
                    height: 'calc(100vh - 280px)',
                    backgroundColor: colors.background.subtle,
                    borderRadius: borderRadius.card,
                    border: `1px solid ${colors.border.soft}`,
                    boxShadow: shadows.sm
                  }}>
                    <MemoEditor
                      initialContent={memoContent}
                      onContentChange={(content) => {
                        setMemoContent(content);
                        const lines = content.split('\n');
                        const title = lines[0] || '';
                        const bodyContent = lines.slice(2).join('\n');
                        updateMemoContent(title, bodyContent);
                      }}
                      onSave={async (content) => {
                        // 自動保存実行
                        setMemoContent(content);
                        await saveMemo();
                      }}
                      placeholder="メモを入力してください..."
                    />
                  </Paper>
                </>
              ) : null}
            </Box>
          </Box>
        )}
      </AnimatePresence>

      {/* ダイアログ */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateProject}
      />

      <EditProjectDialog
        open={isEditDialogOpen}
        project={menuProject}
        onClose={() => {
          setIsEditDialogOpen(false);
          setMenuProject(null);
        }}
        onSubmit={handleEditProject}
      />

      {/* プロジェクトメニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: colors.background.paper,
            border: `1px solid ${colors.border.soft}`,
            boxShadow: shadows.md,
            borderRadius: borderRadius.lg,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuProject) {
              setIsEditDialogOpen(true);
            }
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>編集</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuProject) {
              handleDeleteProject(menuProject.id);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>

      {/* メモメニュー */}
      <Menu
        anchorEl={memoMenuAnchor}
        open={Boolean(memoMenuAnchor)}
        onClose={handleMemoMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: colors.background.paper,
            border: `1px solid ${colors.border.soft}`,
            boxShadow: shadows.md,
            borderRadius: borderRadius.lg,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuMemo) {
              deleteMemo(menuMemo.id);
            }
            handleMemoMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default memo(DashboardSidebar);
