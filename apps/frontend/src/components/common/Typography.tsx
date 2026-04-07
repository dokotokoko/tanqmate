import React from 'react';
import { Typography as MuiTypography, TypographyProps as MuiTypographyProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, typography, gradients } from '../../styles/design-system';

interface TypographyProps extends Omit<MuiTypographyProps, 'variant'> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label';
  gradient?: boolean;
  gradientType?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'textPrimary' | 'textSecondary' | 'textDisabled';
  truncate?: boolean | number;
}

const StyledTypography = styled(MuiTypography)<{
  gradient?: boolean;
  gradientType?: string;
  truncate?: boolean | number;
}>(({ gradient, gradientType, truncate }) => {
  const baseStyles = {
    fontFamily: typography.fontFamily.primary,
  };

  const gradientStyles = gradient
    ? {
        background: gradientType && gradients[gradientType as keyof typeof gradients] || gradients.primary,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : {};

  const truncateStyles = truncate
    ? {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: typeof truncate === 'number' ? truncate : 1,
        WebkitBoxOrient: 'vertical' as const,
      }
    : {};

  return {
    ...baseStyles,
    ...gradientStyles,
    ...truncateStyles,
  };
});

const variantMapping = {
  h1: { muiVariant: 'h1', styles: typography.heading.h1 },
  h2: { muiVariant: 'h2', styles: typography.heading.h2 },
  h3: { muiVariant: 'h3', styles: typography.heading.h3 },
  h4: { muiVariant: 'h4', styles: typography.heading.h4 },
  h5: { muiVariant: 'h5', styles: typography.heading.h5 },
  h6: { muiVariant: 'h6', styles: typography.heading.h6 },
  body: { muiVariant: 'body1', styles: typography.body.regular },
  bodyLarge: { muiVariant: 'body1', styles: typography.body.large },
  bodySmall: { muiVariant: 'body2', styles: typography.body.small },
  caption: { muiVariant: 'caption', styles: { fontSize: typography.fontSize.xs, lineHeight: 1.4 } },
  label: { muiVariant: 'overline', styles: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, textTransform: 'uppercase' as const, letterSpacing: '0.1em' } },
};

const colorMapping = {
  primary: colors.primary[500],
  secondary: colors.secondary[500],
  success: colors.success.main,
  error: colors.error.main,
  warning: colors.warning.main,
  info: colors.info.main,
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textDisabled: colors.text.disabled,
};

const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  gradient = false,
  gradientType = 'primary',
  color,
  truncate,
  sx,
  ...props
}) => {
  const { muiVariant, styles } = variantMapping[variant] || variantMapping.body;
  const textColor = !gradient && color ? colorMapping[color] : undefined;

  return (
    <StyledTypography
      variant={muiVariant as any}
      gradient={gradient}
      gradientType={gradientType}
      truncate={truncate}
      sx={{
        ...styles,
        ...(textColor && { color: textColor }),
        ...sx,
      }}
      {...props}
    />
  );
};

export default Typography;