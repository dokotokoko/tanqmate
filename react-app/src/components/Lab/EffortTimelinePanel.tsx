// components/Lab/EffortTimelinePanel.tsx - 壁面パネル: 努力の軌跡

import React from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import type { UserStats } from './useLabData';

interface Props {
  stats: UserStats;
}

const EffortTimelinePanel: React.FC<Props> = ({ stats }) => {
  // ヒートマップを週ごとに整形（直近4週間）
  const heatmap = stats.activity_heatmap.slice(-28);

  // 最大値を計算（色の濃さに使用）
  const maxCount = Math.max(1, ...heatmap.map(d => d.count));

  // 曜日ラベル
  const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

  // 4週間分のグリッドに整形
  const weeks: typeof heatmap[] = [];
  for (let i = 0; i < heatmap.length; i += 7) {
    weeks.push(heatmap.slice(i, i + 7));
  }

  // プレイ時間をフォーマット
  const hours = Math.floor(stats.estimated_play_minutes / 60);
  const minutes = stats.estimated_play_minutes % 60;
  const playTimeText = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;

  return (
    <Box>
      {/* 統計カード群 */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
          mb: 2,
        }}
      >
        {[
          { label: '質問回数', value: stats.total_chats, icon: '💬', color: '#FF7A00' },
          { label: 'プレイ時間', value: playTimeText, icon: '⏱', color: '#42A5F5' },
          { label: 'メモ数', value: stats.total_memos, icon: '📝', color: '#66BB6A' },
          { label: '連続日数', value: `${stats.streak_days}日`, icon: '🔥', color: '#FF5722' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                textAlign: 'center',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Typography sx={{ fontSize: '1.1rem', mb: 0.3 }}>{item.icon}</Typography>
              <Typography
                variant="h6"
                sx={{
                  color: item.color,
                  fontWeight: 800,
                  fontSize: '1rem',
                  lineHeight: 1.2,
                }}
              >
                {item.value}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}
              >
                {item.label}
              </Typography>
            </Box>
          </motion.div>
        ))}
      </Box>

      {/* アクティビティヒートマップ */}
      <Typography
        variant="caption"
        sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, display: 'block', fontSize: '0.7rem' }}
      >
        直近28日のアクティビティ
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {/* 曜日ラベル列 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, pt: 0.3 }}>
          {dayLabels.map(day => (
            <Typography
              key={day}
              variant="caption"
              sx={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.55rem',
                width: 12,
                height: 14,
                lineHeight: '14px',
                textAlign: 'right',
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* ヒートマップグリッド */}
        {weeks.map((week, weekIdx) => (
          <Box key={weekIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {week.map((day, dayIdx) => {
              const intensity = day.count / maxCount;
              const bgColor = day.count === 0
                ? 'rgba(255,255,255,0.05)'
                : `rgba(255, 122, 0, ${0.15 + intensity * 0.75})`;

              return (
                <Tooltip
                  key={day.date}
                  title={`${day.date}: ${day.count}回のアクティビティ`}
                  placement="top"
                  arrow
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (weekIdx * 7 + dayIdx) * 0.015 }}
                  >
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: 0.5,
                        bgcolor: bgColor,
                        border: day.count > 0 ? '1px solid rgba(255,122,0,0.3)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'default',
                        transition: 'transform 0.15s',
                        '&:hover': {
                          transform: 'scale(1.3)',
                        },
                      }}
                    />
                  </motion.div>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* 凡例 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, justifyContent: 'flex-end' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>少</Typography>
        {[0.05, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <Box
            key={i}
            sx={{
              width: 10,
              height: 10,
              borderRadius: 0.3,
              bgcolor: i === 0
                ? 'rgba(255,255,255,0.05)'
                : `rgba(255, 122, 0, ${0.15 + intensity * 0.75})`,
            }}
          />
        ))}
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>多</Typography>
      </Box>

      {/* 追加統計 */}
      <Box
        sx={{
          mt: 2,
          pt: 1.5,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>
            総活動日数
          </Typography>
          <Typography variant="body2" sx={{ color: '#FFB74D', fontWeight: 700, fontSize: '0.85rem' }}>
            {stats.activity_days}日
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>
            メモ総文字数
          </Typography>
          <Typography variant="body2" sx={{ color: '#81C784', fontWeight: 700, fontSize: '0.85rem' }}>
            {stats.total_memo_chars.toLocaleString()}字
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>
            プロジェクト
          </Typography>
          <Typography variant="body2" sx={{ color: '#42A5F5', fontWeight: 700, fontSize: '0.85rem' }}>
            {stats.total_projects}件
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default EffortTimelinePanel;
