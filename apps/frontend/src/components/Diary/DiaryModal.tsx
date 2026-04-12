import React, { useId } from 'react';
import { 
  Dialog, 
  DialogTitle,
  DialogContentText,
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

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

const DiaryModal: React.FC<DiaryModalProps> = ({ open, onClose }) => {
  const titleId = useId();
  const descriptionId = useId();

  const handleComplete = () => {
    onClose();
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <Box sx={{ position: 'relative' }}>
        <DialogTitle id={titleId} sx={visuallyHidden}>
          探究日誌を作成する
        </DialogTitle>
        <DialogContentText id={descriptionId} sx={visuallyHidden}>
          今日の対話から日誌を生成し、気持ちと探究の火の強さを調整して保存します。
        </DialogContentText>
        <IconButton
          onClick={onClose}
          aria-label="日誌作成を閉じる"
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
