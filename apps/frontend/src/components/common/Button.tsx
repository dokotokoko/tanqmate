import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, spacing, borderRadius, transitions, shadows } from '../../styles/design-system';

interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  fullWidth?: boolean;
}

const StyledButton = styled(MuiButton)<{ variant?: string }>(({ theme, variant }) => {
  const baseStyles = {
    textTransform: 'none' as const,
    fontWeight: 600,
    borderRadius: borderRadius.button,
    transition: 'transform 60ms ease-out, box-shadow 100ms ease-out',
    position: 'relative' as const,
    transformStyle: 'preserve-3d' as const,
    
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  const variantStyles = {
    primary: {
      background: colors.primary[500],
      color: colors.text.inverse,
      border: 'none',
      boxShadow: shadows.sm,
      
      '&:hover': {
        background: colors.primary[600],
        transform: 'scale(1.01)',
        boxShadow: shadows.md,
      },
      
      '&:active': {
        transform: 'scale(0.97)',
        boxShadow: shadows.xs,
        transition: 'transform 0ms, box-shadow 0ms',
      },
    },
    secondary: {
      background: colors.secondary[500],
      color: colors.text.inverse,
      border: 'none',
      boxShadow: shadows.sm,
      
      '&:hover': {
        background: colors.secondary[600],
        transform: 'scale(1.01)',
        boxShadow: shadows.md,
      },
      
      '&:active': {
        transform: 'scale(0.97)',
        boxShadow: shadows.xs,
        transition: 'transform 0ms, box-shadow 0ms',
      },
    },
    outline: {
      background: 'transparent',
      color: colors.primary[500],
      border: `2px solid ${colors.primary[500]}`,
      
      '&:hover': {
        background: colors.primary[50],
        borderColor: colors.primary[600],
        transform: 'scale(1.01)',
      },
      
      '&:active': {
        transform: 'scale(0.97)',
        background: colors.primary[100],
        transition: 'transform 0ms',
      },
    },
    ghost: {
      background: 'transparent',
      color: colors.primary[500],
      border: 'none',
      
      '&:hover': {
        background: colors.primary[50],
      },
      
      '&:active': {
        background: colors.primary[100],
      },
    },
    danger: {
      background: colors.error.main,
      color: colors.text.inverse,
      border: 'none',
      boxShadow: shadows.sm,
      
      '&:hover': {
        background: colors.error.dark,
        transform: 'scale(1.01)',
        boxShadow: shadows.md,
      },
      
      '&:active': {
        transform: 'scale(0.97)',
        boxShadow: shadows.xs,
        transition: 'transform 0ms, box-shadow 0ms',
      },
    },
  };

  return {
    ...baseStyles,
    ...(variant && variantStyles[variant as keyof typeof variantStyles]),
  };
});

const sizeStyles = {
  small: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    minHeight: '36px',
  },
  medium: {
    padding: `${spacing.md} ${spacing.lg}`,
    fontSize: '1rem',
    minHeight: '44px',
  },
  large: {
    padding: `${spacing.lg} ${spacing.xl}`,
    fontSize: '1.125rem',
    minHeight: '52px',
  },
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
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
      variant={variant}
      disabled={disabled || isLoading}
      fullWidth={fullWidth}
      disableRipple // MUIのリップルエフェクトを無効化
      sx={{
        ...sizeStyles[size],
        ...(fullWidth && { width: '100%' }),
        ...sx,
      }}
      {...props}
    >
      {isLoading ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default Button;