import React, { useState, useCallback } from 'react';
import { 
  selectUIState, 
  selectUIActions, 
  selectSelectedNode,
  selectQuestMapActions,
  selectIsLoading,
  selectCurrentQuest
} from '../../stores/questMapStore';
import type { CompleteNodeRequest } from '../../types/questMap';

interface QuestMapCompletionModalProps {
  open?: boolean;
  onClose?: () => void;
}

const QuestMapCompletionModal: React.FC<QuestMapCompletionModalProps> = ({ 
  open: externalOpen, 
  onClose: externalOnClose 
}) => {
  const ui = selectUIState();
  const selectedNode = selectSelectedNode();
  const currentQuest = selectCurrentQuest();
  const { setCompletionModalOpen } = selectUIActions();
  const { completeNode } = selectQuestMapActions();
  const isLoading = selectIsLoading();

  // 外部から制御される場合とストアから制御される場合の両方をサポート
  const isOpen = externalOpen !== undefined ? externalOpen : ui.isCompletionModalOpen;
  const handleClose = externalOnClose || (() => setCompletionModalOpen(false));

  // フォーム状態
  const [fb, setFb] = useState("");
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 振り返りを送信
  const doReflect = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setAiMsg("すごい！一歩前に進めたね 🎉 この経験をもとに、次のアクションでさらに深掘りしていこう！");
      setLoading(false);
    }, 1200);
  }, []);

  // フォーム送信
  const handleComplete = useCallback(async (feedback?: string) => {
    if (!selectedNode || !currentQuest) return;

    try {
      const request: CompleteNodeRequest = {
        questId: currentQuest.id,
        nodeId: selectedNode.id,
        feedback: feedback || fb.trim(),
      };

      await completeNode(request);
      
      // フォームをリセットして閉じる
      setFb("");
      setAiMsg(null);
      handleClose();
    } catch (error) {
      console.error('Failed to complete node:', error);
    }
  }, [selectedNode, currentQuest, fb, completeNode, handleClose]);

  // モーダルを閉じる
  const handleModalClose = useCallback(() => {
    setFb("");
    setAiMsg(null);
    setLoading(false);
    handleClose();
  }, [handleClose]);

  if (!selectedNode || !isOpen) return null;

  // UIモック風のスタイルでレンダリング
  return (
    <div 
      onClick={handleModalClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        onClick={e => e.stopPropagation()} 
        style={{
          width: 440,
          background: '#FFF',
          borderRadius: 22,
          padding: '36px 32px',
          boxShadow: '0 16px 60px rgba(0,0,0,0.12)',
          animation: 'qm-fadeUp 0.25s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
          <h3 style={{ 
            margin: 0, 
            fontSize: 20, 
            fontWeight: 800, 
            color: '#1A1A2E', 
            fontFamily: 'var(--font-jp)' 
          }}>
            やってみてどうだった？
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#8A8A9A' }}>
            「{selectedNode.title}」を完了します
          </p>
        </div>

        <textarea 
          value={fb} 
          onChange={e => setFb(e.target.value)}
          placeholder="感想や気づき、新しい発見を書いてみよう..."
          style={{
            width: '100%',
            height: 90,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1.5px solid #E4E4E8',
            background: '#FAFAFA',
            fontSize: 14,
            fontFamily: 'var(--font-jp)',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = '#FF8C5A'}
          onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = '#E4E4E8'}
        />

        {aiMsg && (
          <div style={{
            marginTop: 14,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, #FFF7ED, #FEF3E2)',
            border: '1px solid #FDDCB0',
            fontSize: 13,
            color: '#92400E',
            lineHeight: 1.6,
            fontFamily: 'var(--font-jp)',
          }}>
            <span style={{ fontWeight: 700 }}>🤖 AIより：</span><br />
            {aiMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button 
            onClick={handleModalClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: '1.5px solid #E4E4E8',
              background: '#FFF',
              color: '#666',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-jp)',
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#F9F9F9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFF';
            }}
          >
            キャンセル
          </button>
          
          <button 
            onClick={aiMsg ? () => handleComplete(fb) : doReflect} 
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              background: loading ? '#CCC' : 'linear-gradient(135deg, #34D399, #059669)',
              color: '#FFF',
              fontSize: 14,
              fontWeight: 700,
              cursor: loading ? 'default' : 'pointer',
              fontFamily: 'var(--font-jp)',
              boxShadow: loading ? 'none' : '0 3px 12px rgba(5,150,105,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{
                  width: 12,
                  height: 12,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                処理中...
              </span>
            ) : aiMsg ? "完了する 🎉" : "振り返りを送信"}
          </button>
        </div>
      </div>

      {/* CSS アニメーション */}
      <style>{`
        @keyframes qm-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(QuestMapCompletionModal);