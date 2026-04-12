import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Button,
  Box,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Slider,
  IconButton,
  styled,
  alpha,
  keyframes,
  Fade,
  Grow,
  Collapse,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as ObserveIcon,
  Psychology as QuestionIcon,
  Send as SendIcon,
  School as TeacherIcon,
  LocalPostOffice as PostIcon,
  Lightbulb as InsightIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { tokenManager } from '../../utils/tokenManager';
import EmotionStep from './EmotionStep';
import MotivationStep from './MotivationStep';

interface DiaryDraft {
  draft_body: string;
  quote: string;
  quote_context: string;
  closing_question: string;
  suggested_tags: string[];
  turning_point_detected: boolean;
  turning_point_note?: string;
}

interface DiaryEditorProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  date?: Date;
  shouldGenerate?: boolean;
  onGenerateComplete?: () => void;
}

// Animation keyframes
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

// Streamlined Dialog
const JournalDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: '12px',
    maxWidth: '720px',
    width: '90%',
    backgroundColor: '#FAFAF8',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)',
    overflow: 'visible',
  },
}));

// Clean Header
const JournalHeader = styled(Box)(({ theme }) => ({
  padding: '28px 32px 24px',
  borderBottom: `1px solid ${alpha('#E0E0E0', 0.8)}`,
  background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAF8 100%)',
}));

// Content with better spacing
const JournalContent = styled(DialogContent)(({ theme }) => ({
  padding: '32px',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha('#B0BEC5', 0.2),
    borderRadius: '3px',
    '&:hover': {
      backgroundColor: alpha('#B0BEC5', 0.3),
    },
  },
}));

// Step indicator
const StepIndicator = styled(Box)<{ active?: boolean; completed?: boolean }>(({ active, completed }) => ({
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: 600,
  backgroundColor: completed ? '#4CAF50' : active ? '#2196F3' : alpha('#B0BEC5', 0.1),
  color: completed || active ? '#FFFFFF' : alpha('#546E7A', 0.6),
  transition: 'all 0.3s ease',
  border: active ? `2px solid ${alpha('#2196F3', 0.2)}` : 'none',
}));

// Main content card for each step
const StepCard = styled(Box)<{ active?: boolean }>(({ active }) => ({
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '24px',
  border: `1px solid ${active ? alpha('#2196F3', 0.3) : alpha('#E0E0E0', 0.6)}`,
  transition: 'all 0.3s ease',
  position: 'relative',
  ...(active && {
    boxShadow: `0 8px 24px ${alpha('#2196F3', 0.08)}`,
  }),
}));

// AI Draft - now editable in place
const DraftEditor = styled(Box)(({ theme }) => ({
  position: 'relative',
  '& .draft-text': {
    fontSize: '15px',
    lineHeight: '1.8',
    color: '#2C3E50',
    padding: '16px',
    borderRadius: '4px',
    border: `1px dashed ${alpha('#B0BEC5', 0.3)}`,
    backgroundColor: alpha('#FFF8E1', 0.3),
    transition: 'all 0.2s ease',
    minHeight: '100px',
    cursor: 'text',
    '&:hover': {
      backgroundColor: alpha('#FFF8E1', 0.5),
      borderColor: alpha('#FFB74D', 0.5),
    },
    '&:focus': {
      outline: 'none',
      backgroundColor: '#FFFFFF',
      borderColor: '#2196F3',
      borderStyle: 'solid',
    },
  },
}));

// Question as central focus
const QuestionCard = styled(Box)(({ theme }) => ({
  background: 'linear-gradient(135deg, #E3F2FD 0%, #E8EAF6 100%)',
  borderRadius: '12px',
  padding: '28px',
  textAlign: 'center',
  position: 'relative',
  animation: `${pulse} 4s ease-in-out infinite`,
  border: `2px solid ${alpha('#3F51B5', 0.2)}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#3F51B5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));


// Simplified submit button
const SubmitButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#1976D2',
  color: '#FFFFFF',
  padding: '12px 28px',
  fontSize: '15px',
  fontWeight: 600,
  borderRadius: '24px',
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: '#1565C0',
    transform: 'translateY(-1px)',
    boxShadow: '0 6px 20px rgba(25, 118, 210, 0.35)',
  },
  '&.Mui-disabled': {
    backgroundColor: alpha('#B0BEC5', 0.3),
  },
}));


const DiaryEditor: React.FC<DiaryEditorProps> = ({
  open,
  onClose,
  conversationId,
  date = new Date(),
  shouldGenerate = false,
  onGenerateComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DiaryDraft | null>(null);
  const [editedBody, setEditedBody] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagLevels, setTagLevels] = useState<{ [key: string]: 'low' | 'medium' | 'high' }>({});
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [heatScore, setHeatScore] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const getErrorMessage = async (response: Response, fallbackMessage: string): Promise<string> => {
    try {
      const data = await response.json();
      if (typeof data?.detail === 'string' && data.detail.trim()) {
        return data.detail;
      }
      return fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  // Generate draft
  const generateDraft = async () => {
    const targetDate = date.toISOString().split('T')[0];
    setLoading(true);
    setError(null);
    
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('アクセストークンが見つかりません');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/diary/generate-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: targetDate,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(response, '下書き生成に失敗しました');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setDraft(data);
      setEditedBody(data.draft_body);
      
      // Auto-select tags with medium interest by default
      setSelectedTags(data.suggested_tags);
      const defaultLevels: { [key: string]: 'low' | 'medium' | 'high' } = {};
      data.suggested_tags.forEach((tag: string) => {
        defaultLevels[tag] = 'medium';
      });
      setTagLevels(defaultLevels);
    } catch (err) {
      const message = err instanceof Error ? err.message : '日誌の生成に失敗しました。';
      setError(message);
    } finally {
      setLoading(false);
      onGenerateComplete?.();
    }
  };

  // Submit diary
  const submitDiary = async () => {
    if (!draft) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const token = tokenManager.getAccessToken();
      const targetDate = date.toISOString().split('T')[0];

      if (!token) {
        throw new Error('アクセストークンが見つかりません');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/diary/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          published_body: editedBody,
          published_quote: draft.quote, // Keep original quote
          published_tags: selectedTags,
          tag_interest_levels: tagLevels,
          emotion: selectedEmotions,
          heat_score: heatScore,
          ai_draft: draft,
          date: targetDate,
        }),
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(response, '日誌送信に失敗しました');
        throw new Error(errorMessage);
      }

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '日誌の送信に失敗しました。';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open && !draft && !loading) {
      generateDraft();
    }
  }, [open]);

  const handleClose = () => {
    setDraft(null);
    setEditedBody('');
    setSelectedTags([]);
    setTagLevels({});
    setSelectedEmotions([]);
    setHeatScore(50);
    setError(null);
    setCurrentStep(1);
    onClose();
  };

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  return (
    <JournalDialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      TransitionComponent={Fade}
      transitionDuration={300}
    >
      <JournalHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                color: '#1A237E',
                letterSpacing: '-0.5px',
                mb: 0.5,
              }}
            >
              {formatDate(date)}の探究日誌
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: alpha('#546E7A', 0.8),
                fontSize: '13px',
              }}
            >
              今日の学びを振り返り、成長を記録します
            </Typography>
          </Box>
          <IconButton 
            onClick={handleClose} 
            sx={{ 
              color: alpha('#546E7A', 0.6),
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </JournalHeader>

      <JournalContent>
        {error && !loading && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)} 
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            py: 8,
            gap: 3,
          }}>
            <CircularProgress size={48} thickness={3} />
            <Typography color="text.secondary">
              今日の探究を分析しています...
            </Typography>
          </Box>
        ) : draft ? (
          <Stack spacing={4}>
            {/* Progress indicators - ①AIの視点 (Step 1-2) と ②自分の視点 (Step 3-4) */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: alpha('#546E7A', 0.8),
                  mb: 2,
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                {currentStep <= 2 ? '① AIの視点で振り返る' : '② 自分の視点で振り返る'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {[1, 2, 3, 4].map((step, index) => (
                  <React.Fragment key={step}>
                    <StepIndicator 
                      active={step === currentStep} 
                      completed={step < currentStep}
                      onClick={() => setCurrentStep(step)}
                      sx={{ cursor: 'pointer' }}
                    >
                      {step < currentStep ? <CheckIcon sx={{ fontSize: 20 }} /> : 
                       (step <= 2 ? step : step - 2)}
                    </StepIndicator>
                    {index < 3 && (
                      <Box 
                        sx={{ 
                          flex: 1, 
                          height: '2px', 
                          backgroundColor: step <= currentStep ? '#4CAF50' : alpha('#E0E0E0', 0.5),
                          transition: 'all 0.3s ease',
                        }} 
                      />
                    )}
                  </React.Fragment>
                ))}
              </Box>
            </Box>

            {/* Step 1: AI Observation (Editable) */}
            <Collapse in={currentStep === 1}>
              <StepCard active={currentStep === 1}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1A237E' }}>
                    AIの観察メモ
                  </Typography>
                  <Button
                    size="small"
                    startIcon={isEditingDraft ? <CheckIcon /> : <EditIcon />}
                    onClick={() => setIsEditingDraft(!isEditingDraft)}
                    sx={{ textTransform: 'none' }}
                  >
                    {isEditingDraft ? '編集完了' : '編集する'}
                  </Button>
                </Box>
                
                <DraftEditor>
                  <div
                    className="draft-text"
                    contentEditable={isEditingDraft}
                    suppressContentEditableWarning
                    onBlur={(e) => setEditedBody(e.currentTarget.textContent || '')}
                    dangerouslySetInnerHTML={{ __html: editedBody }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: alpha('#546E7A', 0.6),
                      mt: 1,
                      display: 'block',
                    }}
                  >
                    {editedBody.length} / 150文字程度
                  </Typography>
                </DraftEditor>

                {draft.turning_point_detected && (
                  <Alert 
                    severity="info" 
                    icon={<InsightIcon />}
                    sx={{ mt: 2 }}
                  >
                    <Typography variant="subtitle2" fontWeight={600}>
                      転換点を観察
                    </Typography>
                    <Typography variant="body2">
                      {draft.turning_point_note}
                    </Typography>
                  </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={() => setCurrentStep(2)}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: '20px',
                    }}
                  >
                    次へ：問いを確認
                  </Button>
                </Box>
              </StepCard>
            </Collapse>

            {/* Step 2: Question (Central Focus) */}
            <Collapse in={currentStep === 2}>
              <StepCard active={currentStep === 2}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1A237E', mb: 3 }}>
                  今日の問い
                </Typography>
                
                <QuestionCard>
                  <QuestionIcon 
                    sx={{ 
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 28,
                      color: '#FFFFFF',
                      backgroundColor: '#3F51B5',
                      borderRadius: '50%',
                      padding: '10px',
                    }} 
                  />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: '#1A237E',
                      fontWeight: 500,
                      lineHeight: 1.6,
                      mt: 2,
                    }}
                  >
                    {draft.closing_question}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: alpha('#3F51B5', 0.7),
                      mt: 2,
                      display: 'block',
                    }}
                  >
                    この問いについて、明日も考えてみましょう
                  </Typography>
                </QuestionCard>

                {draft.quote && (
                  <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    borderLeft: `3px solid ${alpha('#FF6B6B', 0.5)}`,
                    backgroundColor: alpha('#FFF8E7', 0.3),
                  }}>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#2C3E50' }}>
                      "{draft.quote}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {draft.quote_context}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <Button
                    onClick={() => setCurrentStep(1)}
                    sx={{ textTransform: 'none' }}
                  >
                    戻る
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setCurrentStep(3)}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
                    }}
                  >
                    自分の視点で振り返る →
                  </Button>
                </Box>
              </StepCard>
            </Collapse>

            {/* Step 3: Emotions (要件に基づく新UI) */}
            <Collapse in={currentStep === 3}>
              <StepCard active={currentStep === 3}>
                <EmotionStep
                  selectedEmotions={selectedEmotions}
                  onEmotionToggle={(emotionId) => {
                    if (selectedEmotions.includes(emotionId)) {
                      setSelectedEmotions(selectedEmotions.filter(id => id !== emotionId));
                    } else {
                      setSelectedEmotions([...selectedEmotions, emotionId]);
                    }
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    sx={{ textTransform: 'none' }}
                  >
                    戻る
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setCurrentStep(4)}
                    disabled={selectedEmotions.length === 0}
                    sx={{ 
                      textTransform: 'none',
                      borderRadius: '20px',
                    }}
                  >
                    次へ：探究心の温度
                  </Button>
                </Box>
              </StepCard>
            </Collapse>

            {/* Step 4: Motivation/Heat (要件に基づく新UI) */}
            <Collapse in={currentStep === 4}>
              <StepCard active={currentStep === 4}>
                <MotivationStep
                  heatScore={heatScore}
                  onHeatChange={setHeatScore}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    sx={{ textTransform: 'none' }}
                  >
                    戻る
                  </Button>
                  <SubmitButton
                    onClick={submitDiary}
                    disabled={submitting || !editedBody.trim() || selectedEmotions.length === 0}
                    startIcon={submitting ? (
                      <CircularProgress size={18} thickness={3} sx={{ color: 'inherit' }} />
                    ) : (
                      <SendIcon />
                    )}
                  >
                    {submitting ? '送信中...' : '先生に届ける'}
                  </SubmitButton>
                </Box>
              </StepCard>
            </Collapse>
          </Stack>
        ) : (
          <Box sx={{ py: 4 }}>
            <Typography color="text.secondary">
              日誌を準備しています...
            </Typography>
          </Box>
        )}
      </JournalContent>
    </JournalDialog>
  );
};

export default DiaryEditor;