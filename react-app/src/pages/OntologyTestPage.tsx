import React, { useState, useEffect } from 'react';
import { Box, Typography, Tab, Tabs, Paper, Alert } from '@mui/material';
import AIChat from '../components/MemoChat/AIChat';
import { useAuthStore } from '../stores/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ontology-tabpanel-${index}`}
      aria-labelledby={`ontology-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%', p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const OntologyTestPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [graphData, setGraphData] = useState<any>(null);
  const [inferenceData, setInferenceData] = useState<any>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // オントロジーチャット用のメッセージハンドラー
  const handleOntologyMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('ユーザーIDが見つかりません');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/ontology-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message,
          use_graph_mode: true,
          debug_mode: false,
          include_inference_log: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // グラフデータと推論データを更新
      if (data.graph_context) {
        setGraphData(data.graph_context);
      }
      if (data.inference_steps) {
        setInferenceData({
          steps: data.inference_steps,
          traceId: data.inference_trace_id
        });
      }

      return data.response;
    } catch (error) {
      console.error('オントロジーチャットエラー:', error);
      throw error;
    }
  };

  // グラフ状態の取得
  useEffect(() => {
    const fetchGraphState = async () => {
      if (!user?.id) return;

      try {
        const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiBaseUrl}/ontology-graph/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${user.id}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setGraphData(data);
        }
      } catch (error) {
        console.error('グラフ状態の取得エラー:', error);
      }
    };

    fetchGraphState();
  }, [user]);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
    }}>
      {/* ヘッダー */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Typography variant="h5" fontWeight={600}>
          オントロジーグラフシステム テスト
        </Typography>
        <Typography variant="body2" color="text.secondary">
          グラフベースの対話エージェント検証環境
        </Typography>
      </Box>

      {/* タブ */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="チャット" />
          <Tab label="グラフ状態" />
          <Tab label="推論ログ" />
        </Tabs>
      </Box>

      {/* コンテンツエリア */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={activeTab} index={0}>
          <AIChat
            title="オントロジーエージェント"
            persistentMode={false}
            loadHistoryFromDB={false}
            onMessageSend={handleOntologyMessage}
            initialMessage="こんにちは！オントロジーグラフシステムのテストへようこそ。何か質問がありますか？"
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              グラフ状態
            </Typography>
            {graphData ? (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(graphData, null, 2)}
                </Typography>
              </Paper>
            ) : (
              <Alert severity="info">
                グラフデータがまだありません。チャットを開始してください。
              </Alert>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              推論ログ
            </Typography>
            {inferenceData && inferenceData.steps ? (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  トレースID: {inferenceData.traceId}
                </Typography>
                {inferenceData.steps.map((step: any, index: number) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Step {index + 1}: {step.step_type}
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {step.reasoning}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      信頼度: {Math.round(step.confidence * 100)}% | 
                      処理時間: {step.processing_time_ms}ms
                    </Typography>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Alert severity="info">
                推論ログがまだありません。チャットを開始してください。
              </Alert>
            )}
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default OntologyTestPage;