import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  EditNote as EditNoteIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { EmotionSelector, emotionOptions } from './EmotionSelector';
import { MotivationFlameRive } from './MotivationFlameRive';
import { EmotionType } from './EmotionIcon';
import { tokenManager } from '../../utils/tokenManager';
import { API_BASE_URL } from '../../config/api';
import { borderRadius, colors, diary, shadows } from '../../styles/design-system';

type DiaryFlowState =
  | 'not_started'
  | 'emotion_selecting'
  | 'ai_generating'
  | 'ai_observation_ready'
  | 'student_reflection_editing'
  | 'teacher_preview'
  | 'submitting'
  | 'submitted';

type AiObservationStatus = 'not_requested' | 'generating' | 'succeeded' | 'failed' | 'skipped';

interface DiaryDraft {
  draft_body: string;
  quote: string;
  quote_context: string;
  closing_question: string;
  suggested_tags: string[];
  turning_point_detected: boolean;
  turning_point_note?: string;
  ai_diary_draft?: string;
  shared_summary_draft?: string;
  reflection_question?: string;
}

interface DiaryAiObservationCard {
  title: string;
  body: string;
}

interface DiaryData {
  selectedEmotionIds: EmotionType[];
  aiObservationStatus: AiObservationStatus;
  aiObservationCards: DiaryAiObservationCard[];
  studentReflectionText: string;
  submittedAt?: string;
}

interface DiaryFlowNewProps {
  onComplete?: (data: DiaryData) => void;
  autoStart?: boolean;
}

const diaryReflectionVariant: 'emotion_cards' | 'heat_slider' =
  (import.meta as any).env?.DEV && (import.meta as any).env?.VITE_DIARY_REFLECTION_VARIANT === 'heat_slider'
    ? 'heat_slider'
    : 'emotion_cards';

const flowSteps = [
  '気持ちを選ぶ',
  '探Qメイトの見立てを見る',
  '自分の記録を書く',
  '先生への表示を確認する',
];

const getStepIndex = (flowState: DiaryFlowState) => {
  if (flowState === 'emotion_selecting' || flowState === 'not_started') return 0;
  if (flowState === 'ai_generating' || flowState === 'ai_observation_ready') return 1;
  if (flowState === 'student_reflection_editing') return 2;
  if (flowState === 'teacher_preview' || flowState === 'submitting' || flowState === 'submitted') return 3;
  return 0;
};

const Container = styled(Box)(({ theme }) => ({
  maxWidth: '900px',
  margin: '0 auto',
  padding: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1),
  },
}));

const StepContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(3),
}));

const SoftPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: borderRadius.card,
  backgroundColor: diary.page.surface,
  border: `1px solid ${diary.page.border}`,
  boxShadow: shadows.xs,
}));

const QuietPanel = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  borderRadius: borderRadius.card,
  backgroundColor: colors.background.subtle,
  border: `1px solid ${colors.border.soft}`,
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '22px',
  fontWeight: 700,
  lineHeight: 1.45,
  marginBottom: theme.spacing(1.5),
  color: colors.text.primary,
  letterSpacing: 0,
}));

const StepIntro = styled(Typography)(({ theme }) => ({
  color: colors.text.secondary,
  lineHeight: 1.75,
  marginBottom: theme.spacing(3),
}));

const ToneNote = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  lineHeight: 1.7,
  color: colors.text.secondary,
  marginTop: theme.spacing(1),
}));

const InlineLabel = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  fontWeight: 700,
  lineHeight: 1.5,
  color: colors.text.primary,
  marginBottom: theme.spacing(1),
  letterSpacing: 0,
}));

const ButtonContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
  paddingTop: theme.spacing(2),
  borderTop: `1px solid ${colors.border.soft}`,
  [theme.breakpoints.down('sm')]: {
    alignItems: 'stretch',
    flexDirection: 'column-reverse',
  },
}));

const ActionGroup = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1.5),
  justifyContent: 'flex-end',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column-reverse',
  },
}));

const getEmotionLabel = (emotionId?: EmotionType) =>
  emotionOptions.find((option) => option.id === emotionId)?.label || '';

const getSelectedEmotionOptions = (emotionIds: EmotionType[]) =>
  emotionIds
    .map((emotionId) => emotionOptions.find((option) => option.id === emotionId))
    .filter((emotion): emotion is typeof emotionOptions[number] => Boolean(emotion));

const createFallbackObservationCards = (emotionIds: EmotionType[]): DiaryAiObservationCard[] => {
  const labels = emotionIds.map(getEmotionLabel).filter(Boolean);
  const emotionText = labels.length > 0 ? labels.join('、') : '選んだ気持ち';
  return [
    {
      title: '今日の心の動き',
      body: `${emotionText}が残っているように見えます。違っていたら、その違和感も次の記録に残せます。`,
    },
    {
      title: '探究の流れ',
      body: '今日の対話から、答えを決める前に考えを整理している途中かもしれません。',
    },
    {
      title: '残っていそうな問い',
      body: 'まだ言葉になっていない引っかかりがあれば、そのまま書いて大丈夫です。',
    },
  ];
};

const mapDraftToObservationCards = (draft: DiaryDraft, emotionIds: EmotionType[]): DiaryAiObservationCard[] => {
  const fallback = createFallbackObservationCards(emotionIds);
  const aiBody = (draft.ai_diary_draft || draft.draft_body || '').trim();
  const flowBody = (draft.turning_point_note || draft.shared_summary_draft || '').trim();
  const questionBody = (draft.reflection_question || draft.closing_question || '').trim();

  return [
    {
      title: '今日の心の動き',
      body: aiBody || fallback[0].body,
    },
    {
      title: '探究の流れ',
      body: flowBody || fallback[1].body,
    },
    {
      title: '残っていそうな問い',
      body: questionBody || fallback[2].body,
    },
  ].slice(0, 3);
};

const buildSubmissionDraft = (
  cards: DiaryAiObservationCard[],
  emotionIds: EmotionType[],
  aiObservationStatus: AiObservationStatus
): DiaryDraft => {
  const body = cards.map((card) => `${card.title}: ${card.body}`).join('\n');
  return {
    draft_body: body,
    ai_diary_draft: body,
    shared_summary_draft: '',
    reflection_question: 'この見立てを読んで、自分ではどう感じましたか。',
    closing_question: 'この見立てを読んで、自分ではどう感じましたか。',
    quote: '',
    quote_context: '',
    suggested_tags: emotionIds.map(getEmotionLabel).filter(Boolean),
    turning_point_detected: false,
    turning_point_note: aiObservationStatus === 'failed' ? 'AI見立て生成に失敗しました。' : '',
  };
};

export const DiaryFlowNew: React.FC<DiaryFlowNewProps> = ({ onComplete, autoStart = false }) => {
  const [flowState, setFlowState] = useState<DiaryFlowState>(autoStart ? 'emotion_selecting' : 'not_started');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLongWaitFallback, setShowLongWaitFallback] = useState(false);
  const generationIdRef = useRef(0);
  const hasAutoStartedRef = useRef(autoStart);
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<EmotionType[]>([]);
  const [motivation, setMotivation] = useState(50);
  const [aiObservationStatus, setAiObservationStatus] = useState<AiObservationStatus>('not_requested');
  const [aiObservationCards, setAiObservationCards] = useState<DiaryAiObservationCard[]>([]);
  const [studentReflectionText, setStudentReflectionText] = useState('');
  const [submittedAt, setSubmittedAt] = useState<string | undefined>();

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    setFlowState('emotion_selecting');
  }, [autoStart]);

  useEffect(() => {
    if (flowState !== 'ai_generating') {
      setShowLongWaitFallback(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLongWaitFallback(true);
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [flowState]);

  const selectedEmotionOptions = useMemo(
    () => getSelectedEmotionOptions(selectedEmotionIds),
    [selectedEmotionIds]
  );

  const activeStep = getStepIndex(flowState);
  const isBusy = flowState === 'ai_generating' || flowState === 'submitting';
  const todayLabel = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleEmotionChange = (nextEmotionIds: EmotionType[]) => {
    setSelectedEmotionIds(nextEmotionIds);
    setAiObservationStatus('not_requested');
    setAiObservationCards([]);
    setErrorMessage(null);
  };

  const handleStart = () => {
    setFlowState('emotion_selecting');
  };

  const handleSkipObservation = () => {
    generationIdRef.current += 1;
    setAiObservationStatus('skipped');
    setAiObservationCards([]);
    setErrorMessage(null);
    setFlowState('student_reflection_editing');
  };

  const generateAiObservation = async () => {
    const currentGenerationId = generationIdRef.current + 1;
    generationIdRef.current = currentGenerationId;
    setFlowState('ai_generating');
    setAiObservationStatus('generating');
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          emotion_tags: selectedEmotionIds,
          primary_emotion: null,
          motivation_level: diaryReflectionVariant === 'heat_slider' ? motivation : null,
          student_note: '',
        }),
      });

      if (generationIdRef.current !== currentGenerationId) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || '探Qメイトの見立てを作れませんでした');
      }

      const draft = (await response.json()) as DiaryDraft;
      setAiObservationCards(mapDraftToObservationCards(draft, selectedEmotionIds));
      setAiObservationStatus('succeeded');
      setFlowState('ai_observation_ready');
    } catch (error) {
      if (generationIdRef.current !== currentGenerationId) return;
      console.error('Error generating diary observation:', error);
      setAiObservationStatus('failed');
      setAiObservationCards([]);
      setErrorMessage(
        error instanceof Error ? error.message : '探Qメイトの見立てを作れませんでした'
      );
      setFlowState('student_reflection_editing');
    }
  };

  const handleSubmit = async () => {
    if (!studentReflectionText.trim()) return;

    setFlowState('submitting');
    setErrorMessage(null);
    try {
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const submittedText = studentReflectionText.trim();
      const response = await fetch(`${API_BASE_URL}/diary/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          published_body: submittedText,
          published_quote: '',
          published_tags: selectedEmotionIds.map(getEmotionLabel).filter(Boolean),
          shared_summary: submittedText,
          student_note: submittedText,
          emotion: {
            effort_score: 3,
            mood_tags: selectedEmotionIds,
            free_text: '生徒が選択した気持ちを記録',
          },
          ai_draft: buildSubmissionDraft(aiObservationCards, selectedEmotionIds, aiObservationStatus),
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || '日誌の保存に失敗しました');
      }

      const nextSubmittedAt = new Date().toISOString();
      setSubmittedAt(nextSubmittedAt);
      setFlowState('submitted');
      onComplete?.({
        selectedEmotionIds,
        aiObservationStatus,
        aiObservationCards,
        studentReflectionText: submittedText,
        submittedAt: nextSubmittedAt,
      });
    } catch (error) {
      console.error('Error submitting diary:', error);
      setErrorMessage(error instanceof Error ? error.message : '日誌の保存に失敗しました');
      setFlowState('teacher_preview');
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (flowState === 'ai_observation_ready') {
      setFlowState('emotion_selecting');
      return;
    }
    if (flowState === 'student_reflection_editing') {
      setFlowState(aiObservationStatus === 'succeeded' ? 'ai_observation_ready' : 'emotion_selecting');
      return;
    }
    if (flowState === 'teacher_preview') {
      setFlowState('student_reflection_editing');
    }
  };

  const insertUnableToWordTemplate = () => {
    setStudentReflectionText('まだうまく言葉にできないが、今日の探究について考えが残っている。');
  };

  const canProceed =
    (flowState === 'emotion_selecting' && selectedEmotionIds.length > 0) ||
    (flowState === 'student_reflection_editing' && studentReflectionText.trim().length > 0) ||
    flowState === 'teacher_preview';

  const primaryActionLabel = (() => {
    if (flowState === 'emotion_selecting') return '次へ';
    if (flowState === 'student_reflection_editing') return 'プレビューを見る';
    if (flowState === 'teacher_preview') return '保存して先生に共有する';
    return '次へ';
  })();

  const handlePrimaryAction = () => {
    if (flowState === 'emotion_selecting') {
      void generateAiObservation();
      return;
    }
    if (flowState === 'student_reflection_editing') {
      setFlowState('teacher_preview');
      return;
    }
    if (flowState === 'teacher_preview') {
      void handleSubmit();
    }
  };

  return (
    <Container>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        探究日誌
      </Typography>
      <StepIntro>
        今日の探究で残っている気持ちを選び、探Qメイトの見立てを材料にしながら、
        最後は自分の言葉で先生に共有する記録を確認します。
      </StepIntro>

      {errorMessage && (
        <Alert
          severity={aiObservationStatus === 'failed' ? 'warning' : 'error'}
          sx={{ mb: 3 }}
          action={
            aiObservationStatus === 'failed' ? (
              <Button color="inherit" size="small" onClick={() => setFlowState('student_reflection_editing')}>
                自分の記録を書く
              </Button>
            ) : undefined
          }
        >
          {aiObservationStatus === 'failed'
            ? '探Qメイトの見立てを作れませんでした。選んだ気持ちをもとに、自分の記録を書くことができます。'
            : errorMessage}
        </Alert>
      )}

      {flowState === 'not_started' && (
        <StepContainer>
          <SoftPanel elevation={0}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: colors.text.primary }}>
                  今日の探究を記録する
                </Typography>
                <ToneNote>
                  AIが完成文を書くのではなく、あなたが自分の状態を見つめ直すための見立てを表示します。
                  先生に共有される内容は、最後の画面で確認できます。
                </ToneNote>
              </Box>
              <QuietPanel>
                <Stack spacing={1}>
                  {flowSteps.map((step, index) => (
                    <Typography key={step} variant="body2" color="text.secondary">
                      {index + 1}. {step}
                    </Typography>
                  ))}
                </Stack>
              </QuietPanel>
              <Box>
                <Button variant="contained" size="large" onClick={handleStart}>
                  今日の探究を記録する
                </Button>
              </Box>
            </Stack>
          </SoftPanel>
        </StepContainer>
      )}

      {flowState !== 'not_started' && (
        <>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {flowSteps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {flowState === 'emotion_selecting' && (
            <StepContainer>
              <SectionTitle>今の気持ちに近いものを選んでください</SectionTitle>
              <StepIntro>
                ぴったりでなくて大丈夫です。
                <br />
                今日の探究で残っている気持ちに近いものを選んでください。
              </StepIntro>
              <EmotionSelector
                value={selectedEmotionIds}
                onChange={handleEmotionChange}
                title="気持ち"
                helperText="最大4つまで選べます。"
              />

              {diaryReflectionVariant === 'heat_slider' && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    開発環境の検証用variantとして、熱量スライダーを表示しています。
                  </Typography>
                  <Box display="flex" justifyContent="center">
                    <MotivationFlameRive value={motivation} onChange={setMotivation} />
                  </Box>
                </Alert>
              )}
            </StepContainer>
          )}

          {flowState === 'ai_generating' && (
            <StepContainer>
              <SoftPanel elevation={0} role="status" aria-live="polite">
                <Stack spacing={2.5}>
                  <LinearProgress />
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <CircularProgress size={22} sx={{ color: colors.accentWarm.main }} />
                    <Typography variant="h6" sx={{ color: colors.text.primary }}>
                      探Qメイトが、今日の探究の流れを整理しています
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ color: colors.text.secondary, lineHeight: 1.8 }}>
                    選んだ気持ちや、今日の対話をもとに、
                    <br />
                    今の探究がどんな状態に見えるかをまとめています。
                    <br />
                    <br />
                    これは正解ではありません。
                    <br />
                    次の画面で、自分の感じ方と比べてみてください。
                  </Typography>
                  {showLongWaitFallback && (
                    <Alert
                      severity="info"
                      action={
                        <Button color="inherit" size="small" onClick={handleSkipObservation}>
                          このまま記録を書く
                        </Button>
                      }
                    >
                      見立ての作成に時間がかかっています。AIの見立てなしで、自分の記録を書くこともできます。
                    </Alert>
                  )}
                </Stack>
              </SoftPanel>
            </StepContainer>
          )}

          {flowState === 'ai_observation_ready' && (
            <StepContainer>
              <SectionTitle>探Qメイトから見えたこと</SectionTitle>
              <StepIntro>
                これは正解ではありません。
                <br />
                違うと思ったところや、しっくりこないところも、次の記録にそのまま書いてください。
              </StepIntro>

              <Stack spacing={2}>
                {aiObservationCards.map((card) => (
                  <SoftPanel key={card.title} elevation={0}>
                    <InlineLabel>{card.title}</InlineLabel>
                    <Typography variant="body1" sx={{ color: colors.text.secondary, lineHeight: 1.8 }}>
                      {card.body}
                    </Typography>
                  </SoftPanel>
                ))}
              </Stack>
            </StepContainer>
          )}

          {flowState === 'student_reflection_editing' && (
            <StepContainer>
              <SectionTitle>自分の言葉で記録する</SectionTitle>
              <StepIntro>
                探Qメイトの見立てを読んで、自分ではどう感じましたか。
                <br />
                合っていたこと、違ったこと、まだ言葉にできないことを、そのまま残してください。
              </StepIntro>

              <Stack spacing={2.5}>
                <TextField
                  label="今日の探究の記録"
                  placeholder={`例：
探Qメイトの見立てを見て、たしかにまだ答えを決めるより、
問いが広がっている感じがした。
でも、自分では少し焦りもある。
次は〇〇について、もう少し考えてみたい。`}
                  value={studentReflectionText}
                  onChange={(event) => setStudentReflectionText(event.target.value.slice(0, 500))}
                  fullWidth
                  multiline
                  minRows={8}
                  inputProps={{ maxLength: 500 }}
                  helperText={`${studentReflectionText.length}/500`}
                />

                {!studentReflectionText.trim() && (
                  <QuietPanel>
                    <Stack spacing={1.5} alignItems="flex-start">
                      <Typography variant="body2" color="text.secondary">
                        一文だけでも大丈夫です。まだ言葉にできない場合は、そのことをそのまま書いてください。
                      </Typography>
                      <Button variant="outlined" size="small" onClick={insertUnableToWordTemplate}>
                        まだ言葉にできない、と記録する
                      </Button>
                    </Stack>
                  </QuietPanel>
                )}

                <Alert severity="info" icon={<VisibilityOutlinedIcon />}>
                  この記録は、先生用ダッシュボードに表示されます。送信前に次の画面で確認できます。
                </Alert>
              </Stack>
            </StepContainer>
          )}

          {(flowState === 'teacher_preview' || flowState === 'submitting' || flowState === 'submitted') && (
            <StepContainer>
              <SectionTitle>
                {flowState === 'submitted' ? '記録を保存しました' : '先生に表示される内容を確認する'}
              </SectionTitle>
              <StepIntro>
                {flowState === 'submitted'
                  ? '先生用ダッシュボードに表示される内容として保存しました。'
                  : 'この内容が先生用ダッシュボードに表示されます。送信する前に、内容を確認してください。'}
              </StepIntro>

              <Stack spacing={2.5}>
                <SoftPanel elevation={0}>
                  <Stack spacing={2.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {flowState === 'submitted' ? <CheckCircleOutlineIcon color="success" /> : <EditNoteIcon color="primary" />}
                      <Typography variant="h6" sx={{ color: colors.text.primary }}>
                        先生用ダッシュボードでの表示
                      </Typography>
                    </Box>

                    <Box>
                      <InlineLabel>日付</InlineLabel>
                      <Typography variant="body1">{todayLabel}</Typography>
                    </Box>

                    <Box>
                      <InlineLabel>探究テーマ</InlineLabel>
                      <Typography variant="body1" color="text.secondary">
                        紐づく探究テーマがある場合に表示されます
                      </Typography>
                    </Box>

                    <Box>
                      <InlineLabel>選んだ気持ち</InlineLabel>
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
                      <InlineLabel>今日の探究の記録</InlineLabel>
                      <Typography
                        variant="body1"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.8,
                          color: colors.text.primary,
                        }}
                      >
                        {studentReflectionText.trim()}
                      </Typography>
                    </Box>

                    {submittedAt && (
                      <Box>
                        <InlineLabel>送信日時</InlineLabel>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(submittedAt).toLocaleString('ja-JP')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </SoftPanel>

                <QuietPanel>
                  <InlineLabel>先生に表示されないもの</InlineLabel>
                  <Stack component="ul" spacing={0.75} sx={{ pl: 2, m: 0, color: colors.text.secondary }}>
                    <Typography component="li" variant="body2">
                      探Qメイトとの元の対話
                    </Typography>
                    <Typography component="li" variant="body2">
                      AIの見立て全文
                    </Typography>
                    <Typography component="li" variant="body2">
                      入力途中の下書き
                    </Typography>
                  </Stack>
                </QuietPanel>
              </Stack>
            </StepContainer>
          )}

          {flowState !== 'ai_generating' && flowState !== 'submitted' && (
            <ButtonContainer>
              <Typography role="status" aria-live="polite" variant="body2" color="text.secondary">
                {flowState === 'emotion_selecting'
                  ? `${selectedEmotionIds.length} / 4 選択中`
                  : flowState === 'student_reflection_editing' && !studentReflectionText.trim()
                    ? '記録を1文字以上入力すると進めます'
                    : ' '}
              </Typography>
              <ActionGroup>
                <Button
                  onClick={handleBack}
                  disabled={flowState === 'emotion_selecting' || isBusy}
                >
                  {flowState === 'teacher_preview' ? '戻って修正する' : '戻る'}
                </Button>
                <Button
                  variant="contained"
                  onClick={handlePrimaryAction}
                  disabled={!canProceed || isBusy}
                >
                  {primaryActionLabel}
                </Button>
              </ActionGroup>
            </ButtonContainer>
          )}
        </>
      )}
    </Container>
  );
};
