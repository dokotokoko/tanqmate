import React from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ChatBubbleOutline,
  Psychology,
  StyleOutlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { colors, shadows } from '../styles/design-system';

const BUG_REPORT_URL = 'https://forms.gle/K9u31TJYHcFzY3Fn9';

const featureItems = [
  { 
    icon: <StyleOutlined />, 
    title: '会話スタイルの選択', 
    body: '探究の状況に合わせて、AIのアプローチを切り替えられます。',
    image: '/images/response-style.png'
  },
  { 
    icon: <Psychology />, 
    title: 'AIがあなたの探究を分析', 
    body: '自分の関心や背景をAIに渡して、対話の質を上げられます。',
    image: '/images/ai-chat.png'
  },
  { 
    icon: <ChatBubbleOutline />, 
    title: 'カードUIで話題を選べる', 
    body: '続きの話題をカードから選ぶだけで、対話が自然に進みます。',
    image: '/images/card-ui.png'
  },
];

const faqs = [
  {
    q: '探Qメイトは答えを教えてくれますか？',
    a: '基礎情報は提供しますが、探究の問いを代わりに解くことはしません。次の一歩を一緒に探す伴走者として動きます。',
  },
  {
    q: '先生に対話の内容が全部見えますか？',
    a: '見えません。生徒が最後に確認した記録文と選んだ気持ちだけが共有されます。raw対話ログは先生画面に出しません。',
  },
  {
    q: '無料で使えますか？',
    a: '現在はβ版として無料で提供しています。将来の料金体系については改めてお知らせします。',
  },
  {
    q: 'スマホでも使えますか？',
    a: 'はい。モバイルブラウザに対応しています。アプリのインストールは不要です。',
  },
];

const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: colors.background.default, fontFamily: '"Noto Sans JP", sans-serif' }}>

      {/* Header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          bgcolor: colors.background.default,
          borderBottom: `1px solid ${colors.border.soft}`,
          py: { xs: 3, md: 4 },
          px: { xs: 2.5, md: 5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, md: 28 }, color: colors.text.primary }}>
          探Qメイト
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/signin')}
          sx={{
            bgcolor: colors.accentWarm.main,
            '&:hover': { bgcolor: colors.accentWarm.hover },
            borderRadius: '36px',
            px: { xs: 3.5, md: 5 },
            py: { xs: 1.5, md: 2 },
            fontWeight: 700,
            fontSize: { xs: 16, md: 19 },
          }}
        >
          AIとの探究を始める
        </Button>
      </Box>

      {/* Hero */}
      <Box
        component="section"
        sx={{ bgcolor: colors.background.default, pt: { xs: 10, md: 16 }, pb: { xs: 8, md: 12 }, textAlign: 'center' }}
      >
        <Container maxWidth="md">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Chip
              label="β版 公開中"
              sx={{ mb: 4, py: 2, px: 1, bgcolor: colors.accentWarm.soft, color: colors.accentWarm.active, fontWeight: 700, fontSize: 14 }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: 48, md: 80 },
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: colors.text.primary,
                mb: 3.5,
              }}
            >
              探究を、AIと一緒に。
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 18, md: 24 },
                color: colors.text.secondary,
                lineHeight: 1.9,
                maxWidth: 680,
                mx: 'auto',
                mb: 5.5,
              }}
            >
              高校生の探究をAIが伴走。問いかけ、リフレクション、先生への共有まで一本でつなぎます。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 8 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/signin')}
                sx={{
                  bgcolor: colors.accentWarm.main,
                  '&:hover': { bgcolor: colors.accentWarm.hover },
                  px: 5,
                  py: 2,
                  fontWeight: 700,
                  fontSize: 19,
                  borderRadius: '36px',
                }}
              >
                AIとの探究を始める
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/signup')}
                sx={{
                  borderColor: colors.accentWarm.main,
                  color: colors.accentWarm.main,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2, borderColor: colors.accentWarm.hover, bgcolor: colors.accentWarm.soft },
                  px: 5,
                  py: 2,
                  fontWeight: 700,
                  fontSize: 19,
                  borderRadius: '36px',
                }}
              >
                新しく登録する
              </Button>
            </Stack>
            <Box
              component="img"
              src="/images/about-tanqmate.png"
              alt="探Qメイト アプリ画面"
              sx={{
                width: '100%',
                maxWidth: 760,
                borderRadius: 1.5,
                boxShadow: shadows.lg,
                border: `1px solid ${colors.border.soft}`,
                display: 'block',
                mx: 'auto',
              }}
            />
          </motion.div>
        </Container>
      </Box>

      {/* Temporary Notice */}
      <Box sx={{ bgcolor: colors.trustBlue.soft, py: 2.5, px: { xs: 2, md: 4 } }}>
        <Container maxWidth="md">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Chip
              label="期間限定のお知らせ"
              size="small"
              sx={{ bgcolor: colors.trustBlue.main, color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: 14, color: colors.trustBlue.strong, lineHeight: 1.7 }}>
              認証方法の変更とプライバシーポリシーの整備にともない、既存ユーザーの方は再登録が必要です。ご不便をおかけします。
            </Typography>
          </Stack>
        </Container>
      </Box>

      {/* Experience — 縦2つ */}
      <Box component="section" sx={{ bgcolor: colors.background.default, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Stack spacing={{ xs: 10, md: 14 }}>

            {/* ①AIが探究を伴走 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <Grid container spacing={5} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Chip label="AI対話" sx={{ mb: 2.5, py: 1.75, px: 0.5, fontSize: 14, bgcolor: colors.accentWarm.soft, color: colors.accentWarm.active, fontWeight: 700 }} />
                  <Typography variant="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 800, lineHeight: 1.3, mb: 2.5, color: colors.text.primary }}>
                    AIが探究を一緒に前に進める
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary, lineHeight: 1.9, fontSize: { xs: 16, md: 19 } }}>
                    答えを渡すのではなく、問いかけ・情報提供・AIなりの見立てで次の一歩を探します。探究が止まる瞬間を、AIと一緒に越えられます。
                  </Typography>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Box
                    component="img"
                    src="/images/ai-chat.png"
                    alt="AI対話 画面"
                    sx={{ width: '100%', borderRadius: 1.5, boxShadow: shadows.md, border: `1px solid ${colors.border.soft}` }}
                  />
                </Grid>
              </Grid>
            </motion.div>

            {/* ②AIと一緒にリフレクション */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <Grid container spacing={5} alignItems="center" direction={{ xs: 'column', md: 'row-reverse' }}>
                <Grid item xs={12} md={5}>
                  <Chip label="リフレクション" sx={{ mb: 2.5, py: 1.75, px: 0.5, fontSize: 14, bgcolor: colors.trustBlue.soft, color: colors.trustBlue.strong, fontWeight: 700 }} />
                  <Typography variant="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 800, lineHeight: 1.3, mb: 2.5, color: colors.text.primary }}>
                    感覚からリフレクションする
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary, lineHeight: 1.9, fontSize: { xs: 16, md: 19 } }}>
                    今日残っている気持ちを選ぶだけで、AIが見立てを返してくれます。その見立てを読みながら、自分の言葉で探究の記録を書きます。
                  </Typography>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Box
                    component="img"
                    src="/images/reflection-empathy.png"
                    alt="リフレクション 画面"
                    sx={{ width: '100%', borderRadius: 1.5, boxShadow: shadows.md, border: `1px solid ${colors.border.soft}` }}
                  />
                </Grid>
              </Grid>
            </motion.div>

          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Box component="section" sx={{ bgcolor: colors.background.paper, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 9 } }}>
            <Typography sx={{ color: colors.accentWarm.active, fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', mb: 1.5 }}>FEATURES</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 46 }, fontWeight: 800, color: colors.text.primary }}>
              できること、特徴
            </Typography>
          </Box>
          <Stack spacing={{ xs: 8, md: 10 }}>
            {featureItems.map((item, i) => (
              <motion.div 
                key={item.title} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: i * 0.1 }}
              >
                <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center" direction={i % 2 === 0 ? 'row' : 'row-reverse'}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ color: colors.accentWarm.main, mb: 2 }}>{item.icon}</Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: 24, md: 32 }, color: colors.text.primary }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ fontSize: { xs: 16, md: 18 }, color: colors.text.secondary, lineHeight: 1.8 }}>
                        {item.body}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box
                      component="img"
                      src={item.image}
                      alt={item.title}
                      sx={{
                        width: '100%',
                        borderRadius: 1.5,
                        boxShadow: shadows.md,
                        border: `1px solid ${colors.border.soft}`,
                      }}
                    />
                  </Grid>
                </Grid>
              </motion.div>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* FAQ */}
      <Box component="section" sx={{ bgcolor: colors.background.default, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 9 } }}>
            <Typography sx={{ color: colors.accentWarm.active, fontWeight: 700, fontSize: 14, letterSpacing: '0.1em', mb: 1.5 }}>FAQ</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 46 }, fontWeight: 800, color: colors.text.primary }}>
              よくある質問
            </Typography>
          </Box>
          <Stack spacing={2.5}>
            {faqs.map((faq) => (
              <Paper
                key={faq.q}
                elevation={0}
                sx={{ p: 4, borderRadius: 2.5, border: `1px solid ${colors.border.soft}`, bgcolor: colors.background.paper }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Typography sx={{ fontWeight: 800, color: colors.accentWarm.main, flexShrink: 0, fontSize: 24, lineHeight: 1.3 }}>Q</Typography>
                  <Box>
                    <Typography sx={{ fontWeight: 700, mb: 1.5, fontSize: 19, color: colors.text.primary }}>{faq.q}</Typography>
                    <Typography sx={{ color: colors.text.secondary, lineHeight: 1.85, fontSize: 16 }}>{faq.a}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Final CTA */}
      <Box
        component="section"
        sx={{ bgcolor: colors.accentWarm.soft, py: { xs: 8, md: 12 }, textAlign: 'center' }}
      >
        <Container maxWidth="sm">
          <Typography variant="h2" sx={{ fontSize: { xs: 34, md: 50 }, fontWeight: 900, color: colors.text.primary, mb: 3 }}>
            探究を、AIと始めよう。
          </Typography>
          <Typography sx={{ color: colors.text.secondary, lineHeight: 1.9, mb: 5.5, fontSize: { xs: 17, md: 20 } }}>
            今すぐ無料で試せます。インストール不要。
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              onClick={() => navigate('/signin')}
              sx={{
                bgcolor: colors.accentWarm.main,
                '&:hover': { bgcolor: colors.accentWarm.hover },
                px: 5,
                py: 2,
                fontWeight: 700,
                fontSize: 19,
                borderRadius: '36px',
              }}
            >
              AIとの探究を始める
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/signup')}
              sx={{
                borderColor: colors.accentWarm.main,
                color: colors.accentWarm.main,
                borderWidth: 2,
                '&:hover': { borderWidth: 2, borderColor: colors.accentWarm.hover, bgcolor: 'rgba(255,140,90,0.08)' },
                px: 5,
                py: 2,
                fontWeight: 700,
                fontSize: 19,
                borderRadius: '36px',
              }}
            >
              新しく登録する
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: colors.background.paper, borderTop: `1px solid ${colors.border.soft}`, py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Psychology sx={{ color: colors.accentWarm.main }} />
                <Typography sx={{ fontWeight: 800, color: colors.text.primary }}>探Qメイト</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.8 }}>
                高校生の探究学習をAIが伴走するサービスです。
              </Typography>
            </Grid>
            <Grid item xs={6} md={2}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: colors.text.primary, mb: 1.5 }}>メニュー</Typography>
              <Stack spacing={1}>
                {[
                  { label: 'トップ', href: '/' },
                  { label: 'ログイン', href: '/signin' },
                  { label: '新規登録', href: '/signup' },
                ].map((l) => (
                  <Typography key={l.label} component={RouterLink} to={l.href} sx={{ fontSize: 13, color: colors.text.secondary, textDecoration: 'none', '&:hover': { color: colors.text.primary } }}>
                    {l.label}
                  </Typography>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: colors.text.primary, mb: 1.5 }}>サポート</Typography>
              <Stack spacing={1}>
                {[
                  { label: 'プライバシーポリシー', href: '/privacy' },
                  { label: '利用規約', href: '/terms' },
                  { label: 'バグ・フィードバック報告', href: BUG_REPORT_URL, external: true },
                ].map((l) =>
                  l.external ? (
                    <Typography
                      key={l.label}
                      component="a"
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ fontSize: 13, color: colors.text.secondary, textDecoration: 'none', '&:hover': { color: colors.text.primary } }}
                    >
                      {l.label}
                    </Typography>
                  ) : (
                    <Typography
                      key={l.label}
                      component={RouterLink}
                      to={l.href}
                      sx={{ fontSize: 13, color: colors.text.secondary, textDecoration: 'none', '&:hover': { color: colors.text.primary } }}
                    >
                      {l.label}
                    </Typography>
                  )
                )}
              </Stack>
            </Grid>
          </Grid>
          <Box sx={{ mt: 5, pt: 3, borderTop: `1px solid ${colors.border.soft}` }}>
            <Typography sx={{ fontSize: 12, color: colors.text.muted }}>© 2025 探Qメイト. All rights reserved.</Typography>
          </Box>
        </Container>
      </Box>

    </Box>
  );
};

export default GuidePage;
