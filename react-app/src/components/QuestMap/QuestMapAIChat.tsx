import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  selectCurrentQuest, 
  selectSelectedNode 
} from '../../stores/questMapStore';

interface QuestMapAIChatProps {
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const QuestMapAIChat: React.FC<QuestMapAIChatProps> = ({ onClose }) => {
  const currentQuest = selectCurrentQuest();
  const selectedNode = selectSelectedNode();
  
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { 
      role: 'ai', 
      text: selectedNode 
        ? `「${selectedNode.title}」について質問があれば聞いてね！どんなことでも相談に乗るよ 😊` 
        : 'こんにちは！探Qマップについて何でもお聞きください 😊',
      timestamp: new Date()
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [msgs]);

  const send = useCallback(() => {
    if (!input.trim() || loading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      text: input.trim(),
      timestamp: new Date()
    };
    
    setMsgs(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    setTimeout(() => {
      const replies = [
        `いい質問だね！${selectedNode ? `「${selectedNode.title}」` : 'そのテーマ'}を進めるには、まず小さく始めることがポイントだよ。具体的にどこが気になっている？`,
        `なるほど。その方法はいくつかあるよ。一番取り組みやすいのは、まず身近な情報から集めてみること。`,
        `その視点はとても面白い！探究学習では「自分ならでは」の切り口が大事。もう少し掘り下げてみよう 💡`,
        `そうですね。${currentQuest ? `「${currentQuest.goal}」` : 'その目標'}に向かって一歩ずつ進んでいけば大丈夫。何か具体的に困っていることはある？`,
        `すばらしい着眼点です！そのアプローチなら成功の可能性が高そう。次のステップを一緒に考えてみましょう 🚀`,
      ];
      
      const aiMessage: ChatMessage = {
        role: 'ai',
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date()
      };
      
      setMsgs(prev => [...prev, aiMessage]);
      setLoading(false);
    }, 1000 + Math.random() * 500);
  }, [input, loading, selectedNode, currentQuest]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      send();
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          width: 380,
          height: '100%',
          background: '#FFF',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'qm-slideLeft 0.3s ease-out',
        }}
      >
        {/* ヘッダー */}
        <div style={{
          padding: '20px 22px',
          borderBottom: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ 
              fontSize: 15, 
              fontWeight: 700, 
              color: '#1A1A2E', 
              fontFamily: 'var(--font-jp)' 
            }}>
              💬 AIに相談
            </div>
            <div style={{ fontSize: 11, color: '#8A8A9A', marginTop: 2 }}>
              {selectedNode ? selectedNode.title : currentQuest?.goal || 'Quest Map'}
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              background: '#F5F5F5',
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EEEEEE'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F5F5F5'}
          >
            ✕
          </button>
        </div>

        {/* メッセージエリア */}
        <div style={{ 
          flex: 1, 
          padding: '16px 18px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 12 
        }}>
          {msgs.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 14,
              background: m.role === 'user' 
                ? 'linear-gradient(135deg, #FF8C5A, #F97316)' 
                : '#F5F5F5',
              color: m.role === 'user' ? '#FFF' : '#333',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'var(--font-jp)',
              borderBottomRightRadius: m.role === 'user' ? 4 : 14,
              borderBottomLeftRadius: m.role === 'ai' ? 4 : 14,
              wordWrap: 'break-word',
            }}>
              {m.text}
            </div>
          ))}
          
          {loading && (
            <div style={{ 
              alignSelf: 'flex-start', 
              padding: '10px 14px', 
              borderRadius: 14, 
              background: '#F5F5F5', 
              fontSize: 13, 
              color: '#999',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 12,
                height: 12,
                border: '2px solid #ddd',
                borderTopColor: '#666',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              考え中...
            </div>
          )}
          
          <div ref={bottomRef} />
        </div>

        {/* 入力エリア */}
        <div style={{ 
          padding: '14px 18px', 
          borderTop: '1px solid #F0F0F0', 
          display: 'flex', 
          gap: 8 
        }}>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="質問を入力..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1.5px solid #E4E4E8',
              fontSize: 13,
              fontFamily: 'var(--font-jp)',
              outline: 'none',
              transition: 'border-color 0.2s',
              background: loading ? '#F9F9F9' : '#FFF',
            }}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#FF8C5A'}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#E4E4E8'}
          />
          <button 
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 18px',
              borderRadius: 12,
              border: 'none',
              background: (loading || !input.trim()) ? '#CCC' : '#FF8C5A',
              color: '#FFF',
              fontWeight: 700,
              fontSize: 13,
              cursor: (loading || !input.trim()) ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (!loading && input.trim()) {
                e.currentTarget.style.background = '#E07B47';
              }
            }}
            onMouseLeave={e => {
              if (!loading && input.trim()) {
                e.currentTarget.style.background = '#FF8C5A';
              }
            }}
          >
            送信
          </button>
        </div>
      </div>

      {/* CSS アニメーション */}
      <style>{`
        @keyframes qm-slideLeft {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(QuestMapAIChat);