import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Security,
  Speed,
  Cloud,
  CheckCircle,
  AccountCircle,
  DataObject,
  ArrowForward,
  Warning,
  Info,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAuthStoreV2 } from '../stores/authStoreV2';

const MigrationNoticePage = () => {
  const navigate = useNavigate();
  const v1Auth = useAuthStore();
  const v2Auth = useAuthStoreV2();
  
  const [activeStep, setActiveStep] = useState(0);
  const [migrationData, setMigrationData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    oldUsername: v1Auth.user?.username || '',
    oldPassword: '',
    migrateProjects: true,
    migrateMemos: true,
    migrateLogs: true,
  });
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [migrationError, setMigrationError] = useState('');
  const [migrationProgress, setMigrationProgress] = useState(0);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleCreateNewAccount = async () => {
    if (migrationData.password !== migrationData.confirmPassword) {
      setMigrationError('パスワードが一致しません');
      return;
    }

    setMigrationStatus('processing');
    setMigrationError('');

    try {
      // 新アカウントの作成
      const result = await v2Auth.signUp(migrationData.email, migrationData.password, {
        legacy_username: migrationData.oldUsername,
      });

      if (result.success) {
        handleNext();
        setMigrationStatus('idle');
      } else {
        setMigrationError(result.error?.message || '新規登録に失敗しました');
        setMigrationStatus('error');
      }
    } catch (error) {
      setMigrationError('エラーが発生しました');
      setMigrationStatus('error');
    }
  };

  const handleMigrateData = async () => {
    setMigrationStatus('processing');
    setMigrationError('');
    setMigrationProgress(0);

    try {
      // APIを呼び出してデータ移行を実行
      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
      
      // ステップ1: アカウントリンク
      setMigrationProgress(20);
      const linkResponse = await fetch(`${apiBaseUrl}/migration/link-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${v2Auth.session?.access_token}`,
        },
        body: JSON.stringify({
          username: migrationData.oldUsername,
          password: migrationData.oldPassword,
        }),
      });

      if (!linkResponse.ok) {
        throw new Error('アカウントの紐付けに失敗しました');
      }

      // ステップ2: データ移行
      setMigrationProgress(50);
      const migrateResponse = await fetch(`${apiBaseUrl}/migration/migrate-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${v2Auth.session?.access_token}`,
        },
        body: JSON.stringify({
          include_projects: migrationData.migrateProjects,
          include_memos: migrationData.migrateMemos,
          include_logs: migrationData.migrateLogs,
        }),
      });

      if (!migrateResponse.ok) {
        throw new Error('データ移行に失敗しました');
      }

      const migrationResult = await migrateResponse.json();
      
      // ステップ3: 移行状況の確認
      setMigrationProgress(80);
      
      // 移行完了
      setMigrationProgress(100);
      v2Auth.setMigrationStatus('completed');
      setMigrationStatus('success');
      handleNext();
      
      // 3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        v1Auth.logout(); // 旧システムからログアウト
        navigate('/dashboard');
      }, 3000);
      
    } catch (error) {
      setMigrationError(error instanceof Error ? error.message : 'データ移行中にエラーが発生しました');
      setMigrationStatus('error');
    }
  };

  const benefits = [
    {
      icon: <Security />,
      title: '強化されたセキュリティ',
      description: 'エンタープライズグレードの認証システム',
    },
    {
      icon: <Speed />,
      title: '高速化',
      description: 'パフォーマンスの大幅向上',
    },
    {
      icon: <Cloud />,
      title: 'クラウド連携',
      description: '将来的な機能拡張に対応',
    },
  ];

  const steps = [
    {
      label: '移行の確認',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 3 }}>
            新しい認証システムへの移行により、以下のメリットがあります：
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {benefits.map((benefit) => (
              <Card key={benefit.title} variant="outlined">
                <CardContent sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>{benefit.icon}</Box>
                  <Box>
                    <Typography variant="h6">{benefit.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {benefit.description}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              現在ログイン中のユーザー: <strong>{v1Auth.user?.username}</strong>
            </Typography>
          </Alert>

          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={<ArrowForward />}
            sx={{
              background: 'linear-gradient(45deg, #FF9800, #F57C00)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
              },
            }}
          >
            移行を開始
          </Button>
        </Box>
      ),
    },
    {
      label: '新アカウント作成',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 3 }}>
            新しい認証システム用のアカウントを作成します。
          </Typography>

          <TextField
            fullWidth
            label="メールアドレス"
            type="email"
            value={migrationData.email}
            onChange={(e) => setMigrationData({ ...migrationData, email: e.target.value })}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="新しいパスワード"
            type="password"
            value={migrationData.password}
            onChange={(e) => setMigrationData({ ...migrationData, password: e.target.value })}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="パスワード（確認）"
            type="password"
            value={migrationData.confirmPassword}
            onChange={(e) => setMigrationData({ ...migrationData, confirmPassword: e.target.value })}
            required
            error={migrationData.confirmPassword !== '' && migrationData.password !== migrationData.confirmPassword}
            helperText={
              migrationData.confirmPassword !== '' && migrationData.password !== migrationData.confirmPassword
                ? 'パスワードが一致しません'
                : ''
            }
            sx={{ mb: 3 }}
          />

          {migrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {migrationError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={handleBack}>
              戻る
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateNewAccount}
              disabled={migrationStatus === 'processing'}
              sx={{
                background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
                },
              }}
            >
              {migrationStatus === 'processing' ? <CircularProgress size={24} color="inherit" /> : '新規登録'}
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: 'データ移行',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 3 }}>
            既存のデータを新しいアカウントに移行します。
          </Typography>

          <Alert severity="warning" sx={{ mb: 3 }}>
            データ移行を行うには、旧アカウントのパスワードが必要です。
          </Alert>

          <TextField
            fullWidth
            label="旧アカウントのユーザー名"
            value={migrationData.oldUsername}
            onChange={(e) => setMigrationData({ ...migrationData, oldUsername: e.target.value })}
            disabled
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="旧アカウントのパスワード"
            type="password"
            value={migrationData.oldPassword}
            onChange={(e) => setMigrationData({ ...migrationData, oldPassword: e.target.value })}
            required
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" sx={{ mb: 2 }}>
            移行するデータを選択
          </Typography>

          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={migrationData.migrateProjects}
                  onChange={(e) => setMigrationData({ ...migrationData, migrateProjects: e.target.checked })}
                />
              }
              label="プロジェクト"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={migrationData.migrateMemos}
                  onChange={(e) => setMigrationData({ ...migrationData, migrateMemos: e.target.checked })}
                />
              }
              label="メモ"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={migrationData.migrateLogs}
                  onChange={(e) => setMigrationData({ ...migrationData, migrateLogs: e.target.checked })}
                />
              }
              label="学習ログ"
            />
          </Box>

          {migrationStatus === 'processing' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                データ移行中... {migrationProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={migrationProgress} />
            </Box>
          )}

          {migrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {migrationError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button onClick={handleBack} disabled={migrationStatus === 'processing'}>
              戻る
            </Button>
            <Button
              variant="contained"
              onClick={handleMigrateData}
              disabled={migrationStatus === 'processing' || !migrationData.oldPassword}
              sx={{
                background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
                },
              }}
            >
              {migrationStatus === 'processing' ? 'データ移行中...' : 'データを移行'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                v2Auth.setMigrationStatus('completed');
                navigate('/dashboard');
              }}
              disabled={migrationStatus === 'processing'}
            >
              スキップ
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: '完了',
      content: (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
          </motion.div>

          <Typography variant="h4" gutterBottom>
            移行が完了しました！
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            新しい認証システムへの移行が成功しました。
            {migrationStatus === 'success' && ' データの移行も完了しています。'}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            3秒後に自動的にダッシュボードへ移動します...
          </Typography>

          <CircularProgress />
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={10}
            sx={{
              p: 4,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.98)',
            }}
          >
            <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center" sx={{ mb: 4 }}>
              🔐 認証システム移行のご案内
            </Typography>

            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel>{step.label}</StepLabel>
                  <StepContent>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {step.content}
                      </motion.div>
                    </AnimatePresence>
                  </StepContent>
                </Step>
              ))}
            </Stepper>

            {activeStep === steps.length && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5">
                  すべての手順が完了しました
                </Typography>
              </Box>
            )}
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default MigrationNoticePage;