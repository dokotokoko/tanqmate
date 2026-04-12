import React from 'react';
import { InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { borderRadius, colors, spacing, transitions } from '../../styles/design-system';

interface InputProps extends Omit<TextFieldProps, 'variant'> {
  variant?: 'default' | 'filled' | 'outlined' | 'surface';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'inputvariant',
})<{ inputvariant?: string }>(({ inputvariant = 'outlined' }) => {
  const usesSurfaceVariant = inputvariant === 'surface';
  const baseBackground = usesSurfaceVariant ? colors.background.subtle : colors.background.paper;

  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: borderRadius.input,
      transition: transitions.preset.smooth,
      backgroundColor: baseBackground,
      color: colors.text.primary,

      '& fieldset': {
        borderColor: colors.border.soft,
        borderWidth: '1px',
      },

      '&:hover fieldset': {
        borderColor: colors.border.warm,
      },

      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${colors.focus.warm}`,
      },

      '&.Mui-focused fieldset': {
        borderColor: colors.accentWarm.main,
        borderWidth: '1px',
      },

      '&.Mui-error': {
        boxShadow: 'none',
      },

      '&.Mui-error fieldset': {
        borderColor: colors.error.main,
      },

      '& input, & textarea': {
        padding: spacing.component.inputPadding,
        fontSize: '1rem',
        lineHeight: 1.5,
        color: colors.text.primary,
        '&::placeholder': {
          color: colors.text.muted,
          opacity: 1,
        },
      },
    },

    '& .MuiFilledInput-root': {
      borderRadius: borderRadius.input,
      backgroundColor: colors.background.subtle,
      transition: transitions.preset.smooth,
      '&:hover': {
        backgroundColor: colors.background.paper,
      },
      '&.Mui-focused': {
        backgroundColor: colors.background.paper,
        boxShadow: `0 0 0 3px ${colors.focus.warm}`,
      },
      '&:before': {
        borderBottom: `1px solid ${colors.border.soft}`,
      },
      '&:hover:not(.Mui-disabled):before': {
        borderBottom: `1px solid ${colors.border.warm}`,
      },
      '&.Mui-focused:after': {
        borderBottom: `1px solid ${colors.accentWarm.main}`,
      },
      '& input': {
        padding: `${spacing.md} ${spacing.lg} ${spacing.sm}`,
      },
    },

    '& .MuiInputLabel-root': {
      color: colors.text.secondary,
      fontSize: '0.875rem',
      '&.Mui-focused': {
        color: colors.accentWarm.active,
      },
      '&.Mui-error': {
        color: colors.error.main,
      },
    },

    '& .MuiFormHelperText-root': {
      fontSize: '0.75rem',
      marginTop: spacing.xs,
      color: colors.text.secondary,
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
  };
});

const Input: React.FC<InputProps> = ({
  variant = 'outlined',
  startIcon,
  endIcon,
  fullWidth = true,
  ...props
}) => {
  const mappedVariant =
    variant === 'default' || variant === 'surface' ? 'outlined' : variant;

  const inputProps: TextFieldProps['InputProps'] = {};

  if (startIcon) {
    inputProps.startAdornment = <InputAdornment position="start">{startIcon}</InputAdornment>;
  }

  if (endIcon) {
    inputProps.endAdornment = <InputAdornment position="end">{endIcon}</InputAdornment>;
  }

  return (
    <StyledTextField
      inputvariant={variant}
      variant={mappedVariant as 'outlined' | 'filled' | 'standard'}
      fullWidth={fullWidth}
      InputProps={inputProps}
      {...props}
    />
  );
};

export default Input;
