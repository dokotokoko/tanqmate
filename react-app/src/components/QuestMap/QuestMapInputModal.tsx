import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fade,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  EmojiEvents as GoalIcon,
  Place as CurrentIcon,
  AutoAwesome as MagicIcon,
} from '@mui/icons-material';
import { 
  selectUIState, 
  selectUIActions, 
  selectQuestMapActions,
  selectIsLoading 
} from '../../stores/questMapStore';
import type { CreateQuestRequest } from '../../types/questMap';

interface QuestMapInputModalProps {
  open?: boolean;
  onClose?: () => void;
}

const QuestMapInputModal: React.FC<QuestMapInputModalProps> = ({ 
  open: externalOpen, 
  onClose: externalOnClose 
}) => {
  const theme = useTheme();
  const ui = selectUIState();
  const { setInputModalOpen } = selectUIActions();
  const { createQuest, generateNodes } = selectQuestMapActions();
  const isLoading = selectIsLoading();

  // 外部から制御される場合とストアから制御される場合の両方をサポート
  const isOpen = externalOpen !== undefined ? externalOpen : ui.isInputModalOpen;
  const handleClose = externalOnClose || (() => setInputModalOpen(false));

  // フォーム状態
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    goal: '',
    currentSituation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // バリデーション
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0:
        if (!formData.goal.trim()) {
          newErrors.goal = 'ゴールを入力してください';
        } else if (formData.goal.trim().length < 5) {
          newErrors.goal = 'ゴールは5文字以上で入力してください';
        }
        break;
      case 1:
        if (!formData.currentSituation.trim()) {
          newErrors.currentSituation = '現在の状況を入力してください';
        } else if (formData.currentSituation.trim().length < 5) {
          newErrors.currentSituation = '現在の状況は5文字以上で入力してください';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ステップ進行
  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep, validateStep]);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
    setErrors({});
  }, []);

  // フォーム送信
  const handleSubmit = useCallback(async () => {
    if (!validateStep(1)) return;

    try {
      const request: CreateQuestRequest = {
        goal: formData.goal.trim(),
        currentSituation: formData.currentSituation.trim(),
      };

      // クエスト作成
      const response = await createQuest(request);
      console.log('Quest created, response:', response);

      // クエストが作成されたらノードを生成
      if (response && response.quest && response.quest.id) {
        console.log('Generating nodes for quest:', response.quest.id);
        await generateNodes({
          quest_id: parseInt(response.quest.id, 10), // バックエンドは整数のquest_idを期待
          context: `目標: ${request.goal}\n現在の状況: ${request.currentSituation}`,
          node_count: 5
        });
      }

      // フォームをリセットして閉じる
      setFormData({ goal: '', currentSituation: '' });
      setActiveStep(0);
      setErrors({});
      handleClose();
    } catch (error) {
      console.error('Failed to create quest:', error);
    }
  }, [formData, validateStep, createQuest, generateNodes, handleClose]);

  // モーダルを閉じる
  const handleModalClose = useCallback(() => {
    setFormData({ goal: '', currentSituation: '' });
    setActiveStep(0);
    setErrors({});
    handleClose();
  }, [handleClose]);

  // 入力ハンドラー
  const handleInputChange = useCallback((field: keyof typeof formData) => 
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));
      
      // リアルタイムバリデーション
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    }, [errors]);

  const steps = [
    {
      label: 'ゴール設定',
      icon: <GoalIcon />,
      description: 'あなたが達成したいゴールを教えてください',
    },
    {
      label: '現状把握',
      icon: <CurrentIcon />,
      description: '現在のあなたの状況を教えてください',
    },
    {
      label: '確認',
      icon: <MagicIcon />,
      description: '入力内容を確認してクエストマップを作成します',
    },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={handleModalClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.background.paper, 0.95)} 0%, 
            ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MagicIcon sx={{ color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              探Qマップ作成
            </Typography>
            <Typography variant="body2" color="textSecondary">
              あなた専用の学習マップを作成しましょう
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleModalClose}
          disabled={isLoading}
          sx={{ color: theme.palette.text.secondary }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: index <= activeStep 
                        ? theme.palette.primary.main 
                        : theme.palette.grey[300],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {React.cloneElement(step.icon, {
                      sx: { 
                        fontSize: 18, 
                        color: index <= activeStep ? 'white' : theme.palette.grey[500] 
                      }
                    })}
                  </Box>
                )}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {step.label}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                <Fade in={true} timeout={500}>
                  <Box sx={{ mt: 2 }}>
                    {index === 0 && (
                      <TextField
                        label="あなたのゴール"
                        placeholder="例：フロントエンド開発をマスターしたい"
                        value={formData.goal}
                        onChange={handleInputChange('goal')}
                        error={!!errors.goal}
                        helperText={errors.goal || '具体的で達成可能なゴールを設定しましょう'}
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: alpha(theme.palette.background.paper, 0.8),
                          },
                        }}
                      />
                    )}

                    {index === 1 && (
                      <TextField
                        label="現在の状況"
                        placeholder="例：HTMLとCSSは基本的なことは分かるが、JavaScriptは初心者レベル"
                        value={formData.currentSituation}
                        onChange={handleInputChange('currentSituation')}
                        error={!!errors.currentSituation}
                        helperText={errors.currentSituation || 'あなたの現在のスキルレベルや状況を教えてください'}
                        fullWidth
                        multiline
                        rows={4}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: alpha(theme.palette.background.paper, 0.8),
                          },
                        }}
                      />
                    )}

                    {index === 2 && (
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.primary.light, 0.1),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                      >
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                          入力内容の確認
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            🎯 ゴール：
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            pl: 2, 
                            borderLeft: `3px solid ${theme.palette.primary.main}`,
                            backgroundColor: alpha(theme.palette.background.paper, 0.8),
                            p: 1,
                            borderRadius: 1,
                          }}>
                            {formData.goal}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                            📍 現在の状況：
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            pl: 2, 
                            borderLeft: `3px solid ${theme.palette.secondary.main}`,
                            backgroundColor: alpha(theme.palette.background.paper, 0.8),
                            p: 1,
                            borderRadius: 1,
                          }}>
                            {formData.currentSituation}
                          </Typography>
                        </Box>

                        <Alert severity="info" sx={{ mt: 2 }}>
                          AIがあなた専用の学習マップを生成します。マップには現在地からゴールまでの最適な学習パスが表示されます。
                        </Alert>
                      </Box>
                    )}
                  </Box>
                </Fade>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {ui.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {ui.error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Button
          onClick={handleModalClose}
          disabled={isLoading}
          sx={{ mr: 1 }}
        >
          キャンセル
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={isLoading}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            戻る
          </Button>
        )}
        
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={isLoading}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              },
            }}
          >
            次へ
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <MagicIcon />}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              },
            }}
          >
            {isLoading ? 'マップ作成中...' : 'マップを作成'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(QuestMapInputModal);