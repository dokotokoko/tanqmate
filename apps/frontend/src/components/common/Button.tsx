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
    transition: transitions.preset.smooth,
    position: 'relative' as const,
    overflow: 'hidden',
    
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
      transition: 'left 0.5s',
    },
    
    '&:hover::before': {
      left: '100%',
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
        transform: 'translateY(-2px)',
        boxShadow: shadows.md,
      },
      
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: shadows.sm,
      },
    },
    secondary: {
      background: colors.secondary[500],
      color: colors.text.inverse,
      border: 'none',
      boxShadow: shadows.sm,
      
      '&:hover': {
        background: colors.secondary[600],
        transform: 'translateY(-2px)',
        boxShadow: shadows.md,
      },
      
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: shadows.sm,
      },
    },
    outline: {
      background: 'transparent',
      color: colors.primary[500],
      border: `2px solid ${colors.primary[500]}`,
      
      '&:hover': {
        background: colors.primary[50],
        borderColor: colors.primary[600],
        transform: 'translateY(-1px)',
      },
      
      '&:active': {
        transform: 'translateY(0)',
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
        transform: 'translateY(-2px)',
        boxShadow: shadows.md,
      },
      
      '&:active': {
        transform: 'translateY(0)',
        boxShadow: shadows.sm,
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