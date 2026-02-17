// components/Lab/useLabData.ts - 探Q LAB用データフック

import { useState, useEffect, useCallback } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth-token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ActivityHeatmapEntry {
  date: string;
  count: number;
}

export interface UserStats {
  total_chats: number;
  total_ai_responses: number;
  total_projects: number;
  total_memos: number;
  total_conversations: number;
  activity_days: number;
  estimated_play_minutes: number;
  total_memo_chars: number;
  activity_heatmap: ActivityHeatmapEntry[];
  streak_days: number;
}

export interface ProjectStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ProjectProgress {
  project_id: number;
  title: string;
  theme: string;
  created_at: string;
  memo_count: number;
  chat_count: number;
  steps: ProjectStep[];
  completion_rate: number;
}

export interface PersonalityDimension {
  score: number;
  pole: string;
  label: string;
}

export interface LearningPersonality {
  type_code: string;
  type_name: string;
  dimensions: Record<string, PersonalityDimension>;
  radar_scores: Record<string, number>;
  style_usage: Record<string, number>;
  total_messages_analyzed: number;
  confidence: number;
}

export function useLabData() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progress, setProgress] = useState<ProjectProgress[]>([]);
  const [personality, setPersonality] = useState<LearningPersonality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const [statsRes, progressRes, personalityRes] = await Promise.all([
        fetch(`${API_BASE}/lab/stats`, { headers }),
        fetch(`${API_BASE}/lab/progress`, { headers }),
        fetch(`${API_BASE}/lab/personality`, { headers }),
      ]);

      if (!statsRes.ok || !progressRes.ok || !personalityRes.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const [statsData, progressData, personalityData] = await Promise.all([
        statsRes.json(),
        progressRes.json(),
        personalityRes.json(),
      ]);

      setStats(statsData);
      setProgress(progressData);
      setPersonality(personalityData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { stats, progress, personality, loading, error, refetch: fetchData };
}
