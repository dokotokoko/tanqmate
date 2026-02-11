import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Slide,
  Zoom,
} from '@mui/material';
import {
  Help as HelpIcon,
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  ExpandMore as ExpandMoreIcon,
  PlayCircleOutline as PlayIcon,
  Pause as PauseIcon,
  School as SchoolIcon,
  Map as MapIcon,
  Touch as TouchIcon,
  Keyboard as KeyboardIcon,
  Accessibility as AccessibilityIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpStep {
  title: string;
  description: string;
  content: React.ReactNode;
  target?: string;
  action?: () => void;
}

interface QuestMapHelpProps {
  open: boolean;
  onClose: () => void;
  showTutorial?: boolean;
  onStartTutorial?: () => void;
  isFirstTime?: boolean;
}

// チュートリアルステップ
const TUTORIAL_STEPS: HelpStep[] = [
  {
    title: 'クエストマップへようこそ',
    description: 'あなたの学習旅路を視覚化する探Qマップの使い方を学びましょう。',
    content: (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Box sx={{ fontSize: '4rem', mb: 2 }}>🗺️✨</Box>
        <Typography variant="h6" gutterBottom>
          探Qマップとは？
        </Typography>
        <Typography variant="body2" color="text.secondary">
          あなたの興味や目標を「クエスト」として表現し、それらの関係性を
          美しいマップ形式で表示する学習支援ツールです。
        </Typography>
      </Box>
    ),
  },
  {
    title: 'ノードの種類を理解する',
    description: '4つの異なるノードタイプがあり、それぞれ異なる役割を持ちます。',
    content: (
      <Box>
        <List dense>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>📍</ListItemIcon>
            <ListItemText
              primary="現在のクエスト"
              secondary="いま取り組んでいることを示します"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>🤔</ListItemIcon>
            <ListItemText
              primary="選択肢"
              secondary="複数の選択肢から選べる分岐点です"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>🔮</ListItemIcon>
            <ListItemText
              primary="将来のクエスト"
              secondary="今後取り組む可能性のあることです"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 40 }}>🎯</ListItemIcon>
            <ListItemText
              primary="ゴール"
              secondary="最終的に到達したい目標です"
            />
          </ListItem>
        </List>
      </Box>
    ),
  },
  {
    title: 'ノードの操作方法',
    description: 'マウスやキーボードを使ってノードを操作できます。',
    content: (
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TouchIcon fontSize="small" /> マウス操作
        </Typography>
        <List dense sx={{ mb: 2 }}>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText
              primary="クリック"
              secondary="ノードを選択"
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText
              primary="ドラッグ"
              secondary="ノードの位置を移動"
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText
              primary="右クリック"
              secondary="コンテキストメニューを表示"
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        </List>
        
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon fontSize="small" /> キーボード操作
        </Typography>
        <List dense>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText
              primary="矢印キー"
              secondary="ノード間を移動"
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText
              primary="Enter"
              secondary="ノードを選択/決定"
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemText
              primary="Escape"
              secondary="選択を解除"
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        </List>
      </Box>
    ),
  },
  {
    title: 'AIの推奨機能',
    description: 'AIがあなたに最適なクエストを推奨します。',
    content: (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            backgroundColor: 'gold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem'
          }}>
            ✨
          </Box>
          <Typography variant="body2">
            金色に光るノードはAIが推奨するクエストです
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          AIはあなたの学習履歴や興味関心、現在の進捗状況を分析して、
          最適なクエストを提案します。推奨されたクエストから始めることで、
          効率的な学習が可能になります。
        </Typography>
      </Box>
    ),
  },
  {
    title: 'ビューとナビゲーション',
    description: 'マップの表示方法をカスタマイズできます。',
    content: (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          🔍 ズーム機能
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          マウスホイールでズームイン/アウトが可能です。
          全体像を把握したり、詳細を確認したりできます。
        </Typography>
        
        <Typography variant="subtitle2" gutterBottom>
          📱 レスポンシブ表示
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          デバイスサイズに合わせて最適化された表示に自動切り替えします。
        </Typography>

        <Typography variant="subtitle2" gutterBottom>
          🌙 テーマ切り替え
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ライトモードとダークモードを切り替えて、
          お好みの表示環境で利用できます。
        </Typography>
      </Box>
    ),
  },
];

// ヘルプコンテンツカテゴリ
const HELP_CATEGORIES = [
  {
    title: '基本操作',
    icon: <TouchIcon />,
    items: [
      { title: 'ノードの選択', description: 'クリックまたはタップでノードを選択' },
      { title: 'ノードの移動', description: 'ドラッグしてノードの位置を変更' },
      { title: 'ズーム操作', description: 'マウスホイールまたはピンチでズーム' },
      { title: 'パン操作', description: '空白部分をドラッグしてビューを移動' },
    ],
  },
  {
    title: 'キーボードショートカット',
    icon: <KeyboardIcon />,
    items: [
      { title: '↑↓←→', description: 'ノード間の移動' },
      { title: 'Enter', description: 'ノードの選択/決定' },
      { title: 'Escape', description: '選択の解除' },
      { title: 'Space', description: 'ノードの詳細表示' },
      { title: 'H', description: 'ヘルプの表示/非表示' },
      { title: 'F', description: 'フルスクリーン切り替え' },
      { title: '+/-', description: 'ズームイン/アウト' },
    ],
  },
  {
    title: 'アクセシビリティ',
    icon: <AccessibilityIcon />,
    items: [
      { title: 'スクリーンリーダー対応', description: 'ARIAラベルとキーボードナビゲーション' },
      { title: 'ハイコントラスト', description: '視認性の向上' },
      { title: 'アニメーション制御', description: 'モーション感度への配慮' },
      { title: 'フォントサイズ', description: '可読性の調整' },
    ],
  },
  {
    title: '設定とカスタマイズ',
    icon: <SettingsIcon />,
    items: [
      { title: 'テーマ変更', description: 'ライト/ダークモードの切り替え' },
      { title: 'アニメーション速度', description: '表示効果の調整' },
      { title: 'レイアウト設定', description: 'ノードの配置アルゴリズム' },
      { title: '表示密度', description: 'コンパクト/標準表示' },
    ],
  },
];

const QuestMapHelp: React.FC<QuestMapHelpProps> = ({
  open,
  onClose,
  showTutorial = false,
  onStartTutorial,
  isFirstTime = false,
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(showTutorial);

  // 自動再生のタイマー
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoPlay && tutorialOpen && activeStep < TUTORIAL_STEPS.length - 1) {
      timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, 5000); // 5秒ごとに次のステップ
    } else if (activeStep >= TUTORIAL_STEPS.length - 1) {
      setAutoPlay(false);
    }
    return () => clearTimeout(timer);
  }, [autoPlay, tutorialOpen, activeStep]);

  // 初回利用時の自動チュートリアル開始
  useEffect(() => {
    if (isFirstTime && open) {
      setTutorialOpen(true);
    }
  }, [isFirstTime, open]);

  const handleNext = () => {
    setActiveStep(prev => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleTutorialStart = () => {
    setTutorialOpen(true);
    setActiveStep(0);
    onStartTutorial?.();
  };

  const handleTutorialClose = () => {
    setTutorialOpen(false);
    setAutoPlay(false);
    setActiveStep(0);
  };

  const toggleAutoPlay = () => {
    setAutoPlay(prev => !prev);
  };

  return (
    <>
      {/* メインヘルプダイアログ */}
      <Dialog
        open={open && !tutorialOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon color="primary" />
            <Typography variant="h6">探Qマップ ヘルプ</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={(_, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="基本操作" />
              <Tab label="ショートカット" />
              <Tab label="アクセシビリティ" />
              <Tab label="設定" />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>
            {HELP_CATEGORIES[tabValue] && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  {HELP_CATEGORIES[tabValue].icon}
                  <Typography variant="h6">
                    {HELP_CATEGORIES[tabValue].title}
                  </Typography>
                </Box>

                {HELP_CATEGORIES[tabValue].items.map((item, index) => (
                  <Accordion key={index} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        {item.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            startIcon={<PlayIcon />}
            onClick={handleTutorialStart}
            variant="contained"
            color="primary"
          >
            インタラクティブチュートリアルを開始
          </Button>
          <Button onClick={onClose}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* チュートリアルダイアログ */}
      <Dialog
        open={tutorialOpen}
        onClose={handleTutorialClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box />
          <Typography variant="h6" component="div" sx={{ flex: 1 }}>
            チュートリアル
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={toggleAutoPlay}
              size="small"
              color={autoPlay ? 'primary' : 'default'}
            >
              {autoPlay ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
            <IconButton onClick={handleTutorialClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {TUTORIAL_STEPS.map((step, index) => (
              <Step key={index}>
                <StepLabel>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {step.title}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Paper
                      elevation={1}
                      sx={{
                        p: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                        mb: 2,
                      }}
                    >
                      {step.content}
                    </Paper>
                  </motion.div>

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      startIcon={<BackIcon />}
                    >
                      戻る
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      endIcon={<NextIcon />}
                      disabled={activeStep === TUTORIAL_STEPS.length - 1}
                    >
                      {activeStep === TUTORIAL_STEPS.length - 1 ? '完了' : '次へ'}
                    </Button>
                    {step.action && (
                      <Button onClick={step.action} color="secondary">
                        試してみる
                      </Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {activeStep === TUTORIAL_STEPS.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  mt: 3,
                  textAlign: 'center',
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  borderRadius: 2,
                }}
              >
                <Box sx={{ fontSize: '3rem', mb: 1 }}>🎉</Box>
                <Typography variant="h6" gutterBottom>
                  チュートリアル完了！
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  これで探Qマップを効果的に活用できます。
                  素晴らしい学習の旅路をお楽しみください！
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleTutorialClose}
                  sx={{ mr: 1 }}
                >
                  マップを開始
                </Button>
                <Button onClick={() => setActiveStep(0)}>
                  もう一度見る
                </Button>
              </Paper>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* ヘルプFAB（画面右下） */}
      <AnimatePresence>
        {!open && !tutorialOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: theme.zIndex.fab,
            }}
          >
            <Fab
              color="primary"
              onClick={() => !open && !tutorialOpen && onStartTutorial?.()}
              sx={{
                boxShadow: theme.shadows[8],
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <HelpIcon />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuestMapHelp;