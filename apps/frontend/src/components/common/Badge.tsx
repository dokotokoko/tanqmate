import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { borderRadius, colors, spacing, transitions, typography } from '../../styles/design-system';

interface BadgeProps extends Omit<ChipProps, 'variant' | 'color'> {
  variant?: 'filled' | 'outlined' | 'soft';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'small' | 'medium' | 'large';
}

const colorSchemes = {
  primary: {
    filled: {
      backgroundColor: colors.accentWarm.main,
      color: colors.text.inverse,
      borderColor: colors.accentWarm.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.accentWarm.active,
      borderColor: colors.border.warm,
    },
    soft: {
      backgroundColor: colors.accentWarm.soft,
      color: colors.accentWarm.active,
      borderColor: colors.border.warm,
    },
  },
  secondary: {
    filled: {
      backgroundColor: colors.trustBlue.main,
      color: colors.text.inverse,
      borderColor: colors.trustBlue.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.secondary[800],
      borderColor: colors.secondary[200],
    },
    soft: {
      backgroundColor: colors.trustBlue.soft,
      color: colors.secondary[800],
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
      color: colors.success.dark,
      borderColor: colors.success.main,
    },
    soft: {
      backgroundColor: colors.success.light,
      color: colors.success.dark,
      borderColor: colors.success.main,
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
      color: colors.error.dark,
      borderColor: colors.error.main,
    },
    soft: {
      backgroundColor: colors.error.light,
      color: colors.error.dark,
      borderColor: colors.error.main,
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
      color: colors.warning.dark,
      borderColor: colors.warning.main,
    },
    soft: {
      backgroundColor: colors.warning.light,
      color: colors.warning.dark,
      borderColor: colors.warning.main,
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
      color: colors.info.dark,
      borderColor: colors.info.main,
    },
    soft: {
      backgroundColor: colors.info.light,
      color: colors.info.dark,
      borderColor: colors.info.main,
    },
  },
  default: {
    filled: {
      backgroundColor: colors.grey[200],
      color: colors.text.primary,
      borderColor: colors.grey[200],
    },
    outlined: {
      backgroundColor: 'transparent',
      color: colors.text.secondary,
      borderColor: colors.border.soft,
    },
    soft: {
      backgroundColor: colors.background.subtle,
      color: colors.text.secondary,
      borderColor: colors.border.soft,
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
    height: '30px',
    fontSize: typography.fontSize.sm,
    padding: `0 ${spacing.md}`,
  },
  large: {
    height: '36px',
    fontSize: typography.fontSize.base,
    padding: `0 ${spacing.lg}`,
  },
};

const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => !['variantType', 'colorType', 'sizeType'].includes(String(prop)),
})<{
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
    border: `1px solid ${colorScheme.borderColor}`,
    fontWeight: typography.fontWeight.medium,
    transition: transitions.preset.fast,
    cursor: 'default',
    '&:hover': {
      opacity: 0.92,
    },
    '& .MuiChip-label': {
      paddingLeft: 0,
      paddingRight: 0,
    },
    '& .MuiChip-deleteIcon': {
      color: 'inherit',
      opacity: 0.72,
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
  return <StyledChip variantType={variant} colorType={color} sizeType={size} {...props} />;
};

export default Badge;
