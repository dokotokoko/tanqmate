import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  Grid,
  Chip,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArticleIcon from '@mui/icons-material/Article';
import GroupIcon from '@mui/icons-material/Group';
import { motion } from 'framer-motion';

interface Quest {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  status?: 'not_started' | 'in_progress' | 'completed';
}

interface TimelineItem {
  id: string;
  type: 'news' | 'case_study' | 'trending';
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  tags: string[];
  url?: string;
}

interface UserContext {
  theme: string;
  interestTags: string[];
  vibesActions: string[];
  currentStage: string;
}

export default function VibesTanqDashboard() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    // ユーザーコンテキストを取得
    fetchUserContext();
    // クエストとタイムラインを取得
    fetchQuests();
    fetchTimelineItems();
  }, []);

  const fetchUserContext = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('認証トークンが見つかりません');
        return;
      }
      const response = await fetch(`${apiBaseUrl}/vibes-tanq/context`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserContext(data);
      }
    } catch (error) {
      console.error('Failed to fetch user context:', error);
    }
  };

  const fetchQuests = async () => {
    setLoadingQuests(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('認証トークンが見つかりません');
        setLoadingQuests(false);
        return;
      }
      const response = await fetch(`${apiBaseUrl}/vibes-tanq/quests/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // デモ用のダミーデータ
        setQuests([
          {
            id: '1',
            title: 'プラスチックごみ問題について、1番「なんとかしたい」と思ったことを1つ選ぶ',
            description: '自分の中で最も解決したいと感じる具体的な問題を明確にしてみましょう。',
            estimatedTime: '15分',
            difficulty: 'easy',
            category: '問題の焦点化',
            points: 10,
            status: 'not_started',
          },
          {
            id: '2',
            title: '身近な人3人にプラスチック問題についてインタビューしてみる',
            description: '家族や友人に、プラスチックごみ問題についてどう思うか聞いてみましょう。',
            estimatedTime: '30分',
            difficulty: 'medium',
            category: '情報収集',
            points: 20,
            status: 'not_started',
          },
          {
            id: '3',
            title: '地域のリサイクル施設を見学してレポートを作成',
            description: '実際の現場を見て、リサイクルの現状を理解しましょう。',
            estimatedTime: '2時間',
            difficulty: 'hard',
            category: '現地調査',
            points: 30,
            status: 'not_started',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoadingQuests(false);
    }
  };

  const fetchTimelineItems = async () => {
    setLoadingTimeline(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('認証トークンが見つかりません');
        setLoadingTimeline(false);
        return;
      }
      const response = await fetch(`${apiBaseUrl}/vibes-tanq/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // デモ用のダミーデータ
        setTimelineItems([
          {
            id: '1',
            type: 'news',
            title: 'プラスチック削減に成功した地域の取り組み',
            summary: '静岡県の小さな町が、プラスチック使用量を50%削減することに成功しました。',
            source: 'エコニュース',
            publishedAt: '2024-01-05',
            tags: ['プラスチック', '環境', '地域活動'],
            url: '#',
          },
          {
            id: '2',
            type: 'case_study',
            title: '高校生が開発した新しいリサイクル方法',
            summary: '福岡県の高校生グループが、プラスチックを効率的にリサイクルする新技術を開発。',
            source: '探究学習事例集',
            publishedAt: '2024-01-04',
            tags: ['高校生', 'リサイクル', 'イノベーション'],
            url: '#',
          },
          {
            id: '3',
            type: 'trending',
            title: 'サステナブルな生活を実現する10の方法',
            summary: '日常生活で実践できる環境に優しい習慣をまとめました。',
            source: 'ライフスタイル研究所',
            publishedAt: '2024-01-03',
            tags: ['サステナビリティ', 'ライフスタイル'],
            url: '#',
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch timeline items:', error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleQuestStart = (questId: string) => {
    setQuests((prev) =>
      prev.map((quest) =>
        quest.id === questId ? { ...quest, status: 'in_progress' } : quest
      )
    );
  };

  const handleQuestComplete = (questId: string) => {
    setQuests((prev) =>
      prev.map((quest) =>
        quest.id === questId ? { ...quest, status: 'completed' } : quest
      )
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'news':
        return <ArticleIcon />;
      case 'case_study':
        return <GroupIcon />;
      case 'trending':
        return <TrendingUpIcon />;
      default:
        return <ArticleIcon />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Vibes 探Q ダッシュボード
        </Typography>
        {userContext && (
          <Paper elevation={0} sx={{ p: 2, backgroundColor: 'primary.light', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              探究テーマ：{userContext.theme}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {userContext.interestTags.map((tag) => (
                <Chip key={tag} label={tag} size="small" color="primary" />
              ))}
            </Box>
          </Paper>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* クエストセクション */}
        <Grid item xs={12} lg={6}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              今日のクエスト
            </Typography>
            <IconButton onClick={fetchQuests} disabled={loadingQuests}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {loadingQuests ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {quests.map((quest, index) => (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    elevation={2}
                    sx={{
                      borderLeft: `4px solid`,
                      borderLeftColor: `${getDifficultyColor(quest.difficulty)}.main`,
                      opacity: quest.status === 'completed' ? 0.7 : 1,
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                          {quest.title}
                        </Typography>
                        {quest.status === 'completed' && (
                          <CheckCircleIcon color="success" />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {quest.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip
                          label={quest.category}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={quest.difficulty}
                          size="small"
                          color={getDifficultyColor(quest.difficulty)}
                        />
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={quest.estimatedTime}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${quest.points}pt`}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    </CardContent>
                    <CardActions>
                      {quest.status === 'not_started' && (
                        <Button
                          startIcon={<PlayArrowIcon />}
                          onClick={() => handleQuestStart(quest.id)}
                        >
                          開始する
                        </Button>
                      )}
                      {quest.status === 'in_progress' && (
                        <Button
                          variant="contained"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleQuestComplete(quest.id)}
                        >
                          完了する
                        </Button>
                      )}
                      {quest.status === 'completed' && (
                        <Typography variant="body2" color="success.main" sx={{ px: 2 }}>
                          完了済み
                        </Typography>
                      )}
                    </CardActions>
                  </Card>
                </motion.div>
              ))}
            </Box>
          )}
        </Grid>

        {/* タイムラインセクション */}
        <Grid item xs={12} lg={6}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              あなたへのおすすめ
            </Typography>
            <IconButton onClick={fetchTimelineItems} disabled={loadingTimeline}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {loadingTimeline ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {timelineItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card elevation={1} sx={{ cursor: 'pointer', '&:hover': { elevation: 3 } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          {getTypeIcon(item.type)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {item.summary}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            {item.tags.map((tag) => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              {item.source} • {item.publishedAt}
                            </Typography>
                            <Button size="small" href={item.url}>
                              詳しく見る
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}