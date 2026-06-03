import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  LockOutlined,
  Logout,
  Refresh,
  School,
  Search,
  WarningAmber,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';

type DashboardEmotion =
  | 'wakuwaku'
  | 'tanoshii'
  | 'omoshiroi'
  | 'sukkiri'
  | 'moyamoya'
  | 'fuan'
  | 'muzukashii'
  | 'ikizumari';

type DashboardFilterWindow = 'today' | '7days' | '30days' | 'all';

type FollowUpFlag = 'turning_point' | 'low_effort' | 'anxious' | 'frustrated';

type TeacherDashboardRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  grade?: string | null;
  class_name?: string | null;
  attendance_number?: number | null;
  date?: string | null;
  published_body?: string | null;
  shared_summary?: string | null;
  published_quote?: string | null;
  published_tags: string[];
  emotion?: {
    effort_score?: number;
    mood_tags?: DashboardEmotion[];
    free_text?: string | null;
  } | null;
  turning_point: boolean;
  submitted_at?: string | null;
  follow_up_flag?: FollowUpFlag | null;
  entry_count: number;
  has_submission: boolean;
};

const emotionMeta: Record<DashboardEmotion, { label: string; tone: string; text: string; border: string }> = {
  wakuwaku: { label: 'ワクワク', tone: '#faeeda', text: '#854f0b', border: '#ef9f27' },
  tanoshii: { label: 'たのしい', tone: '#faece7', text: '#993c1d', border: '#d85a30' },
  omoshiroi: { label: 'おもしろい', tone: '#eaf3de', text: '#3b6d11', border: '#639922' },
  sukkiri: { label: 'すっきり', tone: '#e1f5ee', text: '#0f6e56', border: '#1d9e75' },
  moyamoya: { label: 'モヤモヤ', tone: '#eeedfe', text: '#534ab7', border: '#7f77dd' },
  fuan: { label: '不安', tone: '#e6f1fb', text: '#185fa5', border: '#378add' },
  muzukashii: { label: 'むずかしい', tone: '#fbeaf0', text: '#993556', border: '#d4537e' },
  ikizumari: { label: '行き詰まり', tone: '#fcebeb', text: '#a32d2d', border: '#e24b4a' },
};

const followUpLabels: Record<FollowUpFlag, string> = {
  turning_point: '転機あり',
  low_effort: '熱量低下',
  anxious: '不安傾向',
  frustrated: '行き詰まり',
};

const windowLabels: Record<DashboardFilterWindow, string> = {
  today: '今日',
  '7days': '7日',
  '30days': '30日',
  all: '全期間',
};

const isWithinWindow = (submittedAt: string | null | undefined, windowFilter: DashboardFilterWindow) => {
  if (windowFilter === 'all') {
    return true;
  }
  if (!submittedAt) {
    return false;
  }

  const submittedDate = new Date(submittedAt);
  const now = new Date();
  const diff = now.getTime() - submittedDate.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (windowFilter === 'today') {
    return submittedDate.toDateString() === now.toDateString();
  }
  if (windowFilter === '7days') {
    return diff <= oneDay * 7;
  }
  return diff <= oneDay * 30;
};

const formatSubmissionLabel = (submittedAt?: string | null) => {
  if (!submittedAt) {
    return '未提出';
  }

  const date = new Date(submittedAt);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { getAccessToken, profile, signOut } = useAuthStore();
  const [rows, setRows] = useState<TeacherDashboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedEmotion, setSelectedEmotion] = useState<'all' | DashboardEmotion>('all');
  const [selectedWindow, setSelectedWindow] = useState<DashboardFilterWindow>('7days');
  const [followUpOnly, setFollowUpOnly] = useState(false);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/diary/teacher/dashboard?include_inactive=true&limit=200`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('先生アカウントのみがこの画面を利用できます。');
        }
        throw new Error('先生用ダッシュボードの取得に失敗しました。');
      }

      const payload = (await response.json()) as TeacherDashboardRow[];
      setRows(payload);
    } catch (fetchError) {
      console.error('Teacher dashboard fetch error:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'ダッシュボードの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/teacher/signin', { replace: true });
  };

  const handleClassChange = (event: SelectChangeEvent<string>) => {
    setSelectedClass(event.target.value);
  };

  const handleEmotionChange = (event: SelectChangeEvent<'all' | DashboardEmotion>) => {
    setSelectedEmotion(event.target.value as 'all' | DashboardEmotion);
  };

  const handleWindowChange = (event: SelectChangeEvent<DashboardFilterWindow>) => {
    setSelectedWindow(event.target.value as DashboardFilterWindow);
  };

  const handleFollowUpToggle = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setFollowUpOnly(checked);
  };

  const resetFilters = () => {
    setSearchText('');
    setSelectedClass('all');
    setSelectedEmotion('all');
    setSelectedWindow('7days');
    setFollowUpOnly(false);
  };

  const classOptions = Array.from(
    new Set(rows.map((row) => row.class_name).filter((className): className is string => Boolean(className)))
  );

  const filteredRows = rows.filter((row) => {
    if (selectedClass !== 'all' && row.class_name !== selectedClass) {
      return false;
    }
    if (selectedEmotion !== 'all' && !(row.emotion?.mood_tags || []).includes(selectedEmotion)) {
      return false;
    }
    if (followUpOnly && !row.follow_up_flag) {
      return false;
    }
    if (!isWithinWindow(row.submitted_at, selectedWindow)) {
      return false;
    }

    const haystack = [
      row.student_name,
      row.student_email,
      row.class_name || '',
      row.shared_summary || '',
      ...(row.published_tags || []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(searchText.trim().toLowerCase());
  });

  const submittedRows = filteredRows.filter((row) => row.has_submission);
  const activeToday = filteredRows.filter((row) => isWithinWindow(row.submitted_at, 'today')).length;
  const noSubmissionCount = filteredRows.filter((row) => !row.has_submission).length;
  const followUpCount = filteredRows.filter((row) => Boolean(row.follow_up_flag)).length;
  const avgEffort = submittedRows.length
    ? Math.round(
        (submittedRows.reduce((sum, row) => sum + (row.emotion?.effort_score || 0), 0) / submittedRows.length) * 20
      )
    : 0;

  const distributionMap = submittedRows.reduce<Partial<Record<DashboardEmotion, number>>>((acc, row) => {
    for (const tag of row.emotion?.mood_tags || []) {
      acc[tag] = (acc[tag] || 0) + 1;
    }
    return acc;
  }, {});

  const emotionDistribution = (Object.entries(distributionMap) as [DashboardEmotion, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const schoolName = profile?.schools?.name || '学校未設定';

  return (
    <Container
      maxWidth="xl"
      sx={{
        minHeight: '100vh',
        py: 3,
        background:
          'radial-gradient(circle at top left, rgba(242, 224, 192, 0.55), transparent 34%), radial-gradient(circle at 85% 10%, rgba(209, 191, 167, 0.28), transparent 28%), linear-gradient(180deg, #f6f0e7 0%, #fbf8f2 38%, #f4efe7 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.5 },
          border: '1px solid #d8d2c8',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,251,245,0.92))',
          boxShadow: '0 18px 48px rgba(56, 44, 27, 0.08)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography
              sx={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: { xs: 28, md: 34 },
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: '#1c1a16',
                lineHeight: 1.1,
              }}
            >
              先生用ダッシュボード
            </Typography>
            <Typography sx={{ mt: 1, color: '#5e5447', lineHeight: 1.8 }}>
              生徒が確認して共有した記録文と選んだ気持ちから、声かけの手がかりを確認できます。
              raw対話ログやAIの見立て全文は表示しません。
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
              <Chip
                icon={<AdminPanelSettings />}
                label="Teacher"
                sx={{
                  bgcolor: '#1c1a16',
                  color: '#fff',
                  '& .MuiChip-icon': { color: '#fff' },
                }}
              />
              <Chip
                icon={<School />}
                label={schoolName}
                variant="outlined"
                sx={{
                  borderColor: '#d8d2c8',
                  color: '#4d463a',
                  bgcolor: 'rgba(255,255,255,0.75)',
                }}
              />
              {profile?.school_id && (
                <Chip
                  label={`学校ID ${profile.school_id.slice(0, 8)}`}
                  variant="outlined"
                  sx={{
                    borderColor: '#e5dccf',
                    color: '#7a7267',
                    bgcolor: 'rgba(255,255,255,0.75)',
                  }}
                />
              )}
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<LockOutlined />}
              onClick={() => navigate('/profile?tab=security')}
              sx={{
                borderColor: '#d5ccbf',
                color: '#40382e',
                bgcolor: 'rgba(255,255,255,0.8)',
              }}
            >
              アカウント設定
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => void fetchDashboard()}
              sx={{
                borderColor: '#d5ccbf',
                color: '#40382e',
                bgcolor: 'rgba(255,255,255,0.8)',
              }}
            >
              更新
            </Button>
            <Button
              variant="contained"
              startIcon={<Logout />}
              onClick={handleLogout}
              sx={{
                bgcolor: '#1c1a16',
                color: '#fff',
                px: 2.5,
                borderRadius: 999,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#2b2620',
                  boxShadow: 'none',
                },
              }}
            >
              ログアウト
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <Box>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              border: '1px solid #ddd5c9',
              bgcolor: 'rgba(255,255,255,0.94)',
              boxShadow: '0 12px 36px rgba(56, 44, 27, 0.06)',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
              <TextField
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                label="生徒名・本文で検索"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#8b8071' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl sx={{ minWidth: 170 }}>
                <InputLabel id="class-filter-label">クラス</InputLabel>
                <Select
                  labelId="class-filter-label"
                  value={selectedClass}
                  label="クラス"
                  onChange={handleClassChange}
                >
                  <MenuItem value="all">全クラス</MenuItem>
                  {classOptions.map((classOption) => (
                    <MenuItem key={classOption} value={classOption}>
                      {classOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="emotion-filter-label">感情</InputLabel>
                <Select
                  labelId="emotion-filter-label"
                  value={selectedEmotion}
                  label="感情"
                  onChange={handleEmotionChange}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  {Object.entries(emotionMeta).map(([key, meta]) => (
                    <MenuItem key={key} value={key}>
                      {meta.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="window-filter-label">更新範囲</InputLabel>
                <Select
                  labelId="window-filter-label"
                  value={selectedWindow}
                  label="更新範囲"
                  onChange={handleWindowChange}
                >
                  {Object.entries(windowLabels).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch checked={followUpOnly} onChange={handleFollowUpToggle} />
                <Typography sx={{ color: '#5e5447' }}>要フォローのみ表示</Typography>
              </Stack>

              <Button variant="text" onClick={resetFilters} sx={{ color: '#7d705f' }}>
                フィルタをリセット
              </Button>
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Paper
              elevation={0}
              sx={{
                mt: 2,
                p: 4,
                borderRadius: 3,
                border: '1px solid #ddd5c9',
                bgcolor: 'rgba(255,255,255,0.94)',
                display: 'grid',
                placeItems: 'center',
                gap: 1.5,
              }}
            >
              <CircularProgress />
              <Typography sx={{ color: '#6b6558' }}>学校の探究ログを読み込んでいます...</Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                mt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              {filteredRows.map((row) => {
                const moodTags = row.emotion?.mood_tags || [];
                const effort = (row.emotion?.effort_score || 0) * 20;
                const followUpFlag = row.follow_up_flag;

                return (
                  <Paper
                    key={row.student_id}
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e0d8ca',
                      bgcolor: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 10px 24px rgba(56, 44, 27, 0.04)',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Typography
                            sx={{
                              fontFamily: "'Noto Serif JP', serif",
                              fontSize: 22,
                              color: '#1c1a16',
                              lineHeight: 1.2,
                            }}
                          >
                            {row.student_name}
                          </Typography>
                          {followUpFlag && (
                            <Chip
                              icon={<WarningAmber />}
                              label={followUpLabels[followUpFlag]}
                              sx={{
                                bgcolor: '#fff3e7',
                                color: '#8b4f10',
                                border: '1px solid #f0d1a5',
                              }}
                            />
                          )}
                        </Stack>
                        <Typography sx={{ mt: 0.5, color: '#6d6458', fontSize: 13 }}>
                          {[row.grade, row.class_name, row.attendance_number ? `${row.attendance_number}番` : null]
                            .filter(Boolean)
                            .join(' / ') || row.student_email}
                        </Typography>
                      </Box>

                      <Chip
                        label={row.has_submission ? formatSubmissionLabel(row.submitted_at) : '未提出'}
                        sx={{
                          bgcolor: row.has_submission ? '#f6f1e8' : '#f9ecec',
                          color: row.has_submission ? '#5f584c' : '#a33f3f',
                          border: `1px solid ${row.has_submission ? '#e6ded1' : '#f0c9c9'}`,
                          flexShrink: 0,
                        }}
                      />
                    </Stack>

                    <Box
                      sx={{
                        mt: 1.75,
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: '#faf6f0',
                        border: '1px solid #ece3d7',
                        minHeight: 110,
                      }}
                    >
                      <Typography sx={{ color: '#3f382f', lineHeight: 1.8, fontSize: 14 }}>
                        {row.shared_summary || 'この期間の共有summaryはまだありません。生徒が確認して共有すると、ここに先生向けの要約が表示されます。'}
                      </Typography>
                    </Box>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 12, letterSpacing: '0.08em', color: '#7b6f60', mb: 0.75 }}>
                          手ごたえ
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={effort}
                          sx={{
                            height: 8,
                            borderRadius: 999,
                            bgcolor: '#ece4d8',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 999,
                              bgcolor: effort >= 60 ? '#1d9e75' : effort >= 40 ? '#ef9f27' : '#d4537e',
                            },
                          }}
                        />
                        <Typography sx={{ mt: 0.6, fontSize: 12, color: '#6d6458' }}>
                          {row.emotion?.effort_score ? `${effort} / 100` : '未入力'}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: { md: 160 } }}>
                        <Typography sx={{ fontSize: 12, letterSpacing: '0.08em', color: '#7b6f60', mb: 0.75 }}>
                          提出数
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: "'Noto Serif JP', serif",
                            fontSize: 24,
                            lineHeight: 1,
                            color: '#1c1a16',
                          }}
                        >
                          {row.entry_count}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={0.8} flexWrap="wrap" sx={{ mt: 1.5 }}>
                      {moodTags.map((tag) => {
                        const meta = emotionMeta[tag];
                        return (
                          <Chip
                            key={`${row.student_id}-${tag}`}
                            label={meta.label}
                            sx={{
                              bgcolor: meta.tone,
                              color: meta.text,
                              border: `1px solid ${meta.border}`,
                            }}
                          />
                        );
                      })}
                      {(row.published_tags || []).slice(0, 3).map((tag) => (
                        <Chip
                          key={`${row.student_id}-${tag}`}
                          label={`#${tag}`}
                          variant="outlined"
                          sx={{
                            borderColor: '#ddd2c2',
                            color: '#6f6558',
                          }}
                        />
                      ))}
                    </Stack>
                  </Paper>
                );
              })}

              {!filteredRows.length && !isLoading && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    border: '1px solid #ddd5c9',
                    bgcolor: 'rgba(255,255,255,0.94)',
                  }}
                >
                  <Typography sx={{ fontFamily: "'Noto Serif JP', serif", fontSize: 24, color: '#1c1a16' }}>
                    条件に一致する生徒がいません
                  </Typography>
                  <Typography sx={{ mt: 1, color: '#6d6458', lineHeight: 1.8 }}>
                    フィルタ条件を緩めるか、更新範囲を広げて再確認してください。
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </Box>

        <Stack spacing={2}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #ddd5c9',
              bgcolor: 'rgba(255,255,255,0.94)',
              boxShadow: '0 12px 36px rgba(56, 44, 27, 0.06)',
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: 22,
                color: '#1c1a16',
                lineHeight: 1.25,
              }}
            >
              学校サマリー
            </Typography>

            <Stack spacing={1.2} sx={{ mt: 1.75 }}>
              {[
                { label: '対象生徒', value: `${filteredRows.length}名` },
                { label: '本日更新', value: `${activeToday}名` },
                { label: '要フォロー', value: `${followUpCount}名` },
                { label: '未提出', value: `${noSubmissionCount}名` },
                { label: '平均熱量', value: `${avgEffort} / 100` },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid #e7dfd4',
                    bgcolor: '#faf7f2',
                  }}
                >
                  <Typography sx={{ fontSize: 12, color: '#7b6f60', letterSpacing: '0.08em' }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 24, color: '#1c1a16', lineHeight: 1.1 }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid #ddd5c9',
              bgcolor: 'rgba(255,255,255,0.94)',
              boxShadow: '0 12px 36px rgba(56, 44, 27, 0.06)',
            }}
          >
            <Typography
              sx={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: 20,
                color: '#1c1a16',
                lineHeight: 1.25,
              }}
            >
              感情の分布
            </Typography>

            <Stack spacing={1.2} sx={{ mt: 1.75 }}>
              {emotionDistribution.map(([emotionId, count]) => {
                const meta = emotionMeta[emotionId];
                const width = submittedRows.length ? (count / submittedRows.length) * 100 : 0;

                return (
                  <Box key={emotionId}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.6 }}>
                      <Typography sx={{ fontSize: 13, color: meta.text }}>{meta.label}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#6d6458' }}>{count}件</Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        bgcolor: '#ece4d8',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${width}%`,
                          height: '100%',
                          bgcolor: meta.border,
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}

              {!emotionDistribution.length && (
                <Typography sx={{ color: '#6d6458', lineHeight: 1.8 }}>
                  提出が入ると、ここに学校全体の感情傾向が表示されます。
                </Typography>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
};

export default TeacherDashboard;
