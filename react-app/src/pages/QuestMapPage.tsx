import React, { useEffect, useCallback, useState, useRef } from 'react';
import { 
  selectCurrentQuest,
  selectUIState,
  selectUIActions,
  selectIsLoading,
  selectError,
  selectQuestMapActions,
  selectQuests
} from '../stores/questMapStore';
import { NodeType, NodeStatus } from '../types/questMap';
import type { QuestNode, QuestEdge } from '../types/questMap';
import QuestMapCanvas from '../components/QuestMap/QuestMapCanvas';

// UIモック風のコンポーネントを内部定義

// カテゴリ設定（UIモックから）
const CATS = {
  search: { label: "調べる", icon: "🔍", bg: "#E8F6F5", color: "#0D7377" },
  think:  { label: "考える", icon: "💭", bg: "#FFF9E6", color: "#8B6914" },
  listen: { label: "聞く",   icon: "🎤", bg: "#F3EEFF", color: "#5B21B6" },
  create: { label: "作る",   icon: "📝", bg: "#FDF2F8", color: "#9D174D" },
  data:   { label: "データ", icon: "📊", bg: "#ECFDF5", color: "#047857" },
};

// ノードサイズ設定
const NS = {
  current: { w: 130, h: 88 },
  goal:    { w: 125, h: 125 },
  action:  { w: 215, h: 90 },
  future:  { w: 185, h: 64 },
};

// 入力画面コンポーネント
const InputScreen: React.FC<{ 
  theme: string;
  setTheme: (value: string) => void;
  goal: string; 
  setGoal: (value: string) => void; 
  cur: string; 
  setCur: (value: string) => void; 
  onGenerate: () => void; 
}> = ({ theme, setTheme, goal, setGoal, cur, setCur, onGenerate }) => {
  const ok = goal.trim() && cur.trim();
  
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: "100vw", height: "100vh",
      background: "linear-gradient(155deg, #F0F7F4 0%, #EDF2F7 40%, #FDF6EE 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -120, right: -80, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,140,90,0.08) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -100, left: -60, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)" }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12 }}>
        <defs><pattern id="idots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="0.7" fill="#8BA4A8" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#idots)" />
      </svg>

      <div style={{
        position: "relative", width: 460, padding: "44px 40px",
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
        borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1A1A2E", fontFamily: "var(--font-jp)", letterSpacing: "0.02em" }}>
            クエストを設定
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "#8A8A9A" }}>
            ゴールと現状を入力して、探究マップを生成しよう
          </p>
        </div>

        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>
          📚 探究テーマ
        </label>
        <textarea value={theme} onChange={e => setTheme(e.target.value)}
          placeholder="例: 地元の環境問題について"
          style={{
            width: "100%", height: 52, padding: "12px 14px", borderRadius: 12,
            border: "1.5px solid #E4E4E8", background: "#FAFAFA", fontSize: 14,
            fontFamily: "var(--font-jp)", resize: "none", outline: "none",
            transition: "border-color 0.2s", boxSizing: "border-box",
          }}
          onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#4A90D9"}
          onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#E4E4E8"}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>
          🏆 ゴール（何を達成したい？）
        </label>
        <textarea value={goal} onChange={e => setGoal(e.target.value)}
          placeholder="例: 地元の環境問題について提案書を作成する"
          style={{
            width: "100%", height: 52, padding: "12px 14px", borderRadius: 12,
            border: "1.5px solid #E4E4E8", background: "#FAFAFA", fontSize: 14,
            fontFamily: "var(--font-jp)", resize: "none", outline: "none",
            transition: "border-color 0.2s", boxSizing: "border-box",
          }}
          onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#FF8C5A"}
          onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#E4E4E8"}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#444", marginBottom: 6 }}>
          📍 現状（今どんな状況？）
        </label>
        <textarea value={cur} onChange={e => setCur(e.target.value)}
          placeholder="例: テーマに興味はあるが、何から始めたらいいかわからない"
          style={{
            width: "100%", height: 52, padding: "12px 14px", borderRadius: 12,
            border: "1.5px solid #E4E4E8", background: "#FAFAFA", fontSize: 14,
            fontFamily: "var(--font-jp)", resize: "none", outline: "none",
            transition: "border-color 0.2s", boxSizing: "border-box",
          }}
          onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "#34D399"}
          onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "#E4E4E8"}
        />

        <button disabled={!ok} onClick={onGenerate} style={{
          width: "100%", marginTop: 24, padding: "14px 0", borderRadius: 14, border: "none",
          background: ok ? "linear-gradient(135deg, #FF8C5A, #F97316)" : "#E0E0E0",
          color: ok ? "#FFF" : "#999", fontSize: 15, fontWeight: 700, cursor: ok ? "pointer" : "default",
          fontFamily: "var(--font-jp)",
          boxShadow: ok ? "0 4px 16px rgba(249,115,22,0.3)" : "none",
          transition: "all 0.3s",
        }}>
          マップを作成 ✨
        </button>
      </div>
    </div>
  );
};

// ローディング画面コンポーネント
const LoadingScreen: React.FC = () => {
  const [dots, setDots] = useState(0);
  
  // AIチャット機能（将来実装予定）
  const handleOpenAIChat = () => {
    console.log('AI相談機能は現在開発中です');
    // TODO: 必要に応じてAIチャット機能を実装
  };
  useEffect(() => { 
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500); 
    return () => clearInterval(t); 
  }, []);
  
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      width: "100vw", height: "100vh",
      background: "linear-gradient(155deg, #F0F7F4 0%, #EDF2F7 40%, #FDF6EE 100%)",
    }}>
      <div style={{ position: "relative", width: 80, height: 80, marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          border: "3px solid #F0F0F0", borderTopColor: "#FF8C5A",
          animation: "qm-spin 1s linear infinite",
        }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🗺️</div>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1A2E", fontFamily: "var(--font-jp)" }}>
        マップを生成中{".".repeat(dots)}
      </div>
      <div style={{ fontSize: 13, color: "#8A8A9A", marginTop: 8, fontFamily: "var(--font-jp)" }}>
        AIが最適な選択肢を考えています
      </div>
    </div>
  );
};

// メインのQuestMapPageコンポーネント
const QuestMapPage: React.FC = () => {
  const currentQuest = selectCurrentQuest();
  const quests = selectQuests();
  const ui = selectUIState();
  const isLoading = selectIsLoading();
  const error = selectError();
  
  const { 
    setInputModalOpen, 
    setError,
    setConsultModalOpen 
  } = selectUIActions();
  const { createQuest, generateNodes } = selectQuestMapActions();

  // 画面状態の管理
  const [screen, setScreen] = useState<'input' | 'loading' | 'map'>('input');
  const [theme, setTheme] = useState("地元の環境問題について");
  const [goal, setGoal] = useState("地元の商店街を活性化するアイデアを提案する");
  const [cur, setCur] = useState("商店街に興味はあるが、何から始めたらいいかわからない");

  // 画面状態の管理
  useEffect(() => {
    if (currentQuest) {
      setScreen('map');
    } else {
      setScreen('input');
    }
  }, [currentQuest]);

  // ローディング状態の管理
  useEffect(() => {
    if (isLoading && currentQuest) {
      setScreen('loading');
    } else if (!isLoading && currentQuest) {
      setScreen('map');
    }
  }, [isLoading, currentQuest]);

  // クエスト生成ハンドラー
  const handleGenerate = useCallback(async () => {
    try {
      setScreen('loading');
      
      // クエスト作成
      const response = await createQuest({
        goal: goal.trim(),
        currentSituation: cur.trim(),
      });
      
      // ノード生成
      if (response && response.quest && response.quest.id) {
        await generateNodes({
          quest_id: parseInt(response.quest.id, 10),
          context: `目標: ${goal}\n現在の状況: ${cur}`,
          node_count: 5
        });
      }
      
      setScreen('map');
    } catch (error) {
      console.error('Failed to generate quest:', error);
      setScreen('input');
    }
  }, [goal, cur, createQuest, generateNodes]);

  // 設定に戻るハンドラー
  const handleBackToInput = useCallback(() => {
    setScreen('input');
  }, []);

  // グローバルCSS（コンポーネント内で定義）
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --font-jp: 'Zen Kaku Gothic New', 'Noto Sans JP', 'Hiragino Sans', sans-serif;
        --font-en: 'Outfit', 'Zen Kaku Gothic New', sans-serif;
      }
      @keyframes qm-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // エラー表示
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: '#ff4444',
        color: 'white',
        borderRadius: 8,
        zIndex: 1000,
      }}>
        {error}
      </div>
    );
  }

  // 入力画面
  if (screen === 'input') {
    return <InputScreen 
      theme={theme}
      setTheme={setTheme}
      goal={goal} 
      setGoal={setGoal} 
      cur={cur} 
      setCur={setCur} 
      onGenerate={handleGenerate} 
    />;
  }

  // ローディング画面
  if (screen === 'loading') {
    return <LoadingScreen />;
  }

  // マップ画面（簡易版 - 後で実装）
  const actions = currentQuest?.nodes?.filter(n => n.type === NodeType.CHOICE) || [];
  const done = actions.filter(n => n.status === NodeStatus.COMPLETED).length;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: "linear-gradient(155deg, #F2F5F0 0%, #EEF1F5 40%, #F8F4EE 100%)",
      fontFamily: 'var(--font-jp)',
    }}>
      {/* ドットパターン */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12, pointerEvents: 'none' }}>
        <defs><pattern id="md" x="0" y="0" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="0.8" fill="#8BA4A8" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#md)" />
      </svg>

      {/* ヘッダーオーバーレイ */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '18px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, rgba(242,245,240,0.95) 0%, rgba(242,245,240,0) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(140deg, #FF8C5A, #F97316)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(249,115,22,0.3)',
            fontSize: 20,
          }}>🗺️</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1A1A2E', fontFamily: 'var(--font-en)', letterSpacing: '-0.02em' }}>Quest Map</h1>
            <p style={{ margin: 0, fontSize: 11, color: '#8A8A9A', fontFamily: 'var(--font-jp)', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentQuest?.goal || '探究マップで学習を進めよう'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
          <div style={{
            padding: '8px 16px',
            borderRadius: 20,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <span style={{ fontSize: 11, color: '#8A8A9A', fontWeight: 500, fontFamily: 'var(--font-jp)' }}>進捗</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#FF8C5A', fontFamily: 'var(--font-en)' }}>{done}/{actions.length}</span>
            <div style={{ width: 50, height: 5, borderRadius: 3, background: '#EAEAEA', overflow: 'hidden' }}>
              <div style={{ 
                width: actions.length ? `${(done / actions.length) * 100}%` : '0%', 
                height: '100%', 
                borderRadius: 3, 
                background: 'linear-gradient(90deg, #FF8C5A, #34D399)', 
                transition: 'width 0.5s ease' 
              }} />
            </div>
          </div>
          {/* AIチャットボタン（将来実装予定） */}
          {/* <button 
            onClick={handleOpenAIChat}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(10px)',
              fontSize: 12,
              fontWeight: 600,
              color: '#666',
              cursor: 'pointer',
              fontFamily: 'var(--font-jp)',
              marginRight: 8,
            }}
          >
            💬 AIに相談
          </button> */}
          <button 
            onClick={handleBackToInput}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(10px)',
              fontSize: 12,
              fontWeight: 600,
              color: '#666',
              cursor: 'pointer',
              fontFamily: 'var(--font-jp)',
            }}
          >
            ← 設定に戻る
          </button>
        </div>
      </div>

      {/* マップキャンバス */}
      <QuestMapCanvas />

      {/* 凡例 */}
      <div style={{
        position: 'absolute',
        bottom: 22,
        left: 22,
        zIndex: 100,
        padding: '12px 18px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      }}>
        {[
          { c: '#FF8C5A', l: '次のアクション', d: false },
          { c: '#9A928A', l: 'その先のステップ', d: true }
        ].map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="28" height="6">
              <line 
                x1="0" y1="3" x2="28" y2="3" 
                stroke={it.c} 
                strokeWidth={it.d ? 2 : 2.5} 
                strokeDasharray={it.d ? '5 3' : 'none'} 
                strokeLinecap="round" 
              />
            </svg>
            <span style={{ fontSize: 11, color: '#777', fontWeight: 500, fontFamily: 'var(--font-jp)' }}>{it.l}</span>
          </div>
        ))}
        <div style={{ width: 1, height: 16, background: '#E8E8E8' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ padding: '1px 7px', borderRadius: 5, background: '#FFF', border: '2px solid #FF8C5A', fontSize: 9, fontWeight: 700, color: '#FF8C5A' }}>おすすめ</div>
          <span style={{ fontSize: 11, color: '#777', fontWeight: 500, fontFamily: 'var(--font-jp)' }}>推奨</span>
        </div>
      </div>

      {/* ズームコントロール */}
      <div style={{ position: 'absolute', bottom: 22, right: 22, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[
          { l: '+', fn: () => {}, r: '12px 12px 3px 3px' },
          { l: '100%', fn: () => {}, r: '3px' },
          { l: '−', fn: () => {}, r: '3px 3px 12px 12px' },
        ].map((b, i) => (
          <button key={i} onClick={b.fn} style={{
            width: 42,
            height: i === 1 ? 30 : 36,
            borderRadius: b.r,
            border: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: i === 1 ? 10 : 20,
            fontWeight: i === 1 ? 700 : 300,
            color: '#555',
            fontFamily: i === 1 ? 'var(--font-en)' : 'inherit',
          }}>
            {b.l}
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(QuestMapPage);