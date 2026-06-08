import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CheckCircle, DataObjectOutlined, Person, School } from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/Auth/AuthShell';
import InterestTagPicker from '../components/Profile/InterestTagPicker';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../styles/design-system';
import { getPostOnboardingRoute } from '../utils/onboardingGuards';

type StepIndex = 0 | 1 | 2 | 3;
type MigrationChoice = 'no' | 'yes';

const stepTitles = [
  {
    title: '前のデータについて',
    body: '昨年度使っていた人だけ、引き継ぎ希望を残せます。わからなければ新しく始めて大丈夫です。',
  },
  {
    title: '基本情報',
    body: 'アプリ内で使う名前と、学校から配られている場合は学校コードを入力します。',
  },
  {
    title: '興味を選ぶ',
    body: '好きなものや気になるものを、まず一つ選びます。探究テーマの材料になります。',
  },
  {
    title: 'テーマを書く',
    body: 'すでに考えていることがあれば書きます。まだ決まっていなければスキップできます。',
  },
];

const getNextLabel = (step: StepIndex) => {
  const remaining = 3 - step;
  if (remaining <= 0) {
    return '入力した内容で始める';
  }
  return `次へ（あと${remaining}ステップ）`;
};

const getFriendlyOnboardingError = (message: string) => {
  if (message.includes('legacy_username')) {
    return '引き継ぎを希望する場合は、以前使っていたユーザー名を入力してください。';
  }
  if (
    message.includes('Failed to complete onboarding') ||
    message.includes('schema cache') ||
    message.includes('profiles') ||
    message.includes('Failed to update profile')
  ) {
    return '設定の保存中に問題が起きました。入力内容ではなく、システム側の準備が必要な可能性があります。時間をおいてもう一度お試しください。';
  }
  return message || '設定の保存中に問題が起きました。時間をおいてもう一度お試しください。';
};

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { user, getAccessToken, getProfile } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [migrationChoice, setMigrationChoice] = useState<MigrationChoice>('no');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    legacyUsername: '',
    migrationNote: '',
    name: '',
    schoolCode: '',
    grade: '',
    className: '',
    attendanceNumber: '',
    interests: [] as string[],
    theme: '',
    question: '',
    hypothesis: '',
  });

  const [formErrors, setFormErrors] = useState({
    legacyUsername: '',
    name: '',
    schoolCode: '',
    grade: '',
    className: '',
    attendanceNumber: '',
    interests: '',
  });

  const [schoolInfo, setSchoolInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showClassInfo, setShowClassInfo] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const clearError = (field: keyof typeof formErrors) => {
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name in formErrors) {
      clearError(name as keyof typeof formErrors);
    }
  };

  const handleInterestsChange = (interests: string[]) => {
    setFormData((prev) => ({ ...prev, interests }));
    clearError('interests');
  };

  const handleSchoolCodeInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const code = event.target.value;
    handleInputChange(event);

    if (code.length >= 6) {
      await verifySchoolCode(code);
    } else {
      setShowClassInfo(false);
      setSchoolInfo(null);
    }
  };

  const verifySchoolCode = async (code: string) => {
    setIsVerifyingCode(true);
    setError(null);

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/auth/verify-school-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ school_code: code }),
      });

      if (!response.ok) {
        setFormErrors((prev) => ({ ...prev, schoolCode: '学校コードが正しくありません' }));
        setShowClassInfo(false);
        setSchoolInfo(null);
      } else {
        const payload = await response.json();
        setSchoolInfo(payload.school);
        setShowClassInfo(true);
        setFormErrors((prev) => ({ ...prev, schoolCode: '' }));
      }
    } catch (err) {
      console.error('School code verification error:', err);
      setFormErrors((prev) => ({ ...prev, schoolCode: 'エラーが発生しました' }));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const validateTransfer = () => {
    const legacyUsername = migrationChoice === 'yes' && !formData.legacyUsername.trim()
      ? '覚えている旧ユーザー名を入力してください'
      : '';
    setFormErrors((prev) => ({ ...prev, legacyUsername }));
    return !legacyUsername;
  };

  const validateBasicInfo = () => {
    const nextErrors = {
      legacyUsername: '',
      name: '',
      schoolCode: formErrors.schoolCode,
      grade: '',
      className: '',
      attendanceNumber: '',
      interests: '',
    };

    if (!formData.name.trim()) {
      nextErrors.name = '名前を入力してください';
    }

    if (showClassInfo) {
      if (!formData.grade) {
        nextErrors.grade = '学年を選択してください';
      }
      if (!formData.className.trim()) {
        nextErrors.className = 'クラスを入力してください';
      }
      if (!formData.attendanceNumber) {
        nextErrors.attendanceNumber = '出席番号を入力してください';
      }
    }

    setFormErrors(nextErrors);
    return !nextErrors.name && !nextErrors.schoolCode && !nextErrors.grade && !nextErrors.className && !nextErrors.attendanceNumber;
  };

  const validateInterests = () => {
    if (formData.interests.length === 0) {
      setFormErrors((prev) => ({ ...prev, interests: 'まず一つ、好きなものや気になるものを選んでください' }));
      return false;
    }
    return true;
  };

  const validateCurrentStep = () => {
    if (currentStep === 0) {
      return validateTransfer();
    }
    if (currentStep === 1) {
      return validateBasicInfo();
    }
    if (currentStep === 2) {
      return validateInterests();
    }
    return true;
  };

  const goNext = () => {
    setError(null);
    if (!validateCurrentStep()) {
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, 3) as StepIndex);
  };

  const goBack = () => {
    setError(null);
    setCurrentStep((step) => Math.max(step - 1, 0) as StepIndex);
  };

  const submitOnboarding = async () => {
    if (!validateTransfer() || !validateBasicInfo() || !validateInterests()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const requestBody: Record<string, unknown> = {
        name: formData.name.trim(),
        interests: formData.interests,
        migration_requested: migrationChoice === 'yes',
        theme: formData.theme.trim() || null,
        question: formData.question.trim() || null,
        hypothesis: formData.hypothesis.trim() || null,
      };

      if (migrationChoice === 'yes') {
        requestBody.legacy_username = formData.legacyUsername.trim();
        requestBody.migration_note = formData.migrationNote.trim() || null;
      }

      if (schoolInfo) {
        requestBody.school_code = formData.schoolCode.trim();
        requestBody.grade = formData.grade;
        requestBody.class_name = formData.className.trim();
        requestBody.attendance_number = parseInt(formData.attendanceNumber, 10);
      }

      const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || 'プロフィールの更新に失敗しました');
      }

      const updatedProfile = payload?.profile;
      const syncedProfile = await getProfile();
      const nextProfile = syncedProfile || updatedProfile;

      setSuccess(true);

      setTimeout(() => {
        navigate(getPostOnboardingRoute(nextProfile));
      }, 900);
    } catch (err) {
      console.error('Profile update error:', err);
      setError(
        err instanceof Error
          ? getFriendlyOnboardingError(err.message)
          : '設定の保存中に問題が起きました。時間をおいてもう一度お試しください。'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentStep === 3) {
      await submitOnboarding();
    } else {
      goNext();
    }
  };

  const currentMeta = stepTitles[currentStep];
  const remainingLabel = currentStep === 3 ? '最後の入力です' : `あと${3 - currentStep}ステップ`;

  const renderStepHeader = () => (
    <Box sx={{ mb: { xs: 3, sm: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
        <Typography variant="body2" sx={{ color: colors.accentWarm.active, fontWeight: 800 }}>
          {currentStep + 1}/4
        </Typography>
        <Typography variant="caption" sx={{ color: colors.text.secondary }}>
          {remainingLabel}
        </Typography>
      </Stack>
      <Typography component="h2" variant="h5" sx={{ mt: 0.75, color: colors.text.primary, fontWeight: 800 }}>
        {currentMeta.title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1.25, color: colors.text.secondary, lineHeight: 1.9 }}>
        {currentMeta.body}
      </Typography>
    </Box>
  );

  const renderTransferStep = () => (
    <Stack spacing={2.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <Button
          type="button"
          fullWidth
          variant={migrationChoice === 'no' ? 'contained' : 'outlined'}
          onClick={() => {
            setMigrationChoice('no');
            clearError('legacyUsername');
          }}
        >
          新しく始める
        </Button>
        <Button
          type="button"
          fullWidth
          variant={migrationChoice === 'yes' ? 'contained' : 'outlined'}
          onClick={() => setMigrationChoice('yes')}
          startIcon={<DataObjectOutlined />}
        >
          引き継ぎを希望する
        </Button>
      </Stack>

      <AnimatePresence initial={false}>
        {migrationChoice === 'yes' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Stack spacing={2} sx={{ mt: 1.5 }}>
              <Alert severity="info">
                引き継ぎは自動ではなく、運営が確認します。覚えている範囲で入力してください。
              </Alert>
              <TextField
                required
                fullWidth
                id="legacyUsername"
                label="以前使っていたユーザー名"
                name="legacyUsername"
                value={formData.legacyUsername}
                onChange={handleInputChange}
                error={Boolean(formErrors.legacyUsername)}
                helperText={formErrors.legacyUsername || 'わからない場合は、表示名や思い当たる名前でも大丈夫です'}
              />
              <TextField
                fullWidth
                id="migrationNote"
                label="補足（任意）"
                name="migrationNote"
                value={formData.migrationNote}
                onChange={handleInputChange}
                helperText="学校名、使っていた時期など"
                multiline
                minRows={2}
              />
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
    </Stack>
  );

  const renderBasicStep = () => (
    <Stack spacing={2.25}>
      <TextField
        required
        fullWidth
        id="name"
        label="名前"
        name="name"
        autoComplete="name"
        autoFocus
        value={formData.name}
        onChange={handleInputChange}
        error={Boolean(formErrors.name)}
        helperText={formErrors.name || '画面に表示される名前です'}
        InputProps={{
          startAdornment: <Person color="action" sx={{ mr: 1 }} />,
        }}
      />

      <TextField
        fullWidth
        id="schoolCode"
        label="学校コード（任意）"
        name="schoolCode"
        value={formData.schoolCode}
        onChange={handleSchoolCodeInput}
        error={Boolean(formErrors.schoolCode)}
        helperText={formErrors.schoolCode || '学校から配布されたコードがある人だけ入力します'}
        InputProps={{
          startAdornment: <School color="action" sx={{ mr: 1 }} />,
          endAdornment: isVerifyingCode && <CircularProgress size={20} />,
        }}
      />

      {schoolInfo && (
        <Alert severity="success" icon={<CheckCircle />}>
          <Typography variant="body2">
            <strong>{schoolInfo.name}</strong>が確認されました
          </Typography>
        </Alert>
      )}

      <AnimatePresence>
        {showClassInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Stack
              spacing={1.25}
              sx={{
                mt: 1,
                p: 1.75,
                bgcolor: colors.background.subtle,
                borderRadius: '18px',
                border: `1px solid ${colors.border.soft}`,
              }}
            >
              <Typography variant="body2" sx={{ color: colors.text.secondary, fontWeight: 700 }}>
                クラス情報
              </Typography>

              <FormControl fullWidth error={Boolean(formErrors.grade)}>
                <InputLabel id="grade-label">学年</InputLabel>
                <Select
                  labelId="grade-label"
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  label="学年"
                  onChange={handleInputChange}
                >
                  <MenuItem value="1年">1年</MenuItem>
                  <MenuItem value="2年">2年</MenuItem>
                  <MenuItem value="3年">3年</MenuItem>
                </Select>
                {formErrors.grade && (
                  <Typography variant="caption" color="error">
                    {formErrors.grade}
                  </Typography>
                )}
              </FormControl>

              <TextField
                fullWidth
                id="className"
                label="クラス（例：1組、A組）"
                name="className"
                value={formData.className}
                onChange={handleInputChange}
                error={Boolean(formErrors.className)}
                helperText={formErrors.className}
              />

              <TextField
                fullWidth
                id="attendanceNumber"
                label="出席番号"
                name="attendanceNumber"
                type="number"
                value={formData.attendanceNumber}
                onChange={handleInputChange}
                error={Boolean(formErrors.attendanceNumber)}
                helperText={formErrors.attendanceNumber}
                inputProps={{ min: 1, max: 50 }}
              />
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
    </Stack>
  );

  const renderInterestStep = () => (
    <Box>
      <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.75, mb: 3 }}>
        単語レベルで十分です。あとからプロフィールで変えられます。
      </Typography>
      <InterestTagPicker
        value={formData.interests}
        onChange={handleInterestsChange}
        error={formErrors.interests}
        helperText="1つ以上選ぶと、最初のAI相談文を作りやすくなります。"
        disabled={isLoading || success}
      />
    </Box>
  );

  const renderThemeStep = () => (
    <Stack spacing={2.25}>
      <Alert severity="info">
        ここは空でも進めます。テーマがまだない人は、興味からAIと一緒に考えましょう。
      </Alert>
      <TextField
        fullWidth
        id="theme"
        label="探究テーマ（任意）"
        name="theme"
        value={formData.theme}
        onChange={handleInputChange}
        helperText="例：学校の昼休みをもっと過ごしやすくするには"
      />

      <TextField
        fullWidth
        id="question"
        label="問い（任意）"
        name="question"
        value={formData.question}
        onChange={handleInputChange}
        helperText="今いちばん考えたい問い"
        multiline
        minRows={2}
      />

      <TextField
        fullWidth
        id="hypothesis"
        label="仮説（任意）"
        name="hypothesis"
        value={formData.hypothesis}
        onChange={handleInputChange}
        helperText="現時点での予想や見立て"
        multiline
        minRows={2}
      />
    </Stack>
  );

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return renderTransferStep();
    }
    if (currentStep === 1) {
      return renderBasicStep();
    }
    if (currentStep === 2) {
      return renderInterestStep();
    }
    return renderThemeStep();
  };

  return (
    <AuthShell
      title="はじめの設定"
      subtitle="スマホで進めるような短い画面で、AIとの最初の対話まで準備します。"
      panelMaxWidth={{ xs: '100%', sm: 560 }}
      panelMinHeight={{ xs: 'calc(100vh - 32px)', md: 'min(840px, calc(100vh - 80px))' }}
      panelSx={{
        p: { xs: 3, sm: 4, md: 4.5 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {renderStepHeader()}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
          設定しました。AIとの探究に進みます。
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleFormSubmit}
        noValidate
        sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1 }}
          >
            {renderCurrentStep()}
          </motion.div>
        </AnimatePresence>

        <Box sx={{ flex: 1 }} />

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25} sx={{ mt: { xs: 3, sm: 4 } }}>
          {currentStep > 0 && (
            <Button type="button" variant="outlined" fullWidth onClick={goBack} disabled={isLoading || success}>
              戻る
            </Button>
          )}
          {currentStep === 3 && (
            <Button type="button" variant="outlined" fullWidth onClick={submitOnboarding} disabled={isLoading || success}>
              あとで決める
            </Button>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isLoading || success || isVerifyingCode}
            sx={{ py: 1.2 }}
          >
            {isLoading ? <CircularProgress size={24} /> : getNextLabel(currentStep)}
          </Button>
        </Stack>
      </Box>
    </AuthShell>
  );
};

export default OnboardingPage;
