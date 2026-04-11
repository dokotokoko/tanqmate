import React from 'react';
import { Box } from '@mui/material';
import { DiaryFlowNew } from '../components/Diary/DiaryFlowNew';
import { useNavigate } from 'react-router-dom';

const DiaryPage: React.FC = () => {
  const navigate = useNavigate();

  const handleComplete = () => {
    // 完了後はホームページに戻る
    navigate('/');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#FFFAED',
      py: 4 
    }}>
      <DiaryFlowNew onComplete={handleComplete} />
    </Box>
  );
};

export default DiaryPage;