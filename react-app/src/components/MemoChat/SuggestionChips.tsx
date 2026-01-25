import React from 'react';
import { Box, Chip } from '@mui/material';
import { motion } from 'framer-motion';

interface SuggestionChipsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  options,
  onSelect,
  disabled = false
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        mt: 2,
        mb: 1
      }}
    >
      {options.map((option, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Chip
            label={option}
            onClick={() => !disabled && onSelect(option)}
            disabled={disabled}
            variant="outlined"
            sx={{
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              py: { xs: 2, sm: 2.5 },
              px: { xs: 0.5, sm: 1 },
              height: 'auto',
              borderRadius: 2,
              borderColor: 'primary.main',
              color: 'primary.main',
              transition: 'all 0.2s',
              cursor: disabled ? 'not-allowed' : 'pointer',
              '&:hover': {
                backgroundColor: disabled ? 'transparent' : 'primary.light',
                transform: disabled ? 'none' : 'translateY(-2px)',
                boxShadow: disabled ? 'none' : 2
              },
              '&:active': {
                transform: 'translateY(0)',
              }
            }}
          />
        </motion.div>
      ))}
    </Box>
  );
};
