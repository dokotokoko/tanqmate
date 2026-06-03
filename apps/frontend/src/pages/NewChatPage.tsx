import React from 'react';
import { Box, Typography } from '@mui/material';

const NewChatPage: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#FFFAED',
      }}
    >
      <Typography variant="h4" gutterBottom>
        新しいチャット
      </Typography>
      <Typography variant="body1" color="text.secondary">
        このページは準備中です
      </Typography>
    </Box>
  );
};

export default NewChatPage;