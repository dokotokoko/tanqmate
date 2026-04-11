import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { EmotionSelector } from './EmotionSelector';
import { MotivationFlameRive } from './MotivationFlameRive';
import { EmotionType } from './EmotionIcon';
import { tokenManager } from '../../utils/tokenManager';

interface DiaryDraft {
  draft_body: string;
  quote: string;
  quote_context: string;
  closing_question: string;
  suggested_tags: string[];
  turning_point_detected: boolean;
  turning_point_note?: string;
}

interface DiaryData {
  draft?: DiaryDraft;
  emotion?: EmotionType;
  motivation?: number;
}

const Container = styled(Box)(({ theme }) => ({
  maxWidth: '900px',
  margin: '0 auto',
  padding: theme.spacing(3)
}));

const StepContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4)
}));

const GenerateCard = styled(Card)(({ theme }) => ({
  backgroundColor: '#FFFAED',
  borderRadius: '12px',
  textAlign: 'center',
  padding: theme.spacing(6)
}));

const DraftCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#FDFAF6',
  borderRadius: '12px',
  marginBottom: theme.spacing(2)
}));

const QuoteCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: '#F5F5F5',
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  marginBottom: theme.spacing(2)
}));

const QuestionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#FFF8E1',
  borderRadius: '12px',
  marginBottom: theme.spacing(3)
}));

const TagChip = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  padding: '4px 12px',
  backgroundColor: theme.palette.grey[200],
  borderRadius: '16px',
  fontSize: '12px',
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(1)
}));

const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(4),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '18px',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary
}));

interface DiaryFlowNewProps {
  onComplete?: (data: any) => void;
}

export const DiaryFlowNew: React.FC<DiaryFlowNewProps> = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [diaryData, setDiaryData] = useState<DiaryData>({
    emotion: undefined,
    motivation: 50
  });

  const steps = [
    '日誌を生成',
    'AIの視点で振り返る',
    '自分の視点で振り返る'
  ];

  const generateDiary = async () => {
    setLoading(true);
    try {
      const token = tokenManager.getAccessToken();
      const response = await fetch('/api/diary/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('日誌の生成に失敗しました');
      }

      const draft = await response.json();
      setDiaryData(prev => ({ ...prev, draft }));
      setActiveStep(1);
    } catch (error) {
      console.error('Error generating diary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      generateDiary();
    } else if (activeStep === 1) {
      setActiveStep(2);
    } else {
      // 最終ステップ - 保存処理
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!diaryData.draft || !diaryData.emotion) return;

    setLoading(true);
    try {
      const token = tokenManager.getAccessToken();
      const response = await fetch('/api/diary/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          published_body: diaryData.draft.draft_body,
          published_quote: diaryData.draft.quote,
          published_tags: diaryData.draft.suggested_tags,
          emotion: {
            effort_score: Math.ceil((diaryData.motivation || 50) / 20),
            mood_tags: [diaryData.emotion],
            free_text: ''
          },
          ai_draft: diaryData.draft,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        throw new Error('日誌の保存に失敗しました');
      }

      if (onComplete) {
        onComplete(diaryData);
      }
    } catch (error) {
      console.error('Error submitting diary:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return true;
    if (activeStep === 1) return Boolean(diaryData.draft);
    if (activeStep === 2) return Boolean(diaryData.emotion);
    return false;
  };

  return (
    <Container>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        探究日誌
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 0: 生成開始 */}
      {activeStep === 0 && (
        <StepContainer>
          <GenerateCard>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                今日の探究活動を振り返りましょう
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                今日の対話ログからAIが日誌を生成します
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={generateDiary}
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    生成中...
                  </>
                ) : (
                  '今日の日誌を生成する'
                )}
              </Button>
            </CardContent>
          </GenerateCard>
        </StepContainer>
      )}

      {/* Step 1: AI生成結果の確認 */}
      {activeStep === 1 && diaryData.draft && (
        <StepContainer>
          <SectionTitle>AIが生成した日誌</SectionTitle>
          <DraftCard elevation={0}>
            <Typography variant="body1" paragraph>
              {diaryData.draft.draft_body}
            </Typography>
            
            {diaryData.draft.quote && (
              <QuoteCard elevation={0}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  {diaryData.draft.quote_context}
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  「{diaryData.draft.quote}」
                </Typography>
              </QuoteCard>
            )}

            <Box>
              {diaryData.draft.suggested_tags.map((tag, index) => (
                <TagChip key={index}>#{tag}</TagChip>
              ))}
            </Box>
          </DraftCard>

          <SectionTitle>今日の問い</SectionTitle>
          <QuestionCard elevation={0}>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {diaryData.draft.closing_question}
            </Typography>
          </QuestionCard>

          {diaryData.draft.turning_point_detected && (
            <Paper sx={{ p: 2, backgroundColor: '#E3F2FD', mb: 2 }}>
              <Typography variant="subtitle2" color="primary">
                転換点が検出されました
              </Typography>
              {diaryData.draft.turning_point_note && (
                <Typography variant="body2">
                  {diaryData.draft.turning_point_note}
                </Typography>
              )}
            </Paper>
          )}
        </StepContainer>
      )}

      {/* Step 2: 自分の視点で振り返る */}
      {activeStep === 2 && (
        <StepContainer>
          <Box sx={{ mb: 4 }}>
            <EmotionSelector
              value={diaryData.emotion}
              onChange={(emotion) => setDiaryData(prev => ({ ...prev, emotion }))}
              title="感情アイコンの探索"
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box display="flex" justifyContent="center">
            <MotivationFlameRive
              value={diaryData.motivation || 50}
              onChange={(motivation) => setDiaryData(prev => ({ ...prev, motivation }))}
            />
          </Box>
        </StepContainer>
      )}

      <ButtonContainer>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          戻る
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!canProceed() || loading}
        >
          {activeStep === steps.length - 1 ? '保存' : '次へ'}
        </Button>
      </ButtonContainer>
    </Container>
  );
};