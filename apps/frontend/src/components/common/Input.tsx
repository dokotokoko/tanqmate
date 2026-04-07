import React from 'react';
import { TextField, TextFieldProps, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, spacing, borderRadius, transitions } from '../../styles/design-system';

interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'default' | 'filled' | 'outlined';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const StyledTextField = styled(TextField)<{ variant?: string }>(({ theme, variant }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: borderRadius.input,
    transition: transitions.preset.smooth,
    backgroundColor: colors.background.paper,
    
    '& fieldset': {
      borderColor: colors.grey[300],
      borderWidth: '1px',
      transition: transitions.preset.fast,
    },
    
    '&:hover fieldset': {
      borderColor: colors.primary[400],
      borderWidth: '1px',
    },
    
    '&.Mui-focused fieldset': {
      borderColor: colors.primary[500],
      borderWidth: '2px',
    },
    
    '&.Mui-error fieldset': {
      borderColor: colors.error.main,
    },
    
    '& input': {
      padding: spacing.component.inputPadding,
      fontSize: '1rem',
      lineHeight: 1.5,
      
      '&::placeholder': {
        color: colors.text.hint,
        opacity: 1,
      },
    },
    
    '& input:disabled': {
      backgroundColor: colors.grey[100],
      cursor: 'not-allowed',
    },
  },
  
  '& .MuiFilledInput-root': {
    borderRadius: borderRadius.input,
    backgroundColor: colors.grey[100],
    transition: transitions.preset.smooth,
    
    '&:hover': {
      backgroundColor: colors.grey[200],
    },
    
    '&.Mui-focused': {
      backgroundColor: colors.grey[100],
    },
    
    '&:before': {
      borderBottom: `1px solid ${colors.grey[400]}`,
    },
    
    '&:hover:not(.Mui-disabled):before': {
      borderBottom: `2px solid ${colors.primary[400]}`,
    },
    
    '&.Mui-focused:after': {
      borderBottom: `2px solid ${colors.primary[500]}`,
    },
    
    '& input': {
      padding: `${spacing.md} ${spacing.md} ${spacing.sm}`,
    },
  },
  
  '& .MuiInputLabel-root': {
    color: colors.text.secondary,
    fontSize: '0.875rem',
    
    '&.Mui-focused': {
      color: colors.primary[500],
    },
    
    '&.Mui-error': {
      color: colors.error.main,
    },
  },
  
  '& .MuiFormHelperText-root': {
    fontSize: '0.75rem',
    marginTop: spacing.xs,
    
    '&.Mui-error': {
      color: colors.error.main,
    },
  },
  
  '& .MuiInputAdornment-root': {
    color: colors.text.secondary,
    
    '& .MuiIconButton-root': {
      padding: spacing.sm,
    },
  },
}));

const Input: React.FC<InputProps> = ({
  variant = 'outlined',
  startIcon,
  endIcon,
  fullWidth = true,
  ...props
}) => {
  const inputProps: any = {};
  
  if (startIcon) {
    inputProps.startAdornment = (
      <InputAdornment position="start">{startIcon}</InputAdornment>
    );
  }
  
  if (endIcon) {
    inputProps.endAdornment = (
      <InputAdornment position="end">{endIcon}</InputAdornment>
    );
  }
  
  return (
    <StyledTextField
      variant={variant as 'outlined' | 'filled' | 'standard'}
      fullWidth={fullWidth}
      InputProps={inputProps}
      {...props}
    />
  );
};

export default Input;