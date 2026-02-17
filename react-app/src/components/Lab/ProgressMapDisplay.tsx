// components/Lab/ProgressMapDisplay.tsx - 壁面大ディスプレイ: プロジェクト進捗マップ

import React, { useState } from 'react';
import { Box, Typography, Chip, LinearProgress, Tooltip, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProjectProgress } from './useLabData';

interface Props {
  projects: ProjectProgress[];
}

const statusColors = {
  completed: '#4CAF50',
  in_progress: '#FF9800',
  pending: '#9E9E9E',
};

const statusLabels = {
  completed: '完了',
  in_progress: '進行中',
  pending: '未着手',
};

const ProgressMapDisplay: React.FC<Props> = ({ projects }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const project = projects[selectedIdx];

  if (!projects.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
          プロジェクトを作成して探究を始めよう
        </Typography>
      </Box>
    );
  }

  const completedSteps = project.steps.filter(s => s.status === 'completed').length;
  const inProgressSteps = project.steps.filter(s => s.status === 'in_progress').length;

  return (
    <Box>
      {/* プロジェクト切り替え */}
      {projects.length > 1 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
          <IconButton
            size="small"
            onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
            disabled={selectedIdx === 0}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronLeft />
          </IconButton>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            {selectedIdx + 1} / {projects.length}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setSelectedIdx(i => Math.min(projects.length - 1, i + 1))}
            disabled={selectedIdx === projects.length - 1}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronRight />
          </IconButton>
        </Box>
      )}

      {/* プロジェクトタイトル */}
      <AnimatePresence mode="wait">
        <motion.div
          key={project.project_id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <Typography
            variant="h6"
            sx={{
              color: '#fff',
              fontWeight: 700,
              mb: 0.5,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              fontSize: '1rem',
            }}
          >
            {project.title}
          </Typography>

          {/* 進捗バー */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={project.completion_rate}
              sx={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                bgcolor: 'rgba(255,255,255,0.15)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: 'linear-gradient(90deg, #66BB6A, #43A047)',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: '#81C784', fontWeight: 700, minWidth: 36 }}>
              {project.completion_rate}%
            </Typography>
          </Box>

          {/* ステップ統計 */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`${completedSteps} 完了`}
              size="small"
              sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#81C784', fontSize: '0.7rem', height: 22 }}
            />
            <Chip
              label={`${inProgressSteps} 進行中`}
              size="small"
              sx={{ bgcolor: 'rgba(255,152,0,0.2)', color: '#FFB74D', fontSize: '0.7rem', height: 22 }}
            />
            <Chip
              label={`メモ ${project.memo_count}件`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', height: 22 }}
            />
          </Box>

          {/* ステップマップ（蛇行パス） */}
          <Box sx={{ position: 'relative' }}>
            {project.steps.map((step, idx) => {
              const isEvenRow = Math.floor(idx / 2) % 2 === 0;
              const isRight = isEvenRow ? idx % 2 === 1 : idx % 2 === 0;
              const color = statusColors[step.status];

              return (
                <Tooltip
                  key={step.id}
                  title={`${step.description} - ${statusLabels[step.status]}`}
                  placement="top"
                  arrow
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 0.6,
                        px: 1.5,
                        mb: 0.5,
                        borderRadius: 2,
                        bgcolor: step.status === 'completed'
                          ? 'rgba(76,175,80,0.12)'
                          : step.status === 'in_progress'
                          ? 'rgba(255,152,0,0.12)'
                          : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${step.status === 'in_progress' ? 'rgba(255,152,0,0.3)' : 'transparent'}`,
                        transition: 'all 0.2s',
                        cursor: 'default',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.08)',
                          transform: 'translateX(4px)',
                        },
                      }}
                    >
                      {/* ステップアイコン */}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: step.status === 'completed'
                            ? 'rgba(76,175,80,0.3)'
                            : step.status === 'in_progress'
                            ? 'rgba(255,152,0,0.3)'
                            : 'rgba(255,255,255,0.1)',
                          border: `2px solid ${color}`,
                          fontSize: '0.9rem',
                          flexShrink: 0,
                          position: 'relative',
                        }}
                      >
                        {step.status === 'completed' ? '✓' : step.icon}
                        {/* パルスアニメーション（進行中） */}
                        {step.status === 'in_progress' && (
                          <Box
                            component={motion.div}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            sx={{
                              position: 'absolute',
                              inset: -3,
                              borderRadius: '50%',
                              border: `2px solid ${color}`,
                            }}
                          />
                        )}
                      </Box>

                      {/* ステップラベル */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: step.status === 'pending'
                              ? 'rgba(255,255,255,0.4)'
                              : '#fff',
                            fontWeight: step.status === 'in_progress' ? 700 : 400,
                            fontSize: '0.78rem',
                            textDecoration: step.status === 'completed' ? 'none' : 'none',
                          }}
                        >
                          {step.label}
                        </Typography>
                      </Box>

                      {/* 接続線 */}
                      {idx < project.steps.length - 1 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 27,
                            bottom: -6,
                            width: 2,
                            height: 6,
                            bgcolor: 'rgba(255,255,255,0.15)',
                          }}
                        />
                      )}
                    </Box>
                  </motion.div>
                </Tooltip>
              );
            })}
          </Box>
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default ProgressMapDisplay;
