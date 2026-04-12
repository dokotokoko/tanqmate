import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { EmotionSelector } from './EmotionSelector';
import { MotivationFlameRive } from './MotivationFlameRive';
import { EmotionType } from './EmotionIcon';
import { tokenManager } from '../../utils/tokenManager';
import { API_BASE_URL } from '../../config/api';
import { emotionOptions } from './EmotionSelector';
import { borderRadius, colors, diary, shadows, spacing } from '../../styles/design-system';

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
  emotions: EmotionType[];
  primaryEmotion?: EmotionType;
  motivation?: number;
}

const Container = styled(Box)(({ theme }) => ({
  maxWidth: '900px',
  margin: '0 auto',
  padding: theme.spacing(3),
}));

const StepContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(4)
}));

const GenerateCard = styled(Card)(({ theme }) => ({
  backgroundColor: diary.page.surface,
  borderRadius: borderRadius.card,
  border: `1px solid ${diary.page.border}`,
  boxShadow: diary.page.shadow,
  padding: theme.spacing(4),
}));

const DraftCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: diary.page.surface,
  borderRadius: borderRadius.card,
  border: `1px solid ${diary.page.border}`,
  boxShadow: shadows.sm,
  marginBottom: theme.spacing(2),
}));

const QuoteCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: colors.background.subtle,
  border: `1px solid ${colors.border.warm}`,
  borderLeft: `4px solid ${colors.accentWarm.main}`,
  marginBottom: theme.spacing(2),
}));

const QuestionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: colors.background.subtle,
  borderRadius: borderRadius.card,
  border: `1px solid ${colors.border.warm}`,
  marginBottom: theme.spacing(3),
}));

const ReflectionCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  background: `linear-gradient(180deg, ${diary.page.backgroundSoft} 0%, ${diary.page.surface} 100%)`,
  borderRadius: borderRadius.card,
  border: `1px solid ${diary.page.border}`,
  boxShadow: shadows.xs,
}));

const ToneNote = styled(Typography)(({ theme }) => ({
  fontSize: '13px',
  lineHeight: 1.7,
  color: colors.text.secondary,
  marginTop: theme.spacing(1),
}));

const TagChip = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  padding: `${spacing.xs} ${spacing.md}`,
  backgroundColor: colors.accentWarm.soft,
  color: colors.accentWarm.active,
  border: `1px solid ${colors.border.warm}`,
  borderRadius: borderRadius.chip,
  fontSize: '12px',
  marginRight: theme.spacing(1),
  marginTop: theme.spacing(1),
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
  color: colors.text.primary,
}));

const StepIntro = styled(Typography)(({ theme }) => ({
  color: colors.text.secondary,
  lineHeight: 1.7,
  marginBottom: theme.spacing(3),
}));

const PrimaryEmotionToggle = styled(ToggleButton)(({ theme }) => ({
  borderRadius: borderRadius.chip,
  borderColor: colors.border.soft,
  color: colors.text.secondary,
  padding: `${theme.spacing(1)} ${theme.spacing(1.75)}`,
  textTransform: 'none',
  '&.Mui-selected': {
    backgroundColor: colors.accentWarm.soft,
    color: colors.text.primary,
    borderColor: colors.accentWarm.main,
  },
  '&.Mui-selected:hover': {
    backgroundColor: colors.accentWarm.soft,
  },
}));

const InlineLabel = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.text.muted,
  marginBottom: theme.spacing(1),
}));

const SummaryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: borderRadius.card,
  backgroundColor: diary.page.surface,
  border: `1px solid ${diary.page.border}`,
  boxShadow: shadows.xs,
}));

const motivationLabels = [
  { max: 8, label: 'まだ火がつく前' },
  { max: 20, label: '少し休みたい' },
  { max: 35, label: '気になり始めている' },
  { max: 50, label: 'だんだん楽しい' },
  { max: 65, label: 'このまま続けたい' },
  { max: 80, label: 'かなり燃えている' },
  { max: 100, label: '放課後まで持ち帰りたい' },
];

interface DiaryFlowNewProps {
  onComplete?: (data: any) => void;
  autoStart?: boolean;
}

export const DiaryFlowNew: React.FC<DiaryFlowNewProps> = ({ onComplete, autoStart = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [started, setStarted] = useState(autoStart);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasAutoStartedRef = useRef(false);
  const [diaryData, setDiaryData] = useState<DiaryData>({
    emotions: [],
    motivation: 50
  });

  const steps = [
    '今日の気持ちを置く',
    '熱量を置く',
    'AIの日誌を確認する'
  ];

  const motivationLabel = useMemo(
    () => motivationLabels.find((item) => (diaryData.motivation || 0) <= item.max)?.label ?? motivationLabels[motivationLabels.length - 1].label,
    [diaryData.motivation]
  );

  const selectedEmotionOptions = useMemo(
    () => diaryData.emotions
      .map((emotionId) => emotionOptions.find((option) => option.id === emotionId))
      .filter((emotion): emotion is typeof emotionOptions[number] => Boolean(emotion)),
    [diaryData.emotions]
  );

  const generateDiary = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`${API_BASE_URL}/diary/generate-draft`, {
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
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || '日誌の生成に失敗しました');
      }

      const draft = await response.json();
      setDiaryData(prev => ({ ...prev, draft }));
    } catch (error) {
      console.error('Error generating diary:', error);
      setErrorMessage(error instanceof Error ? error.message : '日誌の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    setStarted(true);
    void generateDiary();
  }, [autoStart]);

  const handleStart = () => {
    if (started) return;
    setStarted(true);
    void generateDiary();
  };

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!diaryData.draft || diaryData.emotions.length === 0) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`${API_BASE_URL}/diary/submit`, {
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
            mood_tags: diaryData.emotions,
            free_text: diaryData.primaryEmotion
              ? `一番近い気持ち: ${emotionOptions.find((option) => option.id === diaryData.primaryEmotion)?.label ?? diaryData.primaryEmotion}`
              : ''
          },
          ai_draft: diaryData.draft,
          date: new Date().toISOString().split('T')[0]
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || '日誌の保存に失敗しました');
      }

      if (onComplete) {
        onComplete(diaryData);
      }
    } catch (error) {
      console.error('Error submitting diary:', error);
      setErrorMessage(error instanceof Error ? error.message : '日誌の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (activeStep === 0) return diaryData.emotions.length > 0;
    if (activeStep === 1) return true;
    if (activeStep === 2) return Boolean(diaryData.draft);
    return false;
  };

  return (
    <Container>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        探究日誌
      </Typography>
      <StepIntro>
        まずは今日の感覚をそのまま置いてから、あとでAIが対話ログをどう見立てたかを重ねて見ていきます。
      </StepIntro>

      {errorMessage && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage}</Alert>}

      {!started && (
        <StepContainer>
          <GenerateCard>
            <CardContent sx={{ p: 0 }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: colors.text.primary }}>
                    まずは今日の感覚から残します
                  </Typography>
                  <ToneNote>
                    気持ちと熱量を先に置いているあいだに、対話ログからAIが日誌を下書きします。
                    あとで見比べながら整えられます。
                  </ToneNote>
                </Box>
                <SummaryCard elevation={0}>
                  <InlineLabel>このフローでやること</InlineLabel>
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">1. 今日の気持ちを置く</Typography>
                    <Typography variant="body2" color="text.secondary">2. 今日の探究の火の大きさを置く</Typography>
                    <Typography variant="body2" color="text.secondary">3. AIがまとめた日誌を確認して保存する</Typography>
                  </Stack>
                </SummaryCard>
                <Box>
                  <Button variant="contained" size="large" onClick={handleStart}>
                    日誌をはじめる
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </GenerateCard>
        </StepContainer>
      )}

      {started && (
        <>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <StepContainer>
              <SectionTitle>今日の気持ちを置く</SectionTitle>
              <StepIntro>
                いまの感覚に近いものをいくつか選んでください。あとでAIの日誌を見る前に、自分の手触りを先に残します。
              </StepIntro>
              <Box sx={{ mb: 3 }}>
                <EmotionSelector
                  value={diaryData.emotions}
                  onChange={(emotions) => setDiaryData(prev => ({
                    ...prev,
                    emotions,
                    primaryEmotion: prev.primaryEmotion && emotions.includes(prev.primaryEmotion)
                      ? prev.primaryEmotion
                      : emotions[0]
                  }))}
                  title="いまの気持ちに近いもの"
                  helperText="最大4つまで。どれも少しずつ当てはまるなら、その感覚のままで大丈夫です。"
                />
              </Box>

              {selectedEmotionOptions.length > 0 && (
                <ReflectionCard elevation={0}>
                  <InlineLabel>ひと呼吸おいて見る</InlineLabel>
                  <Typography variant="body1" sx={{ color: colors.text.primary, mb: 2 }}>
                    この中で、いちばん近い気持ちはどれですか。
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={diaryData.primaryEmotion || selectedEmotionOptions[0]?.id || null}
                    onChange={(_, nextValue) => {
                      if (nextValue) {
                        setDiaryData(prev => ({ ...prev, primaryEmotion: nextValue }));
                      }
                    }}
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {selectedEmotionOptions.map((emotion) => (
                      <PrimaryEmotionToggle key={emotion.id} value={emotion.id}>
                        {emotion.label}
                      </PrimaryEmotionToggle>
                    ))}
                  </ToggleButtonGroup>
                  <ToneNote>言葉にしにくければ、いま選んだままでも十分です。</ToneNote>
                </ReflectionCard>
              )}
            </StepContainer>
          )}

          {activeStep === 1 && (
            <StepContainer>
              <SectionTitle>今日の熱量を置く</SectionTitle>
              <StepIntro>
                数字を決めるよりも、いまの火の大きさにいちばん近いところへ置くイメージで調整してください。
              </StepIntro>
              <Box display="flex" justifyContent="center">
                <MotivationFlameRive
                  value={diaryData.motivation || 50}
                  onChange={(motivation) => setDiaryData(prev => ({ ...prev, motivation }))}
                />
              </Box>
            </StepContainer>
          )}

          {activeStep === 2 && (
            <StepContainer>
              <SectionTitle>あなたの感覚と AI の見立てを重ねる</SectionTitle>
              <StepIntro>
                先に置いた気持ちと熱量を手がかりに、AIがまとめた日誌を確認します。重なるところも、少し違うところも、そのまま見て大丈夫です。
              </StepIntro>

              <SummaryCard elevation={0} sx={{ mb: 3 }}>
                <Stack spacing={2}>
                  <Box>
                    <InlineLabel>あなたが置いた気持ち</InlineLabel>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {selectedEmotionOptions.map((emotion) => (
                        <Chip
                          key={emotion.id}
                          label={emotion.label}
                          sx={{
                            backgroundColor: emotion.fill,
                            color: emotion.text,
                            border: `1px solid ${emotion.stroke}`,
                            borderRadius: borderRadius.chip,
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                  <Box>
                    <InlineLabel>いちばん近い気持ち</InlineLabel>
                    <Typography variant="body1" sx={{ color: colors.text.primary }}>
                      {emotionOptions.find((option) => option.id === diaryData.primaryEmotion)?.label || 'まだ決めていません'}
                    </Typography>
                  </Box>
                  <Box>
                    <InlineLabel>今日の火の大きさ</InlineLabel>
                    <Typography variant="body1" sx={{ color: colors.text.primary }}>
                      {motivationLabel}
                    </Typography>
                  </Box>
                </Stack>
              </SummaryCard>

              {!diaryData.draft && (
                <GenerateCard>
                  <CardContent sx={{ p: 0 }}>
                    <Typography variant="h5" gutterBottom sx={{ color: colors.text.primary }}>
                      AI が今日の対話から日誌をまとめています
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      あなたが置いた気持ちと見比べられるように、下書きを整えています。
                    </Typography>
                    {loading ? (
                      <Stack spacing={2}>
                        <LinearProgress />
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            もう少しで確認できます
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Button variant="contained" onClick={generateDiary}>
                        AIの日誌をもう一度生成する
                      </Button>
                    )}
                  </CardContent>
                </GenerateCard>
              )}

              {diaryData.draft && (
                <>
                  <SectionTitle>AI がまとめた日誌</SectionTitle>
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
                <Paper sx={{ p: 2, backgroundColor: colors.trustBlue.soft, border: `1px solid ${colors.secondary[200]}`, mb: 2, borderRadius: borderRadius.md }}>
                  <Typography variant="subtitle2" sx={{ color: colors.secondary[800] }}>
                    対話の中で流れが変わった場面
                  </Typography>
                  {diaryData.draft.turning_point_note && (
                    <Typography variant="body2">
                      {diaryData.draft.turning_point_note}
                    </Typography>
                  )}
                </Paper>
              )}
            </>
          )}
        </StepContainer>
      )}

      {started && (
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
            {activeStep === steps.length - 1 ? '日誌を保存する' : '次へ'}
          </Button>
        </ButtonContainer>
      )}
        </>
      )}
    </Container>
  );
};
