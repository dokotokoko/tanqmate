import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { borderRadius, colors, shadows, spacing, transitions } from '../../styles/design-system';

interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost' | 'danger' | 'cool' | 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'buttonvariant',
})<{ buttonvariant?: string }>(({ buttonvariant = 'solid' }) => {
  const normalizedVariant =
    buttonvariant === 'primary'
      ? 'solid'
      : buttonvariant === 'secondary'
        ? 'cool'
        : buttonvariant;

  const baseStyles = {
    textTransform: 'none' as const,
    fontWeight: 600,
    borderRadius: borderRadius.button,
    transition: `transform ${transitions.duration.shortest} ease-out, background-color ${transitions.duration.standard} ease, border-color ${transitions.duration.standard} ease, color ${transitions.duration.standard} ease, box-shadow ${transitions.duration.standard} ease`,
    minHeight: '44px',
    boxShadow: 'none',

    '&:disabled': {
      backgroundColor: colors.grey[100],
      color: colors.text.muted,
      borderColor: colors.border.soft,
    },
  };

  const variantStyles = {
    solid: {
      backgroundColor: colors.accentWarm.main,
      color: colors.text.inverse,
      border: `1px solid ${colors.accentWarm.main}`,
      boxShadow: shadows.accent,
      '&:hover': {
        backgroundColor: colors.accentWarm.hover,
        borderColor: colors.accentWarm.hover,
        boxShadow: shadows.accent,
        transform: 'translateY(-1px)',
      },
      '&:active': {
        backgroundColor: colors.accentWarm.active,
        borderColor: colors.accentWarm.active,
        transform: 'translateY(0)',
        boxShadow: shadows.sm,
      },
    },
    soft: {
      backgroundColor: colors.accentWarm.soft,
      color: colors.accentWarm.active,
      border: `1px solid ${colors.border.warm}`,
      '&:hover': {
        backgroundColor: colors.primary[100],
        borderColor: colors.accentWarm.main,
      },
      '&:active': {
        backgroundColor: colors.primary[200],
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: colors.text.primary,
      border: `1px solid ${colors.border.soft}`,
      '&:hover': {
        backgroundColor: colors.background.paper,
        borderColor: colors.accentWarm.main,
        color: colors.accentWarm.active,
      },
      '&:active': {
        backgroundColor: colors.background.subtle,
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.text.secondary,
      border: '1px solid transparent',
      '&:hover': {
        backgroundColor: colors.background.subtle,
        color: colors.text.primary,
      },
      '&:active': {
        backgroundColor: colors.grey[100],
      },
    },
    danger: {
      backgroundColor: colors.error.main,
      color: colors.text.inverse,
      border: `1px solid ${colors.error.main}`,
      '&:hover': {
        backgroundColor: colors.error.dark,
        borderColor: colors.error.dark,
      },
      '&:active': {
        backgroundColor: '#94423B',
      },
    },
    cool: {
      backgroundColor: colors.trustBlue.soft,
      color: colors.secondary[800],
      border: `1px solid ${colors.secondary[200]}`,
      '&:hover': {
        backgroundColor: colors.secondary[100],
        borderColor: colors.trustBlue.main,
        color: colors.secondary[900],
      },
      '&:active': {
        backgroundColor: colors.secondary[200],
      },
    },
  };

  return {
    ...baseStyles,
    ...variantStyles[normalizedVariant as keyof typeof variantStyles],
  };
});

const sizeStyles = {
  small: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: '0.875rem',
    minHeight: '36px',
  },
  medium: {
    padding: `${spacing.md} ${spacing.xl}`,
    fontSize: '1rem',
    minHeight: '44px',
  },
  large: {
    padding: `${spacing.lg} ${spacing['2xl']}`,
    fontSize: '1rem',
    minHeight: '52px',
  },
};

const Button: React.FC<ButtonProps> = ({
  variant = 'solid',
  size = 'medium',
  isLoading = false,
  fullWidth = false,
  children,
  disabled,
  sx,
  ...props
}) => {
  return (
    <StyledButton
      buttonvariant={variant}
      disabled={disabled || isLoading}
      fullWidth={fullWidth}
      disableRipple
      sx={{
        ...sizeStyles[size],
        ...(fullWidth && { width: '100%' }),
        ...sx,
      }}
      {...props}
    >
      {isLoading ? <CircularProgress size={20} color="inherit" /> : children}
    </StyledButton>
  );
};

export default Button;
