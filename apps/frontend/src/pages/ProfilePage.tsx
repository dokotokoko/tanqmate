import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config/api';
import InterestTagPicker from '../components/Profile/InterestTagPicker';
import { tokenManager } from '../utils/tokenManager';
import { useAuthStore } from '../stores/authStore';
import { colors, shadows } from '../styles/design-system';
import { getPostOnboardingRoute } from '../utils/onboardingGuards';

interface DiaryRecord {
  id: string;
  student_id: string;
  date: string;
  published_body?: string;
  published_quote?: string;
  published_tags: string[];
  emotion?: {
    effort_score?: number;
    mood_tags?: string[];
    free_text?: string;
  };
  turning_point: boolean;
  submitted_at?: string;
  status: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ py: 3 }}>{children}</Box>;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, fetchProfile, updateUser } = useAuthStore();
  const initialTab = searchParams.get('tab');
  const [tabValue, setTabValue] = useState(initialTab === 'diaries' ? 1 : initialTab === 'security' ? 2 : 0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<DiaryRecord[]>([]);
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade: '',
    class_name: '',
    attendance_number: '',
    interests: [] as string[],
    theme: '',
    question: '',
    hypothesis: '',
  });
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    setTabValue(nextTab === 'diaries' ? 1 : nextTab === 'security' ? 2 : 0);
  }, [searchParams]);

  const selectedDiary = useMemo(
    () => diaries.find((diary) => diary.id === selectedDiaryId) ?? diaries[0] ?? null,
    [diaries, selectedDiaryId]
  );

  const loadPage = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const [profileResponse, diaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/diary/my-diaries?limit=50&offset=0`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!profileResponse.ok) {
        throw new Error('プロフィールの読み込みに失敗しました');
      }

      const profilePayload = await profileResponse.json();
      const nextProfile = profilePayload.profile;
      setFormData({
        name: nextProfile?.name || '',
        grade: nextProfile?.grade || '',
        class_name: nextProfile?.class_name || '',
        attendance_number: nextProfile?.attendance_number ? String(nextProfile.attendance_number) : '',
        interests: Array.isArray(nextProfile?.interests) ? nextProfile.interests : [],
        theme: nextProfile?.theme || '',
        question: nextProfile?.question || '',
        hypothesis: nextProfile?.hypothesis || '',
      });

      if (diaryResponse.ok) {
        const diaryPayload = (await diaryResponse.json()) as DiaryRecord[];
        setDiaries(diaryPayload);
        setSelectedDiaryId(diaryPayload[0]?.id ?? null);
      } else {
        setDiaries([]);
      }
    } catch (error) {
      console.error('Failed to load profile page:', error);
      setErrorMessage(error instanceof Error ? error.message : 'データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name || null,
          grade: formData.grade || null,
          class_name: formData.class_name || null,
          attendance_number: formData.attendance_number ? Number(formData.attendance_number) : null,
          interests: formData.interests,
          theme: formData.theme || null,
          question: formData.question || null,
          hypothesis: formData.hypothesis || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || 'プロフィールの保存に失敗しました');
      }

      await fetchProfile();
      setSuccessMessage('プロフィールを更新しました');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrorMessage(error instanceof Error ? error.message : 'プロフィールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const validatePasswordForm = () => {
    const nextErrors = {
      password: '',
      confirmPassword: '',
    };

    if (!passwordData.password) {
      nextErrors.password = '新しいパスワードを入力してください';
    } else if (passwordData.password.length < 8) {
      nextErrors.password = 'パスワードは8文字以上で設定してください';
    }

    if (!passwordData.confirmPassword) {
      nextErrors.confirmPassword = '確認用パスワードを入力してください';
    } else if (passwordData.password !== passwordData.confirmPassword) {
      nextErrors.confirmPassword = 'パスワードが一致しません';
    }

    setPasswordErrors(nextErrors);
    return !nextErrors.password && !nextErrors.confirmPassword;
  };

  const handlePasswordSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validatePasswordForm()) {
      return;
    }

    setPasswordSaving(true);
    try {
      const result = await updateUser({ password: passwordData.password });
      if (!result.success) {
        throw new Error(result.error?.message || 'パスワードの更新に失敗しました');
      }

      setPasswordData({
        password: '',
        confirmPassword: '',
      });
      setPasswordErrors({
        password: '',
        confirmPassword: '',
      });
      setSuccessMessage('パスワードを更新しました');
    } catch (error) {
      console.error('Failed to update password:', error);
      setErrorMessage(error instanceof Error ? error.message : 'パスワードの更新に失敗しました');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, nextValue: number) => {
    setTabValue(nextValue);
    setSearchParams(nextValue === 1 ? { tab: 'diaries' } : nextValue === 2 ? { tab: 'security' } : {});
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Box
          sx={{
            mb: 4,
            p: 4,
            borderRadius: '32px',
            backgroundColor: colors.background.paper,
            border: `1px solid ${colors.border.warm}`,
            boxShadow: shadows.md,
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: '0.18em', color: colors.text.secondary }}>
            Profile & Diary Archive
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, fontWeight: 700, color: colors.text.primary }}>
            プロフィールと日誌
          </Typography>
          <Typography variant="body1" sx={{ mt: 1.5, color: colors.text.secondary, maxWidth: 760 }}>
            自分の設定を整えながら、これまでの探究日誌を確認できます。日誌を保存した直後はこのページで内容を振り返れます。
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', useFlexGap: true }}>
            <Chip label={profile?.schools?.name || '学校未設定'} sx={{ backgroundColor: colors.accentWarm.soft, color: colors.accentWarm.active, border: `1px solid ${colors.border.warm}` }} />
            <Chip
              label={profile?.role === 'teacher' ? 'Teacher' : profile?.role === 'admin' ? 'Admin' : 'Student'}
              sx={{ backgroundColor: colors.background.elevated, color: colors.text.secondary, border: `1px solid ${colors.border.soft}` }}
            />
          </Stack>
        </Box>

        {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}

        <Card sx={{ borderRadius: '28px', border: `1px solid ${colors.border.soft}`, boxShadow: shadows.sm, backgroundColor: colors.background.paper }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 2, pt: 1, '& .MuiTabs-indicator': { backgroundColor: colors.accentWarm.main }, '& .MuiTab-root.Mui-selected': { color: colors.accentWarm.active } }}>
            <Tab label="プロフィール編集" />
            <Tab label="日誌アーカイブ" />
            <Tab label="アカウント設定" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: `1px solid ${colors.border.soft}`, backgroundColor: colors.background.paper }}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: colors.text.primary, mb: 1 }}>
                        基本プロフィール
                      </Typography>
                      <Typography variant="body2" sx={{ color: colors.text.secondary, mb: 3 }}>
                        表示名や学年を更新できます。学校情報は onboarding の設定内容を表示しています。
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField fullWidth label="名前" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth label="学年" value={formData.grade} onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth label="クラス" value={formData.class_name} onChange={(e) => setFormData((prev) => ({ ...prev, class_name: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth label="出席番号" value={formData.attendance_number} onChange={(e) => setFormData((prev) => ({ ...prev, attendance_number: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth label="メールアドレス" value={profile?.email || ''} disabled />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth label="学校" value={profile?.schools?.name || '未設定'} disabled />
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 3 }} />

                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: '20px',
                          backgroundColor: colors.background.subtle,
                          border: `1px solid ${colors.border.soft}`,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary, mb: 1 }}>
                          探究コンテキスト
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.text.secondary, mb: 2 }}>
                          AIが探究を支援するときに参照する内容です。好きなものや気になることは単語で追加できます。
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <InterestTagPicker
                              value={formData.interests}
                              onChange={(interests) => setFormData((prev) => ({ ...prev, interests }))}
                              helperText="興味はAI支援の入口として使われます。先生向けにそのまま公開する情報ではありません。"
                              disabled={saving}
                              showSuggestions={false}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="探究テーマ"
                              value={formData.theme}
                              onChange={(e) => setFormData((prev) => ({ ...prev, theme: e.target.value }))}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="問い"
                              value={formData.question}
                              onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                              multiline
                              minRows={2}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="仮説"
                              value={formData.hypothesis}
                              onChange={(e) => setFormData((prev) => ({ ...prev, hypothesis: e.target.value }))}
                              multiline
                              minRows={2}
                            />
                          </Grid>
                        </Grid>
                      </Box>

                      <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                        <Button variant="contained" onClick={handleProfileSave} disabled={saving}>
                          {saving ? '保存中...' : 'プロフィールを保存'}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate('/chat')}>
                          チャットに戻る
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: `1px solid ${colors.border.soft}`, height: '100%', backgroundColor: colors.background.subtle }}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary }}>
                        現在の状態
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2.5 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            名前
                          </Typography>
                          <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                            {formData.name || '未設定'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            所属
                          </Typography>
                          <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                            {[formData.grade, formData.class_name].filter(Boolean).join(' / ') || '未設定'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            興味
                          </Typography>
                          {formData.interests.length > 0 ? (
                            <Stack direction="row" spacing={0.6} sx={{ mt: 1, flexWrap: 'wrap', useFlexGap: true }}>
                              {formData.interests.slice(0, 6).map((interest) => (
                                <Chip
                                  key={interest}
                                  size="small"
                                  label={interest}
                                  sx={{
                                    backgroundColor: colors.accentWarm.soft,
                                    color: colors.accentWarm.active,
                                    border: `1px solid ${colors.border.warm}`,
                                  }}
                                />
                              ))}
                              {formData.interests.length > 6 && (
                                <Chip size="small" label={`+${formData.interests.length - 6}`} />
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                              未設定
                            </Typography>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            日誌保存数
                          </Typography>
                          <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                            {diaries.length} 件
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            最新更新
                          </Typography>
                          <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                            {profile?.updated_at ? new Date(profile.updated_at).toLocaleString('ja-JP') : '未更新'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: `1px solid ${colors.border.soft}`, backgroundColor: colors.background.paper }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary, px: 1, py: 1 }}>
                        保存した日誌
                      </Typography>
                      {diaries.length === 0 ? (
                          <Typography variant="body2" sx={{ px: 1, py: 3, color: colors.text.secondary }}>
                          まだ日誌は保存されていません。
                        </Typography>
                      ) : (
                        <List disablePadding>
                          {diaries.map((diary) => (
                            <ListItemButton
                              key={diary.id}
                              selected={selectedDiary?.id === diary.id}
                              onClick={() => setSelectedDiaryId(diary.id)}
                              sx={{ borderRadius: '18px', mb: 0.75, alignItems: 'flex-start', '&.Mui-selected': { backgroundColor: colors.background.subtle, border: `1px solid ${colors.border.warm}` } }}
                            >
                              <ListItemText
                                primary={new Date(diary.date).toLocaleDateString('ja-JP')}
                                secondary={
                                  <Box sx={{ mt: 0.75 }}>
                                    <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                                      {(diary.published_body || '').slice(0, 52) || '本文なし'}
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', useFlexGap: true }}>
                                      {(diary.emotion?.mood_tags || []).slice(0, 3).map((tag) => (
                                        <Chip key={tag} size="small" label={tag} />
                                      ))}
                                    </Stack>
                                  </Box>
                                }
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                  <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: `1px solid ${colors.border.soft}`, minHeight: '100%', backgroundColor: colors.background.paper }}>
                    <CardContent sx={{ p: 3.5 }}>
                      {selectedDiary ? (
                        <>
                          <Typography variant="overline" sx={{ letterSpacing: '0.14em', color: colors.text.secondary }}>
                            {new Date(selectedDiary.date).toLocaleDateString('ja-JP')}
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 700, color: colors.text.primary, mt: 0.5 }}>
                            探究日誌
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 3, flexWrap: 'wrap', useFlexGap: true }}>
                            {(selectedDiary.published_tags || []).map((tag) => (
                              <Chip key={tag} label={`#${tag}`} sx={{ backgroundColor: colors.accentWarm.soft, color: colors.accentWarm.active, border: `1px solid ${colors.border.warm}` }} />
                            ))}
                            {selectedDiary.turning_point && <Chip label="転換点あり" color="primary" variant="outlined" />}
                          </Stack>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.95, color: colors.text.primary }}>
                            {selectedDiary.published_body || '本文はありません。'}
                          </Typography>

                          {selectedDiary.published_quote && (
                            <Box sx={{ mt: 3, p: 2.5, borderRadius: '18px', backgroundColor: colors.background.subtle, border: `1px solid ${colors.border.warm}` }}>
                              <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                Quote
                              </Typography>
                              <Typography variant="body1" sx={{ mt: 1, fontStyle: 'italic', color: colors.text.primary }}>
                                「{selectedDiary.published_quote}」
                              </Typography>
                            </Box>
                          )}

                          <Divider sx={{ my: 3 }} />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                感情タグ
                              </Typography>
                              <Stack direction="row" spacing={0.8} sx={{ mt: 1, flexWrap: 'wrap', useFlexGap: true }}>
                                {(selectedDiary.emotion?.mood_tags || []).map((tag) => (
                                  <Chip key={tag} label={tag} />
                                ))}
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                炎の強さ
                              </Typography>
                              <Typography variant="h5" sx={{ mt: 1, color: colors.accentWarm.active, fontWeight: 700 }}>
                                {(selectedDiary.emotion?.effort_score || 0) * 20} / 100
                              </Typography>
                            </Grid>
                          </Grid>
                        </>
                      ) : (
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                          表示する日誌がありません。
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                <Grid item xs={12} md={7}>
                  <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: `1px solid ${colors.border.soft}`, backgroundColor: colors.background.paper }}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '14px',
                            display: 'grid',
                            placeItems: 'center',
                            backgroundColor: colors.accentWarm.soft,
                            color: colors.accentWarm.active,
                          }}
                        >
                          <LockOutlined />
                        </Box>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: colors.text.primary }}>
                            パスワード変更
                          </Typography>
                          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                            先生・生徒どちらもここからパスワードを更新できます。
                          </Typography>
                        </Box>
                      </Stack>

                      <Box
                        sx={{
                          p: 2.5,
                          borderRadius: '20px',
                          backgroundColor: colors.background.subtle,
                          border: `1px solid ${colors.border.soft}`,
                          mb: 3,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.8 }}>
                          初回ログイン後は、運営者から発行された初期パスワードのまま使い続けず、すぐに変更する運用を推奨します。
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            type="password"
                            label="新しいパスワード"
                            value={passwordData.password}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPasswordData((prev) => ({ ...prev, password: value }));
                              if (passwordErrors.password) {
                                setPasswordErrors((prev) => ({ ...prev, password: '' }));
                              }
                            }}
                            helperText={passwordErrors.password || '8文字以上で設定してください'}
                            error={!!passwordErrors.password}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            type="password"
                            label="新しいパスワード（確認）"
                            value={passwordData.confirmPassword}
                            onChange={(e) => {
                              const value = e.target.value;
                              setPasswordData((prev) => ({ ...prev, confirmPassword: value }));
                              if (passwordErrors.confirmPassword) {
                                setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                              }
                            }}
                            helperText={passwordErrors.confirmPassword}
                            error={!!passwordErrors.confirmPassword}
                          />
                        </Grid>
                      </Grid>

                      <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                        <Button variant="contained" onClick={handlePasswordSave} disabled={passwordSaving}>
                          {passwordSaving ? '更新中...' : 'パスワードを更新'}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate(getPostOnboardingRoute(profile))}>
                          戻る
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Card sx={{ borderRadius: '24px', boxShadow: 'none', border: `1px solid ${colors.border.soft}`, height: '100%', backgroundColor: colors.background.subtle }}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text.primary }}>
                        セキュリティメモ
                      </Typography>
                      <Stack spacing={2} sx={{ mt: 2.5 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            ログインID
                          </Typography>
                          <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                            {profile?.email || '未設定'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            アカウント種別
                          </Typography>
                          <Typography variant="body1" sx={{ color: colors.text.primary, fontWeight: 600 }}>
                            {profile?.role === 'teacher' ? '先生アカウント' : profile?.role === 'admin' ? '開発者アカウント' : '生徒アカウント'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            推奨運用
                          </Typography>
                          <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.9 }}>
                            学校配布の初期パスワードは使い回さず、各利用者が固有の長いパスワードへ変更してください。
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </TabPanel>
        </Card>
      </motion.div>
    </Container>
  );
};

export default ProfilePage;
