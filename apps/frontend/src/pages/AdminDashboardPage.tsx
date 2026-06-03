import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  AdminPanelSettings,
  BugReport,
  LockReset,
  Logout,
  PauseCircleOutline,
  Refresh,
  School,
  SupportAgent,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { borderRadius, colors, shadows } from '../styles/design-system';

type SchoolStatus = 'active' | 'paused' | 'archived';
type SupportCategory = 'bug' | 'support' | 'request';
type SupportSeverity = 'low' | 'medium' | 'high' | 'critical';
type SupportStatus = 'open' | 'investigating' | 'resolved';

type TeacherFormRow = {
  name: string;
  email: string;
  login_id: string;
};

type IssuedTeacher = {
  status: 'created' | 'password_reset';
  teacher_id: string;
  name: string;
  email: string;
  login_id: string;
  temporary_password: string;
};

type CredentialResult = {
  school: {
    id: string;
    name: string;
    school_code: string;
  };
  teachers: IssuedTeacher[];
  issued_at: string;
};

type SchoolDirectoryItem = {
  id: string;
  name: string;
  school_code: string;
  created_at?: string;
  updated_at?: string;
  status: SchoolStatus;
  operator_notes?: string;
  teacher_count: number;
  student_count: number;
  support_ticket_count: number;
  can_delete: boolean;
  teacher_accounts: Array<{
    id: string;
    name?: string | null;
    email?: string | null;
    login_id?: string | null;
    updated_at?: string | null;
  }>;
};

type SupportTicket = {
  id: string;
  school_id: string;
  school_name?: string | null;
  school_code?: string | null;
  category: SupportCategory;
  severity: SupportSeverity;
  status: SupportStatus;
  title: string;
  description: string;
  source: string;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
};

type DashboardPayload = {
  summary: {
    schools_total: number;
    teachers_total: number;
    students_total: number;
    open_support_tickets: number;
  };
  schools: SchoolDirectoryItem[];
  support_tickets: SupportTicket[];
  schema: {
    school_management: boolean;
    support_tickets: boolean;
  };
  generated_at: string;
};

type SchoolEditorState = {
  status: SchoolStatus;
  operator_notes: string;
  teacher: TeacherFormRow;
};

type SupportEditorState = {
  status: SupportStatus;
  severity: SupportSeverity;
  admin_note: string;
};

const emptyTeacher = (): TeacherFormRow => ({
  name: '',
  email: '',
  login_id: '',
});

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '未記録';
  }

  const date = new Date(value);
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const schoolStatusMeta: Record<SchoolStatus, { label: string; bg: string; color: string }> = {
  active: { label: '稼働中', bg: colors.success.light, color: colors.success.dark },
  paused: { label: '停止中', bg: colors.warning.light, color: colors.warning.dark },
  archived: { label: 'アーカイブ', bg: colors.grey[100], color: colors.grey[700] },
};

const severityMeta: Record<SupportSeverity, { label: string; bg: string; color: string }> = {
  low: { label: '低', bg: colors.info.light, color: colors.info.dark },
  medium: { label: '中', bg: colors.warning.light, color: colors.warning.dark },
  high: { label: '高', bg: colors.error.light, color: colors.error.dark },
  critical: { label: '緊急', bg: '#2D2A26', color: '#FFF7EF' },
};

const supportStatusMeta: Record<SupportStatus, { label: string; bg: string; color: string }> = {
  open: { label: '未対応', bg: colors.error.light, color: colors.error.dark },
  investigating: { label: '調査中', bg: colors.warning.light, color: colors.warning.dark },
  resolved: { label: '解決済み', bg: colors.success.light, color: colors.success.dark },
};

const categoryLabels: Record<SupportCategory, string> = {
  bug: 'バグ',
  support: '問い合わせ',
  request: '要望',
};

const statCardSx = {
  borderRadius: borderRadius.xl,
  border: `1px solid ${colors.border.soft}`,
  background: 'linear-gradient(180deg, #fffdf8 0%, #fff6ea 100%)',
  boxShadow: shadows.card.default,
  padding: 3,
};

const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessToken, profile, signOut } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [credentialResult, setCredentialResult] = useState<CredentialResult | null>(null);
  const [createForm, setCreateForm] = useState({
    school_name: '',
    school_code: '',
    teachers: [emptyTeacher()],
  });
  const [schoolEditors, setSchoolEditors] = useState<Record<string, SchoolEditorState>>({});
  const [supportEditors, setSupportEditors] = useState<Record<string, SupportEditorState>>({});
  const [supportForm, setSupportForm] = useState({
    school_id: '',
    category: 'bug' as SupportCategory,
    severity: 'medium' as SupportSeverity,
    title: '',
    description: '',
  });

  const applyDashboardState = (payload: DashboardPayload) => {
    setDashboard(payload);
    setSchoolEditors(
      payload.schools.reduce<Record<string, SchoolEditorState>>((acc, school) => {
        acc[school.id] = {
          status: school.status || 'active',
          operator_notes: school.operator_notes || '',
          teacher: emptyTeacher(),
        };
        return acc;
      }, {})
    );
    setSupportEditors(
      payload.support_tickets.reduce<Record<string, SupportEditorState>>((acc, ticket) => {
        acc[ticket.id] = {
          status: ticket.status,
          severity: ticket.severity,
          admin_note: ticket.admin_note || '',
        };
        return acc;
      }, {})
    );
    setSupportForm((prev) => ({
      ...prev,
      school_id: prev.school_id || payload.schools[0]?.id || '',
    }));
  };

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/admin/dashboard?limit=24`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('開発者アカウントのみがこの画面を利用できます。');
        }
        throw new Error('開発者ダッシュボードの取得に失敗しました。');
      }

      const payload = (await response.json()) as DashboardPayload;
      applyDashboardState(payload);
    } catch (fetchError) {
      console.error('Admin dashboard fetch error:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'ダッシュボードの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const runAdminAction = async <T,>(
    key: string,
    request: () => Promise<T>,
    successMessage: string,
    options?: {
      preserveSuccess?: boolean;
      afterSuccess?: (result: T) => void;
    }
  ) => {
    setBusyKey(key);
    setError('');
    if (!options?.preserveSuccess) {
      setSuccess('');
    }

    try {
      const result = await request();
      setSuccess(successMessage);
      options?.afterSuccess?.(result);
      await fetchDashboard();
      return result;
    } catch (requestError) {
      console.error('Admin action error:', requestError);
      setError(requestError instanceof Error ? requestError.message : '操作に失敗しました。');
      return null;
    } finally {
      setBusyKey(null);
    }
  };

  const parseJsonResponse = async (response: Response) => {
    return response.json().catch(() => null);
  };

  const normalizeTeachers = (teachers: TeacherFormRow[]) =>
    teachers
      .map((teacher) => ({
        name: teacher.name.trim(),
        email: teacher.email.trim(),
        login_id: teacher.login_id.trim().toLowerCase(),
      }))
      .filter((teacher) => teacher.name || teacher.email || teacher.login_id);

  const handleCreateTeacherChange = (index: number, field: keyof TeacherFormRow, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      teachers: prev.teachers.map((teacher, teacherIndex) =>
        teacherIndex === index ? { ...teacher, [field]: value } : teacher
      ),
    }));
  };

  const addCreateTeacherRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      teachers: [...prev.teachers, emptyTeacher()],
    }));
  };

  const removeCreateTeacherRow = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      teachers: prev.teachers.filter((_teacher, teacherIndex) => teacherIndex !== index),
    }));
  };

  const handleIssueSchoolCredentials = async () => {
    const teachers = normalizeTeachers(createForm.teachers);
    if (!createForm.school_name.trim()) {
      setError('学校名を入力してください。');
      return;
    }
    if (!teachers.length) {
      setError('先生アカウントを1件以上入力してください。');
      return;
    }
    if (teachers.some((teacher) => !teacher.name || !teacher.email || !teacher.login_id)) {
      setError('先生アカウントは氏名・メールアドレス・ログインIDをすべて入力してください。');
      return;
    }

    await runAdminAction(
      'issue-school',
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/schools/issue-credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            school_name: createForm.school_name.trim(),
            school_code: createForm.school_code.trim() || undefined,
            teachers,
          }),
        });
        const payload = (await parseJsonResponse(response)) as CredentialResult | { detail?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.detail || '認証情報の発行に失敗しました。');
        }
        setCredentialResult(payload as CredentialResult);
        setCreateForm({
          school_name: '',
          school_code: '',
          teachers: [emptyTeacher()],
        });
        return payload as CredentialResult;
      },
      '学校データと先生用初期認証情報を発行しました。'
    );
  };

  const handleSchoolEditorChange = (schoolId: string, field: 'status' | 'operator_notes', value: string) => {
    setSchoolEditors((prev) => ({
      ...prev,
      [schoolId]: {
        ...prev[schoolId],
        [field]: value,
      },
    }));
  };

  const handleInlineTeacherChange = (schoolId: string, field: keyof TeacherFormRow, value: string) => {
    setSchoolEditors((prev) => ({
      ...prev,
      [schoolId]: {
        ...prev[schoolId],
        teacher: {
          ...prev[schoolId].teacher,
          [field]: value,
        },
      },
    }));
  };

  const handleSaveSchool = async (schoolId: string) => {
    const editor = schoolEditors[schoolId];
    if (!editor) {
      return;
    }

    await runAdminAction(
      `save-school-${schoolId}`,
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/schools/${schoolId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: editor.status,
            operator_notes: editor.operator_notes,
          }),
        });
        const payload = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(payload?.detail || '学校情報の更新に失敗しました。');
        }
        return payload;
      },
      '学校情報を更新しました。'
    );
  };

  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    if (!window.confirm(`「${schoolName}」を削除します。空の学校データのみ削除できます。続行しますか？`)) {
      return;
    }

    await runAdminAction(
      `delete-school-${schoolId}`,
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/schools/${schoolId}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(payload?.detail || '学校削除に失敗しました。');
        }
        return payload;
      },
      '学校データを削除しました。'
    );
  };

  const handleAddTeacherToSchool = async (school: SchoolDirectoryItem) => {
    const teacher = schoolEditors[school.id]?.teacher;
    if (!teacher) {
      return;
    }
    const teachers = normalizeTeachers([teacher]);
    if (!teachers.length || !teachers[0].name || !teachers[0].email || !teachers[0].login_id) {
      setError('追加する先生の氏名・メールアドレス・ログインIDをすべて入力してください。');
      return;
    }

    await runAdminAction(
      `add-teacher-${school.id}`,
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/schools/${school.id}/teachers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ teachers }),
        });
        const payload = (await parseJsonResponse(response)) as CredentialResult | { detail?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.detail || '先生アカウント追加に失敗しました。');
        }
        setCredentialResult(payload as CredentialResult);
        setSchoolEditors((prev) => ({
          ...prev,
          [school.id]: {
            ...prev[school.id],
            teacher: emptyTeacher(),
          },
        }));
        return payload as CredentialResult;
      },
      `${school.name} に先生アカウントを追加しました。`
    );
  };

  const handleResetTeacherPassword = async (teacherId: string) => {
    await runAdminAction(
      `reset-teacher-${teacherId}`,
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/teachers/${teacherId}/reset-password`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const payload = (await parseJsonResponse(response)) as CredentialResult | { detail?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.detail || '先生パスワード再発行に失敗しました。');
        }
        setCredentialResult(payload as CredentialResult);
        return payload as CredentialResult;
      },
      '先生の初期パスワードを再発行しました。'
    );
  };

  const handleSupportFormChange = (field: string, value: string) => {
    setSupportForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateSupportTicket = async () => {
    if (!supportForm.school_id || !supportForm.title.trim() || !supportForm.description.trim()) {
      setError('バグ報告は学校・件名・内容を入力してください。');
      return;
    }

    await runAdminAction(
      'create-support-ticket',
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/support-tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            school_id: supportForm.school_id,
            category: supportForm.category,
            severity: supportForm.severity,
            title: supportForm.title.trim(),
            description: supportForm.description.trim(),
            source: 'manual',
          }),
        });
        const payload = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(payload?.detail || 'バグ報告の登録に失敗しました。');
        }
        setSupportForm((prev) => ({
          ...prev,
          title: '',
          description: '',
        }));
        return payload;
      },
      'バグ報告を登録しました。'
    );
  };

  const handleSupportEditorChange = (ticketId: string, field: keyof SupportEditorState, value: string) => {
    setSupportEditors((prev) => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        [field]: value,
      },
    }));
  };

  const handleUpdateSupportTicket = async (ticketId: string) => {
    const editor = supportEditors[ticketId];
    if (!editor) {
      return;
    }

    await runAdminAction(
      `update-ticket-${ticketId}`,
      async () => {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/admin/support-tickets/${ticketId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            status: editor.status,
            severity: editor.severity,
            admin_note: editor.admin_note,
          }),
        });
        const payload = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(payload?.detail || 'バグ報告の更新に失敗しました。');
        }
        return payload;
      },
      'バグ報告を更新しました。'
    );
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/signin', { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(255, 178, 126, 0.18), transparent 28%), linear-gradient(180deg, #fffaf0 0%, #fff3e1 100%)',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Stack spacing={3.5}>
          <Paper
            sx={{
              borderRadius: borderRadius.xl,
              p: { xs: 2.5, md: 4 },
              border: `1px solid ${colors.border.warm}`,
              boxShadow: shadows.lg,
              background:
                'linear-gradient(140deg, rgba(255,255,255,0.97) 0%, rgba(255,243,224,0.95) 55%, rgba(239,250,255,0.9) 100%)',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
              <Stack spacing={1.5}>
                <Chip
                  icon={<AdminPanelSettings />}
                  label="開発者用ダッシュボード"
                  sx={{
                    alignSelf: 'flex-start',
                    backgroundColor: colors.trustBlue.soft,
                    color: colors.trustBlue.strong,
                    border: `1px solid ${colors.border.soft}`,
                  }}
                />
                <Typography variant="h4" sx={{ fontWeight: 700, color: colors.text.primary }}>
                  学校導入と運営管理
                </Typography>
                <Typography variant="body1" sx={{ color: colors.text.secondary, maxWidth: 780 }}>
                  学校作成、先生の追加と初期パスワード再発行、学校の停止や運営メモ、学校別のバグ報告を一箇所で扱います。
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip icon={<School />} label={`ログイン中: ${profile?.email || 'admin'}`} sx={{ backgroundColor: colors.background.paper }} />
                  <Chip label={dashboard ? `最終更新 ${formatDateTime(dashboard.generated_at)}` : '読込中'} sx={{ backgroundColor: colors.background.paper }} />
                </Stack>
              </Stack>
              <Stack direction={{ xs: 'row', md: 'column' }} spacing={1.25} alignItems={{ md: 'flex-end' }}>
                <Button variant="outlined" startIcon={<Refresh />} onClick={() => void fetchDashboard()}>
                  更新
                </Button>
                <Button variant="outlined" color="inherit" startIcon={<Logout />} onClick={handleLogout}>
                  ログアウト
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {(error || success) && (
            <Stack spacing={1.5}>
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
            </Stack>
          )}

          {dashboard && (!dashboard.schema.school_management || !dashboard.schema.support_tickets) && (
            <Alert severity="warning">
              追加した運営機能の一部は Supabase スキーマ適用後に有効になります。
              `apps/backend/schema/admin_school_management_schema.sql` を適用してください。
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            <Paper sx={statCardSx}>
              <Typography variant="body2" sx={{ color: colors.text.muted }}>導入学校数</Typography>
              <Typography variant="h3" sx={{ mt: 1, fontWeight: 700 }}>{dashboard?.summary.schools_total ?? '-'}</Typography>
            </Paper>
            <Paper sx={statCardSx}>
              <Typography variant="body2" sx={{ color: colors.text.muted }}>先生アカウント数</Typography>
              <Typography variant="h3" sx={{ mt: 1, fontWeight: 700 }}>{dashboard?.summary.teachers_total ?? '-'}</Typography>
            </Paper>
            <Paper sx={statCardSx}>
              <Typography variant="body2" sx={{ color: colors.text.muted }}>生徒アカウント数</Typography>
              <Typography variant="h3" sx={{ mt: 1, fontWeight: 700 }}>{dashboard?.summary.students_total ?? '-'}</Typography>
            </Paper>
            <Paper sx={statCardSx}>
              <Typography variant="body2" sx={{ color: colors.text.muted }}>未解決の報告</Typography>
              <Typography variant="h3" sx={{ mt: 1, fontWeight: 700 }}>{dashboard?.summary.open_support_tickets ?? '-'}</Typography>
            </Paper>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.15fr) minmax(0, 0.85fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Paper
              sx={{
                borderRadius: borderRadius.xl,
                p: { xs: 2.5, md: 3 },
                border: `1px solid ${colors.border.soft}`,
                boxShadow: shadows.card.default,
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>学校作成と初期認証情報発行</Typography>
                  <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.75 }}>
                    学校名を起点に学校データを作成し、先生アカウントをまとめて発行します。
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  <TextField
                    label="学校名"
                    value={createForm.school_name}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, school_name: event.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="学校ID（任意）"
                    value={createForm.school_code}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, school_code: event.target.value.toUpperCase() }))}
                    helperText="空欄なら高エントロピーの学校IDを自動生成します。"
                    fullWidth
                  />
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>先生アカウント</Typography>
                    <Button startIcon={<Add />} onClick={addCreateTeacherRow}>先生を追加</Button>
                  </Stack>

                  {createForm.teachers.map((teacher, index) => (
                    <Paper
                      key={`create-teacher-${index}`}
                      sx={{
                        p: 2,
                        borderRadius: borderRadius.lg,
                        backgroundColor: colors.background.subtle,
                        border: `1px solid ${colors.border.soft}`,
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: colors.text.secondary }}>
                          先生 {index + 1}
                        </Typography>
                        <TextField label="氏名" value={teacher.name} onChange={(event) => handleCreateTeacherChange(index, 'name', event.target.value)} fullWidth />
                        <TextField label="メールアドレス" value={teacher.email} onChange={(event) => handleCreateTeacherChange(index, 'email', event.target.value)} fullWidth />
                        <TextField label="ログインID" value={teacher.login_id} onChange={(event) => handleCreateTeacherChange(index, 'login_id', event.target.value)} fullWidth />
                        {createForm.teachers.length > 1 && (
                          <Button color="inherit" onClick={() => removeCreateTeacherRow(index)}>
                            この先生を削除
                          </Button>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={handleIssueSchoolCredentials}
                    disabled={busyKey === 'issue-school'}
                    sx={{ minWidth: 220 }}
                  >
                    {busyKey === 'issue-school' ? '発行中...' : '学校IDと初期パスワードを発行'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setCreateForm({
                        school_name: '',
                        school_code: '',
                        teachers: [emptyTeacher()],
                      })
                    }
                    disabled={busyKey === 'issue-school'}
                  >
                    入力をクリア
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Stack spacing={3}>
              <Paper
                sx={{
                  borderRadius: borderRadius.xl,
                  p: { xs: 2.5, md: 3 },
                  border: `1px solid ${colors.border.soft}`,
                  boxShadow: shadows.card.default,
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>今回の認証情報</Typography>
                  {credentialResult ? (
                    <Stack spacing={1.5}>
                      <Alert severity="warning">
                        初期パスワードはここでのみ表示します。先生への共有後は、再表示ではなく再発行で扱ってください。
                      </Alert>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: borderRadius.lg,
                          backgroundColor: colors.background.subtle,
                          border: `1px solid ${colors.border.soft}`,
                        }}
                      >
                        <Typography variant="body2" sx={{ color: colors.text.secondary }}>学校名</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{credentialResult.school.name}</Typography>
                        <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 1 }}>学校ID</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.06em' }}>
                          {credentialResult.school.school_code}
                        </Typography>
                      </Paper>
                      {credentialResult.teachers.map((teacher) => (
                        <Paper key={teacher.teacher_id} sx={{ p: 2, borderRadius: borderRadius.lg, border: `1px solid ${colors.border.soft}` }}>
                          <Stack spacing={0.75}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              <Chip
                                label={teacher.status === 'created' ? '新規作成' : '初期パスワード再発行'}
                                size="small"
                                sx={{
                                  backgroundColor: teacher.status === 'created' ? colors.success.light : colors.warning.light,
                                }}
                              />
                              <Chip label={teacher.login_id} size="small" variant="outlined" />
                            </Stack>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>{teacher.name}</Typography>
                            <Typography variant="body2" sx={{ color: colors.text.secondary }}>{teacher.email}</Typography>
                            <Typography variant="body2" sx={{ color: colors.text.muted }}>初期パスワード</Typography>
                            <Typography
                              component="code"
                              sx={{
                                display: 'inline-block',
                                px: 1.25,
                                py: 0.75,
                                borderRadius: borderRadius.md,
                                backgroundColor: '#201a16',
                                color: '#fff7ef',
                                fontFamily: '"Roboto Mono", monospace',
                                fontSize: '0.95rem',
                              }}
                            >
                              {teacher.temporary_password}
                            </Typography>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                      学校作成、先生追加、先生パスワード再発行の結果をここに表示します。
                    </Typography>
                  )}
                </Stack>
              </Paper>

              <Paper
                sx={{
                  borderRadius: borderRadius.xl,
                  p: { xs: 2.5, md: 3 },
                  border: `1px solid ${colors.border.soft}`,
                  boxShadow: shadows.card.default,
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>運営で使う主な操作</Typography>
                  <Stack spacing={1.25}>
                    <Chip icon={<LockReset />} label="先生追加と初期パスワード再発行" sx={{ justifyContent: 'flex-start' }} />
                    <Chip icon={<PauseCircleOutline />} label="学校の停止・アーカイブ・運営メモ" sx={{ justifyContent: 'flex-start' }} />
                    <Chip icon={<BugReport />} label="学校別のバグ報告と問い合わせ管理" sx={{ justifyContent: 'flex-start' }} />
                  </Stack>
                </Stack>
              </Paper>
            </Stack>
          </Box>

          <Paper
            sx={{
              borderRadius: borderRadius.xl,
              p: { xs: 2.5, md: 3 },
              border: `1px solid ${colors.border.soft}`,
              boxShadow: shadows.card.default,
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>導入済み学校</Typography>
                <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.75 }}>
                  学校ごとの停止状態、運営メモ、先生追加、先生パスワード再発行を扱えます。
                </Typography>
              </Box>

              {isLoading ? (
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>読み込み中...</Typography>
              ) : dashboard?.schools.length ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  {dashboard.schools.map((school) => {
                    const editor = schoolEditors[school.id];
                    return (
                      <Paper
                        key={school.id}
                        sx={{
                          p: 2.25,
                          borderRadius: borderRadius.lg,
                          border: `1px solid ${colors.border.soft}`,
                          backgroundColor: colors.background.paper,
                        }}
                      >
                        <Stack spacing={1.75}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>{school.name}</Typography>
                              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                                発行日 {formatDateTime(school.created_at)}
                              </Typography>
                            </Box>
                            <Chip label={school.school_code} sx={{ fontWeight: 700, letterSpacing: '0.05em' }} />
                          </Stack>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip
                              label={schoolStatusMeta[editor?.status || school.status].label}
                              size="small"
                              sx={{
                                backgroundColor: schoolStatusMeta[editor?.status || school.status].bg,
                                color: schoolStatusMeta[editor?.status || school.status].color,
                              }}
                            />
                            <Chip label={`先生 ${school.teacher_count}`} size="small" />
                            <Chip label={`生徒 ${school.student_count}`} size="small" />
                            <Chip label={`報告 ${school.support_ticket_count}`} size="small" />
                          </Stack>

                          <FormControl fullWidth size="small" disabled={!dashboard.schema.school_management}>
                            <InputLabel>学校の状態</InputLabel>
                            <Select
                              label="学校の状態"
                              value={editor?.status || school.status}
                              onChange={(event) => handleSchoolEditorChange(school.id, 'status', event.target.value)}
                            >
                              <MenuItem value="active">稼働中</MenuItem>
                              <MenuItem value="paused">停止中</MenuItem>
                              <MenuItem value="archived">アーカイブ</MenuItem>
                            </Select>
                          </FormControl>

                          <TextField
                            label="運営メモ"
                            value={editor?.operator_notes || ''}
                            onChange={(event) => handleSchoolEditorChange(school.id, 'operator_notes', event.target.value)}
                            minRows={3}
                            multiline
                            disabled={!dashboard.schema.school_management}
                          />

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                            <Button
                              variant="contained"
                              onClick={() => void handleSaveSchool(school.id)}
                              disabled={!dashboard.schema.school_management || busyKey === `save-school-${school.id}`}
                            >
                              {busyKey === `save-school-${school.id}` ? '保存中...' : '学校情報を保存'}
                            </Button>
                            <Button
                              variant="outlined"
                              color="inherit"
                              onClick={() => void handleDeleteSchool(school.id, school.name)}
                              disabled={!school.can_delete || busyKey === `delete-school-${school.id}`}
                            >
                              {busyKey === `delete-school-${school.id}` ? '削除中...' : '空の学校を削除'}
                            </Button>
                          </Stack>

                          <Divider />

                          <Stack spacing={1}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: colors.text.secondary }}>
                              先生アカウント
                            </Typography>
                            {school.teacher_accounts.length ? (
                              school.teacher_accounts.map((teacher) => (
                                <Box
                                  key={teacher.id}
                                  sx={{
                                    p: 1.5,
                                    borderRadius: borderRadius.md,
                                    backgroundColor: colors.background.subtle,
                                  }}
                                >
                                  <Stack spacing={0.75}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {teacher.name || teacher.email || '未設定'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: colors.text.secondary, display: 'block' }}>
                                      {teacher.email || 'メール未設定'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: colors.text.muted, display: 'block' }}>
                                      ログインID: {teacher.login_id || '未設定'} / 更新 {formatDateTime(teacher.updated_at)}
                                    </Typography>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<LockReset />}
                                      onClick={() => void handleResetTeacherPassword(teacher.id)}
                                      disabled={busyKey === `reset-teacher-${teacher.id}`}
                                      sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                                    >
                                      {busyKey === `reset-teacher-${teacher.id}` ? '再発行中...' : '初期パスワード再発行'}
                                    </Button>
                                  </Stack>
                                </Box>
                              ))
                            ) : (
                              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                                先生アカウントはまだありません。
                              </Typography>
                            )}
                          </Stack>

                          <Divider />

                          <Stack spacing={1.25}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: colors.text.secondary }}>
                              この学校に先生を追加
                            </Typography>
                            <TextField
                              label="氏名"
                              value={editor?.teacher.name || ''}
                              onChange={(event) => handleInlineTeacherChange(school.id, 'name', event.target.value)}
                              size="small"
                              fullWidth
                            />
                            <TextField
                              label="メールアドレス"
                              value={editor?.teacher.email || ''}
                              onChange={(event) => handleInlineTeacherChange(school.id, 'email', event.target.value)}
                              size="small"
                              fullWidth
                            />
                            <TextField
                              label="ログインID"
                              value={editor?.teacher.login_id || ''}
                              onChange={(event) => handleInlineTeacherChange(school.id, 'login_id', event.target.value)}
                              size="small"
                              fullWidth
                            />
                            <Button
                              variant="outlined"
                              startIcon={<Add />}
                              onClick={() => void handleAddTeacherToSchool(school)}
                              disabled={busyKey === `add-teacher-${school.id}`}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              {busyKey === `add-teacher-${school.id}` ? '追加中...' : '先生を追加'}
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                  まだ学校データがありません。上のフォームから最初の学校を作成してください。
                </Typography>
              )}
            </Stack>
          </Paper>

          <Paper
            sx={{
              borderRadius: borderRadius.xl,
              p: { xs: 2.5, md: 3 },
              border: `1px solid ${colors.border.soft}`,
              boxShadow: shadows.card.default,
            }}
          >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>学校別のバグ報告・問い合わせ</Typography>
                <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.75 }}>
                  学校とのやり取りや不具合を学校単位で集約して、対応状態を追えます。
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' },
                  gap: 3,
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: borderRadius.lg,
                    border: `1px solid ${colors.border.soft}`,
                    backgroundColor: colors.background.subtle,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>報告を追加</Typography>
                    <FormControl fullWidth size="small">
                      <InputLabel>学校</InputLabel>
                      <Select
                        label="学校"
                        value={supportForm.school_id}
                        onChange={(event) => handleSupportFormChange('school_id', event.target.value)}
                      >
                        {dashboard?.schools.map((school) => (
                          <MenuItem key={school.id} value={school.id}>
                            {school.name} ({school.school_code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                      <FormControl fullWidth size="small">
                        <InputLabel>種別</InputLabel>
                        <Select
                          label="種別"
                          value={supportForm.category}
                          onChange={(event) => handleSupportFormChange('category', event.target.value)}
                        >
                          <MenuItem value="bug">バグ</MenuItem>
                          <MenuItem value="support">問い合わせ</MenuItem>
                          <MenuItem value="request">要望</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth size="small">
                        <InputLabel>優先度</InputLabel>
                        <Select
                          label="優先度"
                          value={supportForm.severity}
                          onChange={(event) => handleSupportFormChange('severity', event.target.value)}
                        >
                          <MenuItem value="low">低</MenuItem>
                          <MenuItem value="medium">中</MenuItem>
                          <MenuItem value="high">高</MenuItem>
                          <MenuItem value="critical">緊急</MenuItem>
                        </Select>
                      </FormControl>
                    </Stack>
                    <TextField label="件名" value={supportForm.title} onChange={(event) => handleSupportFormChange('title', event.target.value)} fullWidth />
                    <TextField
                      label="内容"
                      value={supportForm.description}
                      onChange={(event) => handleSupportFormChange('description', event.target.value)}
                      minRows={4}
                      multiline
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      startIcon={<SupportAgent />}
                      onClick={handleCreateSupportTicket}
                      disabled={!dashboard?.schema.support_tickets || busyKey === 'create-support-ticket'}
                    >
                      {busyKey === 'create-support-ticket' ? '登録中...' : '報告を登録'}
                    </Button>
                  </Stack>
                </Paper>

                <Stack spacing={1.5}>
                  {dashboard?.support_tickets.length ? (
                    dashboard.support_tickets.map((ticket) => {
                      const editor = supportEditors[ticket.id];
                      return (
                        <Paper
                          key={ticket.id}
                          sx={{
                            p: 2,
                            borderRadius: borderRadius.lg,
                            border: `1px solid ${colors.border.soft}`,
                            backgroundColor: colors.background.paper,
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" spacing={1.5} flexWrap="wrap" useFlexGap>
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  size="small"
                                  label={categoryLabels[ticket.category]}
                                  sx={{ backgroundColor: colors.trustBlue.soft, color: colors.trustBlue.strong }}
                                />
                                <Chip
                                  size="small"
                                  label={severityMeta[editor?.severity || ticket.severity].label}
                                  sx={{
                                    backgroundColor: severityMeta[editor?.severity || ticket.severity].bg,
                                    color: severityMeta[editor?.severity || ticket.severity].color,
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={supportStatusMeta[editor?.status || ticket.status].label}
                                  sx={{
                                    backgroundColor: supportStatusMeta[editor?.status || ticket.status].bg,
                                    color: supportStatusMeta[editor?.status || ticket.status].color,
                                  }}
                                />
                              </Stack>
                              <Typography variant="caption" sx={{ color: colors.text.muted }}>
                                {ticket.school_name || '学校未設定'} / {ticket.school_code || 'コードなし'}
                              </Typography>
                            </Stack>

                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>{ticket.title}</Typography>
                              <Typography variant="body2" sx={{ color: colors.text.secondary, mt: 0.75, whiteSpace: 'pre-wrap' }}>
                                {ticket.description}
                              </Typography>
                            </Box>

                            <Typography variant="caption" sx={{ color: colors.text.muted }}>
                              登録 {formatDateTime(ticket.created_at)} / 更新 {formatDateTime(ticket.updated_at)}
                            </Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                              <FormControl fullWidth size="small">
                                <InputLabel>対応状態</InputLabel>
                                <Select
                                  label="対応状態"
                                  value={editor?.status || ticket.status}
                                  onChange={(event) => handleSupportEditorChange(ticket.id, 'status', event.target.value)}
                                >
                                  <MenuItem value="open">未対応</MenuItem>
                                  <MenuItem value="investigating">調査中</MenuItem>
                                  <MenuItem value="resolved">解決済み</MenuItem>
                                </Select>
                              </FormControl>
                              <FormControl fullWidth size="small">
                                <InputLabel>優先度</InputLabel>
                                <Select
                                  label="優先度"
                                  value={editor?.severity || ticket.severity}
                                  onChange={(event) => handleSupportEditorChange(ticket.id, 'severity', event.target.value)}
                                >
                                  <MenuItem value="low">低</MenuItem>
                                  <MenuItem value="medium">中</MenuItem>
                                  <MenuItem value="high">高</MenuItem>
                                  <MenuItem value="critical">緊急</MenuItem>
                                </Select>
                              </FormControl>
                            </Stack>

                            <TextField
                              label="対応メモ"
                              value={editor?.admin_note || ''}
                              onChange={(event) => handleSupportEditorChange(ticket.id, 'admin_note', event.target.value)}
                              minRows={2}
                              multiline
                              fullWidth
                            />

                            <Button
                              variant="outlined"
                              onClick={() => void handleUpdateSupportTicket(ticket.id)}
                              disabled={!dashboard?.schema.support_tickets || busyKey === `update-ticket-${ticket.id}`}
                              sx={{ alignSelf: 'flex-start' }}
                            >
                              {busyKey === `update-ticket-${ticket.id}` ? '更新中...' : '報告を更新'}
                            </Button>
                          </Stack>
                        </Paper>
                      );
                    })
                  ) : (
                    <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                      まだ報告はありません。
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default AdminDashboardPage;
