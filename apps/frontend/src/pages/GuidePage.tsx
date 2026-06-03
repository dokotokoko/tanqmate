import React from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoStories,
  EditNote,
  LockOutlined,
  MapOutlined,
  Psychology,
  School,
  Timeline,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { colors, shadows } from '../styles/design-system';

const CONTACT_FORM_URL = 'https://forms.gle/K9u31TJYHcFzY3Fn9';

const Section = ({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'paper' | 'ink' }) => (
  <Box
    component="section"
    sx={{
      py: { xs: 8, md: 11 },
      bgcolor: tone === 'ink' ? '#1f2f33' : tone === 'paper' ? '#fffdf7' : '#fff8ea',
      color: tone === 'ink' ? '#fffdf7' : colors.text.primary,
    }}
  >
    {children}
  </Box>
);

const SectionHeading = ({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) => (
  <Box sx={{ mb: { xs: 4, md: 6 }, maxWidth: 760 }}>
    <Typography sx={{ color: colors.accentWarm.active, fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', mb: 1 }}>
      {eyebrow}
    </Typography>
    <Typography variant="h2" sx={{ fontSize: { xs: 30, md: 44 }, fontWeight: 800, lineHeight: 1.18, letterSpacing: 0 }}>
      {title}
    </Typography>
    {body && (
      <Typography sx={{ mt: 2, color: 'text.secondary', lineHeight: 1.9, fontSize: { xs: 15, md: 17 } }}>
        {body}
      </Typography>
    )}
  </Box>
);

const experienceCards = [
  {
    icon: <Psychology />,
    title: 'AI対話',
    body: '答えを渡し切るのではなく、問いかけ、必要な情報、AIなりの見立てを返しながら、次の一歩を一緒に探します。',
    image: '/images/app-screenshot-chat.png',
  },
  {
    icon: <EditNote />,
    title: '日誌生成',
    body: '今日残っている気持ちを選び、AIの見立てを材料にしながら、最後は自分の言葉で先生に共有する記録を残します。',
    image: '/images/usecase3.png',
  },
  {
    icon: <School />,
    title: '学校共有',
    body: '先生に見えるのは、生徒が最後に確認した記録文と選んだ気持ちです。raw対話ログやAIの見立て全文は見せません。',
    image: '/images/usecase2.png',
  },
];

const roadmapItems = [
  { status: '今できる', title: 'AIとの探究対話', body: '興味の整理、問い返し、情報提供、次アクション提案' },
  { status: '今できる', title: '感覚から始める日誌', body: '気持ちの複数選択、AI見立て、自分の記録、先生表示プレビュー' },
  { status: '実証で検証', title: '先生向け日誌ビュー', body: '生徒が確認した記録文、感情傾向、要フォローの手がかり' },
  { status: '開発予定', title: '研究用プロセス観測', body: '支援意図、対話継続、日誌完了、共有確認の評価' },
];

const faqs = [
  {
    q: '探Qメイトは答えを教えるAIですか？',
    a: 'いいえ。必要な基礎情報は出しますが、探究の問いそのものを代わりに解き切る存在ではありません。生徒が興味を広げ、自分で次の行動を選べるように伴走します。',
  },
  {
    q: '日誌は先生にそのまま見えますか？',
    a: '送信前のプレビューに表示された内容だけが先生に共有されます。AIの見立て全文、raw対話ログ、入力途中の下書きは先生画面に出しません。',
  },
  {
    q: '個人でも学校でも使えますか？',
    a: '今回のリリースでは、個人向けβと学校実証βの両方を想定しています。未成年利用や学校利用では、説明・同意・共有範囲を慎重に扱います。',
  },
  {
    q: 'まだβ版ですか？',
    a: 'はい。探究学習でAIがどのように伴走できるかを、利用者と学校現場の声をもとに検証しながら改善しています。',
  },
];

const GuidePage: React.FC = () => {
  return (
    <Box sx={{ bgcolor: colors.background.default }}>
      <Box
        component="section"
        sx={{
          minHeight: { xs: '92vh', md: '88vh' },
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
          backgroundImage: 'linear-gradient(90deg, rgba(26,35,38,0.82), rgba(26,35,38,0.44)), url(/images/app-screenshot-main.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 10 } }}>
          <Stack spacing={3} sx={{ maxWidth: 760 }}>
            <Chip
              label="先行公開β / 学校実証受付中"
              sx={{ width: 'fit-content', bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: 42, md: 72 }, fontWeight: 900, lineHeight: 1.05, letterSpacing: 0 }}>
              探究が止まる瞬間を、AIと一緒に越える。
            </Typography>
            <Typography sx={{ fontSize: { xs: 17, md: 21 }, lineHeight: 1.9, color: 'rgba(255,255,255,0.88)', maxWidth: 680 }}>
              探Qメイトは、高校生の興味の発達を支えるAI相棒です。
              答えを渡すのではなく、問いかけ、情報提供、AIなりの見立てで、次の一歩まで伴走します。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component="a"
                href={CONTACT_FORM_URL}
                target="_blank"
                rel="noreferrer"
                variant="contained"
                size="large"
                sx={{ px: 3.5, py: 1.5, bgcolor: colors.accentWarm.main, '&:hover': { bgcolor: colors.accentWarm.hover } }}
              >
                個人向けβに応募する
              </Button>
              <Button
                component="a"
                href={CONTACT_FORM_URL}
                target="_blank"
                rel="noreferrer"
                variant="outlined"
                size="large"
                sx={{
                  px: 3.5,
                  py: 1.5,
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.72)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              >
                学校実証について相談する
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Section tone="paper">
        <Container maxWidth="lg">
          <SectionHeading
            eyebrow="EXPERIENCE"
            title="探究の相棒、リフレクション、先生への共有を一本につなぐ。"
            body="対話で興味を前に進め、日誌で感覚とAIの見立てを比べ、学校では生徒が確認した記録だけを共有します。"
          />
          <Grid container spacing={3}>
            {experienceCards.map((item, index) => (
              <Grid item xs={12} md={4} key={item.title}>
                <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: '100%',
                      overflow: 'hidden',
                      borderRadius: 2,
                      border: `1px solid ${colors.border.soft}`,
                      boxShadow: shadows.sm,
                      bgcolor: colors.background.paper,
                    }}
                  >
                    <Box component="img" src={item.image} alt={item.title} sx={{ width: '100%', aspectRatio: '16 / 10', objectFit: 'cover', display: 'block' }} />
                    <Box sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ color: colors.accentWarm.active, mb: 1.5 }}>
                        {item.icon}
                        <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
                      </Stack>
                      <Typography sx={{ color: colors.text.secondary, lineHeight: 1.8 }}>{item.body}</Typography>
                    </Box>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section>
        <Container maxWidth="lg">
          <Grid container spacing={5} alignItems="center">
            <Grid item xs={12} md={6}>
              <SectionHeading
                eyebrow="REFLECTION"
                title="AIの見立てと、自分の感覚のズレから気づきを生む。"
                body="日誌生成は、行動の記録だけではありません。生徒は今日残っている気持ちを選び、AIの見立てを読んだあと、自分の言葉で探究の記録を書きます。"
              />
              <Stack spacing={1.5}>
                {['今日残っている気持ちを複数選ぶ', '探Qメイトの見立てを材料として読む', '自分の言葉で探究の記録を書く', '先生に表示される内容を最後に確認する'].map((text) => (
                  <Stack direction="row" spacing={1.2} alignItems="center" key={text}>
                    <Timeline sx={{ color: colors.trustBlue.strong }} />
                    <Typography sx={{ color: colors.text.secondary }}>{text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, border: `1px solid ${colors.border.soft}`, bgcolor: '#fffdf7', boxShadow: shadows.md }}>
                <Stack spacing={2}>
                  <Chip label="先生に共有される内容" sx={{ width: 'fit-content', bgcolor: colors.trustBlue.soft, color: colors.trustBlue.strong }} />
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>本人確認済みの記録</Typography>
                  <Typography sx={{ color: colors.text.secondary, lineHeight: 1.9 }}>
                    今日の探究では、調べた事実よりも途中で出てきた違和感に関心が移っています。
                    不安もありますが、次に確かめたい対象は少し具体化しています。
                  </Typography>
                  <Divider />
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label="モヤモヤ" />
                    <Chip label="おもしろい" />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Section>

      <Section tone="ink">
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Typography sx={{ color: '#ffcf9f', fontWeight: 800, letterSpacing: '0.08em', mb: 1 }}>SAFETY</Typography>
              <Typography variant="h2" sx={{ fontSize: { xs: 30, md: 42 }, fontWeight: 900, lineHeight: 1.2, letterSpacing: 0 }}>
                本音を書ける余白を守るために、共有範囲を絞る。
              </Typography>
            </Grid>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                {[
                  { icon: <LockOutlined />, title: 'raw対話ログは見せない', body: '先生画面には会話全文を表示しません。' },
                  { icon: <EditNote />, title: 'AIの見立て全文は見せない', body: 'AI出力は生徒の記録材料として扱い、先生画面には表示しません。' },
                  { icon: <AutoStories />, title: '記録は本人確認後', body: '共有前に生徒が先生表示プレビューを確認します。' },
                  { icon: <MapOutlined />, title: '先生は声かけに使う', body: '評価ではなく、次の伴走の手がかりとして使います。' },
                ].map((item) => (
                  <Grid item xs={12} sm={6} key={item.title}>
                    <Paper elevation={0} sx={{ height: '100%', p: 2.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}>
                      <Stack spacing={1}>
                        <Box sx={{ color: '#ffcf9f' }}>{item.icon}</Box>
                        <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.76)', lineHeight: 1.75 }}>{item.body}</Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Section>

      <Section tone="paper">
        <Container maxWidth="lg">
          <SectionHeading eyebrow="ROADMAP" title="今できることと、実証で育てること。" />
          <Grid container spacing={2}>
            {roadmapItems.map((item) => (
              <Grid item xs={12} md={6} key={item.title}>
                <Paper elevation={0} sx={{ p: 2.5, height: '100%', borderRadius: 2, border: `1px solid ${colors.border.soft}`, bgcolor: colors.background.paper }}>
                  <Chip label={item.status} size="small" sx={{ mb: 1.5, bgcolor: colors.accentWarm.soft, color: colors.accentWarm.active }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>{item.title}</Typography>
                  <Typography sx={{ color: colors.text.secondary, lineHeight: 1.75 }}>{item.body}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Section>

      <Section>
        <Container maxWidth="md">
          <SectionHeading eyebrow="FAQ" title="よくある質問" />
          <Stack spacing={2}>
            {faqs.map((faq) => (
              <Paper key={faq.q} elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${colors.border.soft}`, bgcolor: colors.background.paper }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>{faq.q}</Typography>
                <Typography sx={{ color: colors.text.secondary, lineHeight: 1.8 }}>{faq.a}</Typography>
              </Paper>
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 5 }}>
            <Button component="a" href={CONTACT_FORM_URL} target="_blank" rel="noreferrer" variant="contained" size="large">
              個人向けβに応募する
            </Button>
            <Button component="a" href={CONTACT_FORM_URL} target="_blank" rel="noreferrer" variant="outlined" size="large">
              学校実証について相談する
            </Button>
          </Stack>
        </Container>
      </Section>
    </Box>
  );
};

export default GuidePage;
