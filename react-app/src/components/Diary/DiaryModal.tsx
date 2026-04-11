import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  IconButton, 
  Box,
  styled
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DiaryFlowNew } from './DiaryFlowNew';

interface DiaryModalProps {
  open: boolean;
  onClose: () => void;
}

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 16,
    maxWidth: '90vw',
    width: '1200px',
    maxHeight: '90vh',
    height: 'auto',
    backgroundColor: '#FFFAED',
  },
}));

const DiaryModal: React.FC<DiaryModalProps> = ({ open, onClose }) => {
  const handleComplete = () => {
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      fullWidth
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: '#666',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0, overflow: 'auto' }}>
          <Box sx={{ py: 4, px: 3 }}>
            <DiaryFlowNew onComplete={handleComplete} />
          </Box>
        </DialogContent>
      </Box>
    </StyledDialog>
  );
};

export default DiaryModal;