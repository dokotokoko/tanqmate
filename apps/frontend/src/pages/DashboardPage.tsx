import React, { memo, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CreateProjectDialog from '../components/Project/CreateProjectDialog';
import EditProjectDialog from '../components/Project/EditProjectDialog';
import { simpleSteps } from '../components/Tutorial/DashboardTutorial';
import SimpleTutorial from '../components/Tutorial/SimpleTutorial';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import {
  dashboardProjectService,
  type DashboardProject,
  type DashboardProjectPayload,
} from '../services/dashboard/projectService';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { clearCurrentMemo } = useChatStore();

  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const getTutorialStorageKey = () => {
    if (!user?.id) {
      return null;
    }
    return `tutorial-shown-${user.id}`;
  };

  const hasShownTutorial = () => {
    const key = getTutorialStorageKey();
    return key ? localStorage.getItem(key) === 'true' : false;
  };

  const markTutorialShown = () => {
    const key = getTutorialStorageKey();
    if (key) {
      localStorage.setItem(key, 'true');
    }
  };

  const fetchProjects = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardProjectService.listProjects();
      setProjects(data);
    } catch (fetchError) {
      console.error('プロジェクト取得エラー:', fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'プロジェクトの取得でエラーが発生しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    clearCurrentMemo();
  }, [clearCurrentMemo]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchProjects();

    if (!hasShownTutorial()) {
      const timerId = window.setTimeout(() => {
        setShowTutorial(true);
        markTutorialShown();
      }, 1000);

      return () => window.clearTimeout(timerId);
    }

    return undefined;
  }, [user]);

  const handleCreateProject = async (projectData: DashboardProjectPayload) => {
    try {
      setError(null);
      await dashboardProjectService.createProject(projectData);
      await fetchProjects();
      setIsCreateDialogOpen(false);
    } catch (createError) {
      console.error('プロジェクト作成エラー:', createError);
      setError(
        createError instanceof Error
          ? createError.message
          : 'プロジェクトの作成に失敗しました'
      );
    }
  };

  const handleEditProject = async (projectId: number, projectData: DashboardProjectPayload) => {
    try {
      setError(null);
      await dashboardProjectService.updateProject(projectId, projectData);
      await fetchProjects();
      setIsEditDialogOpen(false);
      setSelectedProject(null);
    } catch (editError) {
      console.error('プロジェクト編集エラー:', editError);
      setError(
        editError instanceof Error
          ? editError.message
          : 'プロジェクトの更新に失敗しました'
      );
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('このプロジェクトを削除しますか？関連するメモも全て削除されます。')) {
      return;
    }

    try {
      setError(null);
      await dashboardProjectService.deleteProject(projectId);
      await fetchProjects();
      setMenuAnchor(null);
      setSelectedProject(null);
    } catch (deleteError) {
      console.error('プロジェクト削除エラー:', deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'プロジェクトの削除に失敗しました'
      );
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: DashboardProject) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3 },
        }}
        data-tutorial="welcome-section"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
              }}
            >
              ダッシュボード
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
              mb: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
              }}
            >
              探究プロジェクト
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
              data-tutorial="create-project-button"
              sx={{
                background: 'linear-gradient(45deg, #FF7A00, #FF6B35)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FFB347, #FF6B35)',
                },
                borderRadius: 2,
                px: { xs: 2, sm: 3 },
                py: 1.5,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>新しいプロジェクト</Box>
              <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>プロジェクト作成</Box>
            </Button>
          </Box>

          <Box sx={{ mb: 4 }} data-tutorial="project-list">
            {projects.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: { xs: 4, sm: 8 },
                  px: { xs: 2, sm: 0 },
                }}
              >
                <DescriptionIcon
                  sx={{
                    fontSize: { xs: 48, sm: 64 },
                    color: 'text.secondary',
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h6"
                  color="text.secondary"
                  gutterBottom
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  まだプロジェクトがありません
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 3,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    maxWidth: { xs: '280px', sm: 'none' },
                    mx: 'auto',
                  }}
                >
                  新しいプロジェクトを作成して、探究を始めましょう
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateDialogOpen(true)}
                  sx={{
                    background: 'linear-gradient(45deg, #FF7A00, #FF6B35)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FFB347, #FF6B35)',
                    },
                    borderRadius: 1.4,
                    px: { xs: 3, sm: 4 },
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    width: { xs: '100%', sm: 'auto' },
                    maxWidth: { xs: '280px', sm: 'none' },
                  }}
                >
                  最初のプロジェクトを作成
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)',
                  },
                  gap: { xs: 2, sm: 3 },
                }}
              >
                <AnimatePresence>
                  {projects.map((project) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          },
                        }}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: { xs: 1, sm: 2 },
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 600,
                                  mb: 1,
                                  fontSize: { xs: '1rem', sm: '1.25rem' },
                                  lineHeight: 1.3,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {project.theme}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  mt: 2,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <CalendarIcon
                                  fontSize="small"
                                  sx={{
                                    color: 'text.secondary',
                                    fontSize: { xs: '16px', sm: '20px' },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                >
                                  {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                                </Typography>
                              </Box>
                            </Box>

                            <IconButton
                              onClick={(event) => handleMenuOpen(event, project)}
                              sx={{
                                opacity: 0.7,
                                '&:hover': { opacity: 1 },
                                p: { xs: 1, sm: 1.5 },
                              }}
                            >
                              <MoreIcon sx={{ fontSize: { xs: '20px', sm: '24px' } }} />
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            )}
          </Box>

          <CreateProjectDialog
            open={isCreateDialogOpen}
            onClose={() => setIsCreateDialogOpen(false)}
            onSubmit={handleCreateProject}
          />

          <EditProjectDialog
            open={isEditDialogOpen}
            project={selectedProject}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedProject(null);
            }}
            onSubmit={handleEditProject}
          />

          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
            <MenuItem
              onClick={() => {
                if (selectedProject) {
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
                if (selectedProject) {
                  void handleDeleteProject(selectedProject.id);
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
        </motion.div>
      </Container>

      <SimpleTutorial
        steps={simpleSteps}
        isOpen={showTutorial}
        spotlightClicks={false}
        onClose={() => {
          setShowTutorial(false);
          markTutorialShown();
        }}
        onComplete={() => {
          setShowTutorial(false);
          markTutorialShown();
        }}
      />
    </>
  );
};

export default memo(DashboardPage);
