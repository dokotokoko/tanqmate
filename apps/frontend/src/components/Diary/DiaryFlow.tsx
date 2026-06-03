import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { EmotionSelector } from './EmotionSelector';
import { MotivationFlame } from './MotivationFlame';
import { EmotionType } from './EmotionIcon';

interface DiaryEntry {
  content: string;
  aiObservation?: string;
  todaysQuestion?: string;
  emotion?: EmotionType;
  motivation?: number;
}

const Container = styled(Paper)(({ theme }) => ({
  maxWidth: '800px',
  margin: '0 auto',
  padding: theme.spacing(4),
  backgroundColor: '#FFFAED'
}));

const StepContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4)
}));

const StepTitle = styled(Typography)(({ theme }) => ({
  fontSize: '20px',
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary
}));

const StepDescription = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(3)
}));

const AIObservationCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#F5F5F5',
  marginBottom: theme.spacing(2)
}));

const QuestionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: '#FFF8E1',
  marginBottom: theme.spacing(3),
  borderLeft: `4px solid ${theme.palette.warning.main}`
}));

const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(4)
}));

interface DiaryFlowProps {
  onSubmit: (entry: DiaryEntry) => void;
}

export const DiaryFlow: React.FC<DiaryFlowProps> = ({ onSubmit }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [diary, setDiary] = useState<DiaryEntry>({
    content: '',
    emotion: undefined,
    motivation: 50
  });

  const steps = [
    'AIの視点で振り返る',
    '自分の視点で振り返る'
  ];

  const handleDiaryContentChange = (content: string) => {
    setDiary(prev => ({ ...prev, content }));
  };

  const generateAIObservation = async () => {
    setLoading(true);
    // TODO: 実際のAPI呼び出しに置き換える
    setTimeout(() => {
      setDiary(prev => ({
        ...prev,
        aiObservation: '今日の探究活動では、複数の資料を比較検討しながら、自分なりの仮説を立てようとしている様子が見られました。特に「なぜ」という問いを繰り返し立てることで、表層的な理解から深い理解へと進もうとしています。',
        todaysQuestion: 'もし今日発見した矛盾が実は矛盾ではなく、異なる文脈での真実だとしたら、どんな新しい視点が見えてくるだろう？'
      }));
      setLoading(false);
      setActiveStep(1);
    }, 2000);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      generateAIObservation();
    } else {
      onSubmit(diary);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const canProceed = () => {
    if (activeStep === 0) {
      return diary.content.length > 10;
    } else {
      return diary.emotion !== undefined;
    }
  };

  return (
    <Container elevation={0}>
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

      {activeStep === 0 && (
        <StepContainer>
          <StepTitle>今日の探究活動を振り返る</StepTitle>
          <StepDescription>
            今日の活動で感じたこと、考えたこと、発見したことを自由に書いてください。
            AIがあなたの振り返りを分析して、新しい視点を提供します。
          </StepDescription>

          <TextField
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            placeholder="今日の探究活動について書いてください..."
            value={diary.content}
            onChange={(e) => handleDiaryContentChange(e.target.value)}
            sx={{ mb: 3 }}
          />

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
              <Typography ml={2}>AIが分析中...</Typography>
            </Box>
          )}
        </StepContainer>
      )}

      {activeStep === 1 && (
        <StepContainer>
          <StepTitle>AIの観察と自己評価</StepTitle>
          
          <Typography variant="subtitle1" fontWeight={500} gutterBottom>
            AIの観察メモ
          </Typography>
          <AIObservationCard elevation={0}>
            <Typography variant="body2" lineHeight={1.8}>
              {diary.aiObservation}
            </Typography>
          </AIObservationCard>

          <Typography variant="subtitle1" fontWeight={500} gutterBottom>
            今日の問い
          </Typography>
          <QuestionCard elevation={0}>
            <Typography variant="body1" fontWeight={500}>
              {diary.todaysQuestion}
            </Typography>
          </QuestionCard>

          <Divider sx={{ my: 4 }} />

          <EmotionSelector
            value={diary.emotion}
            onChange={(emotion) => setDiary(prev => ({ ...prev, emotion }))}
            title="今の気持ちを選んでください"
          />

          <Box mt={4} display="flex" justifyContent="center">
            <MotivationFlame
              value={diary.motivation || 50}
              onChange={(motivation) => setDiary(prev => ({ ...prev, motivation }))}
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