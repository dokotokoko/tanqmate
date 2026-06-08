import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Book as BookIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  SendRounded as SendRoundedIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AIChat, type ResponseStyle } from '../components/MemoChat';
import { API_BASE_URL } from '../config/api';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore, type ProfileData } from '../stores/authStore';
import { AI_INITIAL_MESSAGE } from '../constants/aiMessages';
import { colors, shadows, zIndex } from '../styles/design-system';
import { FIRST_AI_TUTORIAL_PARAM, isFirstAiTutorialRequired } from '../utils/onboardingGuards';

type FirstAiTutorialStep =
  | 'first-message'
  | 'waiting-first-response'
  | 'style-selection'
  | 'second-message'
  | 'waiting-second-response'
  | 'diary-guidance'
  | 'completing'
  | 'completed';

type TutorialResponseStatus = 'success' | 'error';

const DIARY_GUIDANCE_DURATION_MS = 4200;

const buildFirstAiTutorialDraft = (profile: ProfileData | null) => {
  if (!profile) {
    return '探究のテーマについて、次に何をすればよいか一緒に整理したいです。';
  }

  const theme = profile.theme?.trim();
  const interests = (profile.interests || [])
    .map((interest) => interest.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (theme) {
    return `「${theme}」について、今の問いや仮説をもとに次に何を調べるとよいか一緒に整理したいです。`;
  }

  if (interests.length > 0) {
    return `興味がある「${interests.join('、')}」から探究テーマを考えたいです。最初の問いを一緒に整理したいです。`;
  }

  return '探究テーマをまだ決めきれていません。興味から最初の問いを一緒に整理したいです。';
};

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCurrentMemo, clearMessages, setConversationId, setHistoryOpen } = useChatStore();
  const profile = useAuthStore((state) => state.profile);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);
  const getProfile = useAuthStore((state) => state.getProfile);
  const isFirstAiTutorialActive =
    isFirstAiTutorialRequired(profile) && searchParams.get('tutorial') === FIRST_AI_TUTORIAL_PARAM;
  const [tutorialStep, setTutorialStep] = useState<FirstAiTutorialStep>('first-message');
  const [lastTutorialResponseStatus, setLastTutorialResponseStatus] = useState<TutorialResponseStatus | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [preserveTutorialConversation, setPreserveTutorialConversation] = useState(false);
  const initializedTutorialRef = useRef(false);
  const completionStartedRef = useRef(false);
  const firstAiDraft = useMemo(() => buildFirstAiTutorialDraft(profile), [profile]);
  const shouldPreserveCurrentConversation = isFirstAiTutorialActive || preserveTutorialConversation;

  useEffect(() => {
    clearCurrentMemo();
  }, [clearCurrentMemo]);

  useEffect(() => {
    if (isFirstAiTutorialActive && !initializedTutorialRef.current) {
      clearMessages();
      setConversationId(null);
      setHistoryOpen(false);
      setTutorialStep('first-message');
      setLastTutorialResponseStatus(null);
      setCompletionError(null);
      setPreserveTutorialConversation(false);
      completionStartedRef.current = false;
      initializedTutorialRef.current = true;
    }

    if (!isFirstAiTutorialActive && !preserveTutorialConversation) {
      initializedTutorialRef.current = false;
      completionStartedRef.current = false;
      setTutorialStep('first-message');
      setLastTutorialResponseStatus(null);
      setCompletionError(null);
    }
  }, [
    clearMessages,
    isFirstAiTutorialActive,
    preserveTutorialConversation,
    setConversationId,
    setHistoryOpen,
  ]);

  useEffect(() => {
    if (profile && !isFirstAiTutorialRequired(profile) && searchParams.get('tutorial') === FIRST_AI_TUTORIAL_PARAM) {
      navigate('/chat', { replace: true });
    }
  }, [navigate, profile, searchParams]);

  const handleCompleteTutorial = useCallback(async () => {
    if (completionStartedRef.current) return;

    const token = getAccessToken();
    if (!token) {
      setCompletionError('認証情報を確認できませんでした。もう一度ログインしてください。');
      return;
    }

    completionStartedRef.current = true;
    setCompletionError(null);
    setTutorialStep('completing');
    setPreserveTutorialConversation(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/first-ai-tutorial/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.detail || '初回チュートリアルの完了状態を保存できませんでした');
      }

      await getProfile();
      setTutorialStep('completed');
      navigate('/chat', { replace: true });
    } catch (error) {
      completionStartedRef.current = false;
      setTutorialStep('diary-guidance');
      setCompletionError(error instanceof Error ? error.message : '初回チュートリアルの完了状態を保存できませんでした');
    }
  }, [getAccessToken, getProfile, navigate]);

  useEffect(() => {
    if (!isFirstAiTutorialActive || tutorialStep !== 'diary-guidance' || completionError) return undefined;

    const timerId = window.setTimeout(() => {
      void handleCompleteTutorial();
    }, DIARY_GUIDANCE_DURATION_MS);

    return () => window.clearTimeout(timerId);
  }, [completionError, handleCompleteTutorial, isFirstAiTutorialActive, tutorialStep]);

  const handleTutorialMessageSendStart = useCallback(
    (result: { message: string; responseStyleId?: string | null }) => {
      if (!isFirstAiTutorialActive) return;

      setCompletionError(null);
      setLastTutorialResponseStatus(null);
      setTutorialStep((currentStep) => {
        if (currentStep === 'first-message') return 'waiting-first-response';
        if (currentStep === 'second-message') return 'waiting-second-response';
        if (currentStep === 'style-selection' && result.responseStyleId === 'deepen') {
          return 'waiting-second-response';
        }
        return currentStep;
      });
    },
    [isFirstAiTutorialActive]
  );

  const handleTutorialMessageResult = useCallback(
    (result: { status: TutorialResponseStatus }) => {
      if (!isFirstAiTutorialActive) return;

      setLastTutorialResponseStatus(result.status);
      setCompletionError(null);
      setTutorialStep((currentStep) => {
        if (currentStep === 'waiting-first-response' || currentStep === 'first-message') {
          return 'style-selection';
        }
        if (currentStep === 'waiting-second-response' || currentStep === 'second-message') {
          return 'diary-guidance';
        }
        return currentStep;
      });
    },
    [isFirstAiTutorialActive]
  );

  const handleTutorialResponseStyleChange = useCallback(
    (style: ResponseStyle) => {
      if (!isFirstAiTutorialActive || style.id !== 'deepen') return;

      setCompletionError(null);
      setLastTutorialResponseStatus(null);
      setTutorialStep((currentStep) => (currentStep === 'style-selection' ? 'second-message' : currentStep));
    },
    [isFirstAiTutorialActive]
  );

  const renderFirstAiTutorialGuide = () => {
    if (!isFirstAiTutorialActive || tutorialStep === 'completed') return null;

    const isWaiting =
      tutorialStep === 'waiting-first-response' ||
      tutorialStep === 'waiting-second-response' ||
      tutorialStep === 'completing';
    const isError = lastTutorialResponseStatus === 'error';

    const guideContent: Record<
      FirstAiTutorialStep,
      { label: string; title: string; body: string; icon: React.ReactNode }
    > = {
      'first-message': {
        label: '1/3',
        title: '最初の対話を送ってみよう',
        body: '下の相談文を送って、探Qメイトと最初の対話を始めてみましょう。',
        icon: <SendRoundedIcon sx={{ color: colors.accentWarm.main }} />,
      },
      'waiting-first-response': {
        label: '1/3',
        title: 'AIの応答を待っています',
        body: '返ってきた内容を材料にして、次は会話スタイルを切り替えます。',
        icon: <CircularProgress size={20} sx={{ color: colors.accentWarm.main }} />,
      },
      'style-selection': {
        label: '2/3',
        title: '会話スタイルを選んでみよう',
        body: '次は「考えを深めたい」に切り替えて、問いをもう少し掘り下げてみましょう。',
        icon: <TuneIcon sx={{ color: colors.trustBlue.main }} />,
      },
      'second-message': {
        label: '2/3',
        title: '問いをもう一段深めてみよう',
        body: '気になった言葉や理由を、下の入力欄に一つ書いて送ってみましょう。',
        icon: <AutoAwesomeIcon sx={{ color: colors.accentWarm.main }} />,
      },
      'waiting-second-response': {
        label: '2/3',
        title: '深める応答を待っています',
        body: 'この応答を確認したら、授業の最後に使う記録機能も案内します。',
        icon: <CircularProgress size={20} sx={{ color: colors.accentWarm.main }} />,
      },
      'diary-guidance': {
        label: '3/3',
        title: '最後に記録の入口を見ておこう',
        body: '右上に案内が出ています。授業の最後に、今日の探究を記録してみましょう。',
        icon: <BookIcon sx={{ color: colors.accentWarm.main }} />,
      },
      completing: {
        label: '3/3',
        title: 'チュートリアルを保存しています',
        body: 'このまま会話を続けられるように、今の画面を保ったまま通常利用へ切り替えます。',
        icon: <CircularProgress size={20} sx={{ color: colors.accentWarm.main }} />,
      },
      completed: {
        label: '',
        title: '',
        body: '',
        icon: null,
      },
    };

    const currentGuide = guideContent[tutorialStep];

    return (
      <Paper
        elevation={0}
        data-tutorial="first-ai-tutorial-panel"
        sx={{
          p: { xs: 1.5, sm: 1.75 },
          borderRadius: '12px',
          backgroundColor: colors.background.paper,
          border: `1px solid ${isWaiting ? colors.border.warm : colors.border.soft}`,
          boxShadow: shadows.sm,
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '10px',
                backgroundColor: colors.background.subtle,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {currentGuide.icon}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                <Typography
                  component="span"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '999px',
                    backgroundColor: colors.background.subtle,
                    color: colors.text.secondary,
                    fontSize: '12px',
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  {currentGuide.label}
                </Typography>
                {isError && tutorialStep !== 'completing' && (
                  <ErrorOutlineIcon sx={{ color: colors.warning.main, fontSize: 18 }} />
                )}
                {!isError && tutorialStep === 'diary-guidance' && (
                  <CheckCircleIcon sx={{ color: colors.success.main, fontSize: 18 }} />
                )}
              </Stack>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.text.primary, lineHeight: 1.45 }}>
                {currentGuide.title}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.65 }}>
                {currentGuide.body}
              </Typography>
            </Box>
          </Stack>

          {isError && tutorialStep !== 'completing' && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              AI応答でエラーが出ましたが、授業中に止まらないよう次の案内へ進めます。
            </Alert>
          )}

          {completionError && (
            <Alert severity="error" sx={{ py: 0.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Box sx={{ flex: 1 }}>{completionError}</Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void handleCompleteTutorial()}
                  sx={{
                    borderColor: colors.border.warm,
                    color: colors.accentWarm.active,
                    whiteSpace: 'nowrap',
                  }}
                >
                  保存を再試行
                </Button>
              </Stack>
            </Alert>
          )}
        </Stack>
      </Paper>
    );
  };

  const renderDiarySpotlight = () => {
    if (!isFirstAiTutorialActive || (tutorialStep !== 'diary-guidance' && tutorialStep !== 'completing')) {
      return null;
    }

    return (
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: zIndex.overlay,
          backgroundColor: 'rgba(45, 42, 38, 0.32)',
          pointerEvents: 'none',
        }}
      >
        <Button
          variant="contained"
          startIcon={<BookIcon />}
          tabIndex={-1}
          sx={{
            position: 'fixed',
            top: { xs: 12, sm: 18 },
            right: { xs: 12, sm: 24 },
            zIndex: zIndex.overlay + 2,
            minHeight: 40,
            px: { xs: 1.5, sm: 2 },
            borderRadius: '12px',
            backgroundColor: colors.accentWarm.main,
            color: colors.text.inverse,
            boxShadow: shadows.accent,
            fontSize: { xs: '13px', sm: '14px' },
            '&:hover': {
              backgroundColor: colors.accentWarm.main,
              boxShadow: shadows.accent,
            },
          }}
        >
          今日の探究を記録する
        </Button>
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            top: { xs: 64, sm: 74 },
            right: { xs: 12, sm: 24 },
            zIndex: zIndex.overlay + 2,
            width: 'calc(100% - 24px)',
            maxWidth: 320,
            p: 2,
            borderRadius: '12px',
            backgroundColor: colors.background.paper,
            border: `1px solid ${colors.border.soft}`,
            boxShadow: shadows.md,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.text.primary, mb: 0.5 }}>
            こんな機能もあります
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.7 }}>
            授業の最後に、今日の探究を記録してみましょう。今は場所だけ覚えておけば大丈夫です。
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      background: colors.background.default,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {renderDiarySpotlight()}
      <AIChat
        persistentMode={true}
        loadHistoryFromDB={!shouldPreserveCurrentConversation}
        initialMessage={AI_INITIAL_MESSAGE}
        initialInputValue={isFirstAiTutorialActive ? firstAiDraft : undefined}
        isTutorialLocked={isFirstAiTutorialActive}
        isMessageInputDisabled={isFirstAiTutorialActive && tutorialStep === 'style-selection'}
        inputAreaDataTutorialId="first-ai-input-area"
        inputDataTutorialId="first-ai-input"
        sendButtonDataTutorialId="first-ai-send-button"
        tutorialGuide={renderFirstAiTutorialGuide()}
        responseStyleSelectorDataTutorialId="first-ai-response-style-selector"
        forceResponseStyleSelectorOpen={isFirstAiTutorialActive && tutorialStep === 'style-selection'}
        highlightResponseStyleSelector={isFirstAiTutorialActive && tutorialStep === 'style-selection'}
        onMessageSendStart={handleTutorialMessageSendStart}
        onResponseStyleChange={handleTutorialResponseStyleChange}
        onMessageResult={handleTutorialMessageResult}
      />
    </Box>
  );
};

export default ChatPage;
