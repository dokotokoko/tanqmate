import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, spacing, borderRadius, typography, transitions } from '../../styles/design-system';

interface BadgeProps extends Omit<ChipProps, 'variant' | 'color'> {
  variant?: 'filled' | 'outlined' | 'soft';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'small' | 'medium' | 'large';
}

const colorSchemes = {
  primary: {
    filled: {
      backgroundColor: colors.primary[500],
      color: colors.text.inverse,
      borderColor: colors.primary[500],
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.primary[500],
      borderColor: colors.primary[500],
    },
    soft: {
      backgroundColor: colors.primary[50],
      color: colors.primary[700],
      borderColor: colors.primary[200],
    },
  },
  secondary: {
    filled: {
      backgroundColor: colors.secondary[500],
      color: colors.text.inverse,
      borderColor: colors.secondary[500],
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.secondary[500],
      borderColor: colors.secondary[500],
    },
    soft: {
      backgroundColor: colors.secondary[50],
      color: colors.secondary[700],
      borderColor: colors.secondary[200],
    },
  },
  success: {
    filled: {
      backgroundColor: colors.success.main,
      color: colors.text.inverse,
      borderColor: colors.success.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.success.main,
      borderColor: colors.success.main,
    },
    soft: {
      backgroundColor: `${colors.success.light}20`,
      color: colors.success.dark,
      borderColor: colors.success.light,
    },
  },
  error: {
    filled: {
      backgroundColor: colors.error.main,
      color: colors.text.inverse,
      borderColor: colors.error.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.error.main,
      borderColor: colors.error.main,
    },
    soft: {
      backgroundColor: `${colors.error.light}20`,
      color: colors.error.dark,
      borderColor: colors.error.light,
    },
  },
  warning: {
    filled: {
      backgroundColor: colors.warning.main,
      color: colors.text.inverse,
      borderColor: colors.warning.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.warning.main,
      borderColor: colors.warning.main,
    },
    soft: {
      backgroundColor: `${colors.warning.light}20`,
      color: colors.warning.dark,
      borderColor: colors.warning.light,
    },
  },
  info: {
    filled: {
      backgroundColor: colors.info.main,
      color: colors.text.inverse,
      borderColor: colors.info.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.info.main,
      borderColor: colors.info.main,
    },
    soft: {
      backgroundColor: `${colors.info.light}20`,
      color: colors.info.dark,
      borderColor: colors.info.light,
    },
  },
  default: {
    filled: {
      backgroundColor: colors.grey[500],
      color: colors.text.inverse,
      borderColor: colors.grey[500],
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.grey[700],
      borderColor: colors.grey[400],
    },
    soft: {
      backgroundColor: colors.grey[100],
      color: colors.grey[700],
      borderColor: colors.grey[300],
    },
  },
};

const sizeStyles = {
  small: {
    height: '24px',
    fontSize: typography.fontSize.xs,
    padding: `0 ${spacing.sm}`,
  },
  medium: {
    height: '32px',
    fontSize: typography.fontSize.sm,
    padding: `0 ${spacing.md}`,
  },
  large: {
    height: '40px',
    fontSize: typography.fontSize.base,
    padding: `0 ${spacing.lg}`,
  },
};

const StyledChip = styled(Chip)<{
  variantType?: string;
  colorType?: string;
  sizeType?: string;
}>(({ variantType = 'filled', colorType = 'default', sizeType = 'medium' }) => {
  const colorScheme = colorSchemes[colorType as keyof typeof colorSchemes][variantType as keyof typeof colorSchemes['primary']];
  const sizeStyle = sizeStyles[sizeType as keyof typeof sizeStyles];
  
  return {
    ...colorScheme,
    ...sizeStyle,
    borderRadius: borderRadius.chip,
    border: variantType === 'outlined' ? `1px solid ${colorScheme.borderColor}` : 'none',
    fontWeight: typography.fontWeight.medium,
    transition: transitions.preset.fast,
    cursor: 'default',
    
    '&:hover': {
      opacity: 0.9,
    },
    
    '& .MuiChip-label': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    
    '& .MuiChip-deleteIcon': {
      color: 'inherit',
      opacity: 0.7,
      marginLeft: spacing.xs,
      marginRight: `-${spacing.xs}`,
      
      '&:hover': {
        opacity: 1,
      },
    },
    
    '& .MuiChip-icon': {
      color: 'inherit',
      marginLeft: `-${spacing.xs}`,
      marginRight: spacing.xs,
    },
  };
});

const Badge: React.FC<BadgeProps> = ({
  variant = 'filled',
  color = 'default',
  size = 'medium',
  ...props
}) => {
  return (
    <StyledChip
      variantType={variant}
      colorType={color}
      sizeType={size}
      {...props}
    />
  );
};

export default Badge;