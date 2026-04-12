import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import { Logout, School, AdminPanelSettings, TrendingUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { MotivationFlameRive } from '../components/Diary/MotivationFlameRive';

type EmotionKey =
  | 'wakuwaku'
  | 'tanoshii'
  | 'omoshiroi'
  | 'sukkiri'
  | 'moyamoya'
  | 'fuan'
  | 'muzukashii'
  | 'ikizumari';

type StudentCard = {
  name: string;
  num: string;
  emotion: EmotionKey;
  preview: string;
  updated: boolean;
};

type EmotionGlyph = {
  fill: string;
  stroke: string;
  text: string;
  dur: number;
  s0: number;
  s1: number;
  p0: string;
  p1: string;
};

const className = '3年2組 総合探究';

const emotionGlyphs: Record<EmotionKey, EmotionGlyph> = {
  wakuwaku: {
    fill: '#FAEEDA',
    stroke: '#EF9F27',
    text: '#854F0B',
    dur: 1.8,
    s0: 0.93,
    s1: 1.07,
    p0: 'M50,12 C68,10 88,22 90,40 C93,58 82,75 68,82 C54,90 32,90 20,78 C8,66 7,46 16,30 C24,15 32,14 50,12 Z',
    p1: 'M50,10 C70,8 92,20 93,42 C94,62 80,78 62,85 C44,92 24,88 14,72 C4,56 6,34 18,20 C28,8 32,12 50,10 Z',
  },
  tanoshii: {
    fill: '#FAECE7',
    stroke: '#D85A30',
    text: '#993C1D',
    dur: 1.6,
    s0: 0.92,
    s1: 1.08,
    p0: 'M50,8 C68,4 90,18 92,38 C94,56 80,76 62,84 C44,92 22,90 10,76 C-2,62 2,38 14,22 C24,8 34,12 50,8 Z',
    p1: 'M50,6 C70,2 92,16 94,38 C96,58 80,78 60,86 C40,94 20,92 8,78 C-4,64 0,38 12,22 C22,8 32,10 50,6 Z',
  },
  omoshiroi: {
    fill: '#EAF3DE',
    stroke: '#639922',
    text: '#3B6D11',
    dur: 2.0,
    s0: 0.92,
    s1: 1.08,
    p0: 'M50,10 C66,6 86,16 90,34 C94,52 82,72 64,82 C46,92 24,90 12,76 C0,62 4,38 16,24 C26,10 34,14 50,10 Z',
    p1: 'M50,8 C68,4 90,16 94,36 C98,56 82,76 62,86 C42,96 22,92 10,78 C-2,64 2,38 14,24 C24,10 34,12 50,8 Z',
  },
  sukkiri: {
    fill: '#E1F5EE',
    stroke: '#1D9E75',
    text: '#0F6E56',
    dur: 3.2,
    s0: 0.97,
    s1: 1.03,
    p0: 'M50,10 C65,8 82,20 86,38 C90,55 80,74 64,82 C48,90 28,86 16,72 C4,58 6,36 18,22 C28,10 36,12 50,10 Z',
    p1: 'M50,12 C63,10 80,22 84,40 C88,57 78,76 62,84 C46,92 26,88 14,74 C2,60 4,38 16,24 C26,12 36,14 50,12 Z',
  },
  moyamoya: {
    fill: '#EEEDFE',
    stroke: '#7F77DD',
    text: '#534AB7',
    dur: 4.5,
    s0: 0.94,
    s1: 1.06,
    p0: 'M48,14 C62,8 84,18 88,36 C92,52 80,72 64,82 C48,90 26,88 14,74 C2,60 6,38 18,24 C28,12 36,18 48,14 Z',
    p1: 'M52,10 C68,6 88,20 90,40 C92,56 78,76 60,86 C42,94 22,86 12,70 C2,54 8,32 22,20 C34,8 38,14 52,10 Z',
  },
  fuan: {
    fill: '#E6F1FB',
    stroke: '#378ADD',
    text: '#185FA5',
    dur: 2.4,
    s0: 0.94,
    s1: 1.04,
    p0: 'M50,16 C66,10 86,24 88,42 C90,58 78,76 62,84 C46,92 24,88 14,74 C4,60 8,38 20,26 C30,14 36,20 50,16 Z',
    p1: 'M50,14 C68,8 90,22 90,44 C90,62 76,78 58,86 C40,94 20,88 12,72 C4,56 8,34 20,22 C30,10 34,18 50,14 Z',
  },
  muzukashii: {
    fill: '#FBEAF0',
    stroke: '#D4537E',
    text: '#993556',
    dur: 3.8,
    s0: 0.95,
    s1: 1.05,
    p0: 'M50,14 C64,10 82,22 86,40 C90,56 80,74 64,84 C48,92 28,88 16,74 C4,60 6,40 16,26 C26,12 36,18 50,14 Z',
    p1: 'M50,12 C66,8 84,24 86,42 C88,58 76,76 60,86 C44,94 26,90 14,76 C2,62 4,42 14,28 C24,14 36,16 50,12 Z',
  },
  ikizumari: {
    fill: '#FCEBEB',
    stroke: '#E24B4A',
    text: '#A32D2D',
    dur: 6.0,
    s0: 0.98,
    s1: 1.02,
    p0: 'M50,18 C64,14 80,26 84,44 C88,60 76,76 60,84 C44,92 24,86 14,70 C4,54 10,34 24,22 C34,12 38,22 50,18 Z',
    p1: 'M50,20 C62,16 78,28 82,46 C86,62 74,78 58,86 C42,94 22,88 12,72 C2,56 8,36 22,24 C32,14 38,24 50,20 Z',
  },
};

const students: StudentCard[] = [
  { name: '佐藤 葵', num: '1番', emotion: 'wakuwaku', preview: '「使う動機の構造が問題だ」という気づきを語っていました。探究が深まっています。', updated: true },
  { name: '鈴木 蓮', num: '2番', emotion: 'tanoshii', preview: 'フィールド調査のアポ取りに成功。「本物の声が聞けた」と喜んでいました。', updated: true },
  { name: '高橋 陽菜', num: '3番', emotion: 'muzukashii', preview: '問いの言語化で詰まっています。「言いたいことはあるのに言葉にならない」と。', updated: true },
  { name: '田中 健司', num: '4番', emotion: 'moyamoya', preview: 'テーマを食品ロスに絞ったが、問いの型がまだ告発型にとどまっています。', updated: true },
  { name: '伊藤 翔', num: '5番', emotion: 'fuan', preview: 'eスポーツの定義調査を進めています。自分の問いとの接続がまだ弱い様子。', updated: true },
  { name: '渡辺 さくら', num: '6番', emotion: 'sukkiri', preview: '今日ようやく「問い」の形が定まった様子。次のステップが見えてきています。', updated: true },
  { name: '山本 大地', num: '7番', emotion: 'omoshiroi', preview: '図書館調査で意外な資料を発見。「こんなデータあったんだ」と興奮気味。', updated: true },
  { name: '中村 結衣', num: '8番', emotion: 'ikizumari', preview: '5日間ログが途絶えています。「何を調べればいいかわからない」状態が続いています。', updated: true },
  { name: '小林 澪', num: '9番', emotion: 'fuan', preview: 'テーマに精神医療を選んだ。個人的な動機がある様子で慎重に関わりたい。', updated: true },
  { name: '加藤 悠', num: '10番', emotion: 'moyamoya', preview: '方向は定まっているが「何から手をつければいいか」で止まっています。', updated: true },
  { name: '吉田 花音', num: '11番', emotion: 'tanoshii', preview: 'インタビュー準備を開始。「聞きたいこと多すぎてどうしよう」と楽しそう。', updated: true },
  { name: '山田 涼', num: '12番', emotion: 'moyamoya', preview: '商店街の取材イメージが出てきました。問いが自分ごとになってきた手応えあり。', updated: true },
  { name: '松本 陸', num: '13番', emotion: 'muzukashii', preview: '統計データを読んでいるが、解釈の方法がわからず詰まっています。', updated: true },
  { name: '井上 美咲', num: '14番', emotion: 'wakuwaku', preview: '比較対象の国が決まり、調査の方向性が一気に明確になってきた様子。', updated: true },
  { name: '木村 花', num: '15番', emotion: 'omoshiroi', preview: 'インフルエンサーの変遷を時系列で整理中。「時代ごとに全然違う」と発見を楽しんでいます。', updated: true },
  { name: '林 颯太', num: '16番', emotion: 'sukkiri', preview: '先週のフィードバックを受けて問いを整理し直した。スッキリした様子。', updated: true },
  { name: '清水 莉奈', num: '17番', emotion: 'fuan', preview: '発表が近いことを意識して焦りがある様子。内容はしっかり進んでいます。', updated: true },
  { name: '山崎 拓海', num: '18番', emotion: 'tanoshii', preview: '地域の人へのアンケートを自分で設計。「こんなに楽しいとは」と話していました。', updated: true },
  { name: '池田 ひなた', num: '19番', emotion: 'wakuwaku', preview: '新しい文献を見つけ、問いがさらに深まりそうな予感がしている段階。', updated: true },
  { name: '橋本 颯', num: '20番', emotion: 'muzukashii', preview: '問いは立てたが、どんな方法で検証すればよいかわからず止まっています。', updated: true },
  { name: '石川 つばさ', num: '21番', emotion: 'omoshiroi', preview: '仮説と実態が食い違っていることに気づき「これが面白い」と前向きに捉えています。', updated: true },
  { name: '前田 心', num: '22番', emotion: 'moyamoya', preview: 'テーマへの関心は本物だが、問いの射程が広すぎて絞り込みに苦労しています。', updated: true },
  { name: '藤田 葉月', num: '23番', emotion: 'sukkiri', preview: '今日は落ち着いて作業に集中できた様子。進捗もしっかり出ています。', updated: true },
  { name: '後藤 蒼', num: '24番', emotion: 'ikizumari', preview: '前回から進展なし。テーマ自体を変えたいという気持ちが出てきている様子。', updated: true },
  { name: '岡田 凜', num: '25番', emotion: 'fuan', preview: 'グループ発表のフィードバックが気になっている様子。自信が揺らいでいます。', updated: true },
  { name: '長谷川 悠斗', num: '26番', emotion: 'wakuwaku', preview: '新しい切り口を思いついたと興奮気味。問いが「問いらしくなってきた」段階。', updated: true },
  { name: '村上 柚希', num: '27番', emotion: 'tanoshii', preview: '取材先から快諾の返事。「本当に会えるんだ」と実感が湧いてきた様子。', updated: true },
  { name: '鈴木 大輝', num: '28番', emotion: 'omoshiroi', preview: 'AIに詩を書かせて比較実験中。「これ哲学じゃん」と自分で気づいていました。', updated: true },
  { name: '中島 彩', num: '29番', emotion: 'muzukashii', preview: 'データ収集は進んでいるが、そこから何が言えるのかがまだわかっていない状態。', updated: true },
  { name: '小川 歩夢', num: '30番', emotion: 'sukkiri', preview: '長かったモヤモヤ期を抜けて、今日ようやく問いの形が決まりました。', updated: false },
  { name: '西村 朱音', num: '31番', emotion: 'fuan', preview: '問いは立てたが「これでいいのか」という不安が続いています。背中を押したい。', updated: false },
  { name: '中田 倫太郎', num: '32番', emotion: 'moyamoya', preview: '何に興味があるかはわかっているが、それをどう問いにするかで迷走中。', updated: false },
];

const updatedCount = students.filter((student) => student.updated).length;

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, getAccessToken } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [motivation, setMotivation] = useState(29);

  useEffect(() => {
    const fetchProfileAndSchool = async () => {
      if (!user) return;

      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const payload = await response.json();
        const profileData = payload.profile;

        setProfile(profileData);
        if (profileData?.schools) {
          setSchoolInfo(profileData.schools);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfileAndSchool();
  }, [user, getAccessToken]);

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 3,
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(242, 224, 192, 0.55), transparent 34%), radial-gradient(circle at 85% 10%, rgba(209, 191, 167, 0.28), transparent 28%), linear-gradient(180deg, #f6f0e7 0%, #fbf8f2 38%, #f4efe7 100%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: { xs: 2, md: 2.5 },
          border: '1px solid #d8d2c8',
          borderRadius: 3,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,251,245,0.92))',
          boxShadow: '0 18px 48px rgba(56, 44, 27, 0.08)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: { xs: 28, md: 34 },
                fontWeight: 600,
                letterSpacing: '-0.03em',
                color: '#1c1a16',
                lineHeight: 1.1,
              }}
            >
              {className}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
              <Chip
                icon={<AdminPanelSettings />}
                label="Teacher"
                sx={{
                  bgcolor: '#1c1a16',
                  color: '#fff',
                  '& .MuiChip-icon': { color: '#fff' },
                }}
              />
              <Chip
                icon={<School />}
                label={schoolInfo?.name || '学校情報を取得中'}
                variant="outlined"
                sx={{
                  borderColor: '#d8d2c8',
                  color: '#4d463a',
                  bgcolor: 'rgba(255,255,255,0.75)',
                }}
              />
              <Chip
                icon={<TrendingUp />}
                label={`${students.length}名 · 本日更新 ${updatedCount}件`}
                variant="outlined"
                sx={{
                  borderColor: '#efd3a3',
                  color: '#8b5a1f',
                  bgcolor: '#fff8eb',
                }}
              />
            </Box>
          </Box>
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Logout />}
            onClick={handleLogout}
            sx={{
              alignSelf: { xs: 'stretch', md: 'center' },
              bgcolor: '#1c1a16',
              color: 'white',
              px: 2.5,
              py: 1.25,
              borderRadius: 999,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#2b2620',
                boxShadow: 'none',
              },
            }}
          >
            ログアウト
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 390px' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            border: '1px solid #ddd5c9',
            borderRadius: 3,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(251,247,240,0.95))',
            boxShadow: '0 12px 36px rgba(56, 44, 27, 0.06)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 1.5,
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: { xs: 22, md: 26 },
                  fontWeight: 600,
                  color: '#1c1a16',
                  lineHeight: 1.2,
                }}
              >
                今日の探究ログ
              </Typography>
              <Typography
                sx={{
                  mt: 0.75,
                  color: '#6b6558',
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                {profile?.name ? `${profile.name} 先生の視点で、クラス全体の探究の熱量と停滞を同時に見渡せます。` : 'クラス全体の探究の熱量と停滞を同時に見渡せます。'}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 999,
                bgcolor: '#fff7ea',
                border: '1px solid #f1d4a8',
                color: '#8b5a1f',
                flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: 12, letterSpacing: '0.08em' }}>更新</Typography>
              <Typography sx={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, fontWeight: 600, lineHeight: 1 }}>
                {updatedCount}
              </Typography>
              <Typography sx={{ fontSize: 12, letterSpacing: '0.08em' }}>件</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: '#e4ddd2' }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                border: '1px solid #e7dfd4',
                bgcolor: 'rgba(255,255,255,0.86)',
              }}
            >
              <Typography sx={{ fontSize: 12, color: '#7b6f60', letterSpacing: '0.08em' }}>生徒数</Typography>
              <Typography sx={{ mt: 0.5, fontFamily: "'Noto Serif JP', serif", fontSize: 28, fontWeight: 600, color: '#1c1a16' }}>
                32
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                border: '1px solid #e7dfd4',
                bgcolor: 'rgba(255,255,255,0.86)',
              }}
            >
              <Typography sx={{ fontSize: 12, color: '#7b6f60', letterSpacing: '0.08em' }}>今日の気配</Typography>
              <Typography sx={{ mt: 0.5, fontFamily: "'Noto Serif JP', serif", fontSize: 28, fontWeight: 600, color: '#7a4b1a' }}>
                {motivation}
              </Typography>
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: 1.75,
                borderRadius: 2.5,
                border: '1px solid #e7dfd4',
                bgcolor: 'rgba(255,255,255,0.86)',
              }}
            >
              <Typography sx={{ fontSize: 12, color: '#7b6f60', letterSpacing: '0.08em' }}>観察メモ</Typography>
              <Typography sx={{ mt: 0.75, fontSize: 13, color: '#4d463a', lineHeight: 1.75 }}>
                {motivation < 25 ? 'まだ火が小さい。立ち止まりの支援が必要。' : motivation < 50 ? '温度が上がりつつあります。問いの焦点を整える段階。' : motivation < 75 ? '探究が前進中。本人主導のリズムが出ています。' : '強い熱量。次の公開や深掘りに移せる状態です。'}
              </Typography>
            </Paper>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            border: '1px solid #ddd5c9',
            bgcolor: 'rgba(255,255,255,0.94)',
            boxShadow: '0 12px 36px rgba(56, 44, 27, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Box sx={{ width: '100%', px: 0.5, pt: 0.5 }}>
            <Typography
              sx={{
                fontSize: 11,
                letterSpacing: '0.14em',
                color: '#6b6558',
                textTransform: 'uppercase',
                mb: 0.5,
              }}
            >
              diary input
            </Typography>
            <Typography
              sx={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: 18,
                color: '#1c1a16',
                lineHeight: 1.35,
              }}
            >
              探究の温度を入力
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: 12, color: '#6b6558', lineHeight: 1.7 }}>
              Riveの焔をドラッグして、日誌生成時のモチベーションを直観的に指定します。
            </Typography>
          </Box>
          <Box sx={{ transform: 'scale(0.92)', transformOrigin: 'top center' }}>
            <MotivationFlameRive value={motivation} onChange={setMotivation} />
          </Box>
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 1,
        }}
      >
        {students.map((student, index) => {
          const glyph = emotionGlyphs[student.emotion];
          const firstChar = student.name[0];

          return (
            <Paper
              key={`${student.num}-${student.name}`}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border: '1px solid #e0d8ca',
                bgcolor: 'rgba(255,255,255,0.94)',
                cursor: 'default',
                transition: 'transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease',
                boxShadow: '0 8px 22px rgba(56, 44, 27, 0.04)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  borderColor: '#cfc3b2',
                  boxShadow: '0 14px 30px rgba(56, 44, 27, 0.08)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                  component="svg"
                  viewBox="0 0 100 100"
                  sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))',
                    animation: 'cardFloat 3.4s ease-in-out infinite',
                    animationDelay: `${(index % 8) * 0.12}s`,
                    '@keyframes cardFloat': {
                      '0%, 100%': { transform: 'translateY(0px) scale(1)' },
                      '50%': { transform: 'translateY(-2px) scale(1.02)' },
                    },
                  }}
                >
                  <path
                    d={glyph.p0}
                    fill={glyph.fill}
                    stroke={glyph.stroke}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  >
                    <animate attributeName="d" values={`${glyph.p0};${glyph.p1};${glyph.p0}`} dur={`${glyph.dur}s`} repeatCount="indefinite" />
                  </path>
                  <text
                    x="50"
                    y="56"
                    textAnchor="middle"
                    fontSize="38"
                    fontFamily="sans-serif"
                    fill={glyph.text}
                    fontWeight="500"
                  >
                    {firstChar}
                  </text>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1c1a16', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: '#7b6f60', mt: 0.25 }}>
                    {student.num}
                  </Typography>
                </Box>
              </Box>
              <Typography
                sx={{
                  fontSize: 11,
                  color: '#5f584c',
                  lineHeight: 1.7,
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                }}
              >
                {student.preview}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 10, color: student.updated ? '#9a4c1b' : '#a9a095', letterSpacing: '0.08em' }}>
                  {student.updated ? '本日更新' : '前回確認'}
                </Typography>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: student.updated ? '#cc3300' : '#d7cfc1',
                    boxShadow: student.updated ? '0 0 0 3px rgba(204,51,0,0.12)' : 'none',
                  }}
                />
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Box
        sx={{
          mt: 3,
          p: 1.75,
          borderRadius: 2.5,
          border: '1px solid #e1d8cb',
          bgcolor: 'rgba(255,255,255,0.78)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#8b8071', letterSpacing: '0.04em' }}>
          Debug Info: User ID: {user?.id}, Role: {userRole}, School ID: {profile?.school_id}
        </Typography>
      </Box>
    </Container>
  );
};

export default TeacherDashboard;
