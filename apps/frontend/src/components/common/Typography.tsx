import React from 'react';
import { Typography as MuiTypography, TypographyProps as MuiTypographyProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, typography } from '../../styles/design-system';

interface TypographyProps extends Omit<MuiTypographyProps, 'variant'> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label';
  gradient?: boolean;
  gradientType?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'textPrimary' | 'textSecondary' | 'textDisabled' | 'textMuted';
  truncate?: boolean | number;
}

const StyledTypography = styled(MuiTypography, {
  shouldForwardProp: (prop) => prop !== 'truncate',
})<{ truncate?: boolean | number }>(({ truncate }) => ({
  fontFamily: typography.fontFamily.primary,
  ...(truncate
    ? {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: typeof truncate === 'number' ? truncate : 1,
        WebkitBoxOrient: 'vertical' as const,
      }
    : {}),
}));

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
  caption: { muiVariant: 'caption', styles: typography.body.caption },
  label: {
    muiVariant: 'overline',
    styles: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'uppercase' as const,
      color: colors.text.secondary,
    },
  },
};

const colorMapping = {
  primary: colors.accentWarm.main,
  secondary: colors.trustBlue.main,
  success: colors.success.main,
  error: colors.error.main,
  warning: colors.warning.main,
  info: colors.info.main,
  textPrimary: colors.text.primary,
  textSecondary: colors.text.secondary,
  textDisabled: colors.text.disabled,
  textMuted: colors.text.muted,
};

const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  gradient = false,
  color,
  truncate,
  sx,
  ...props
}) => {
  const { muiVariant, styles } = variantMapping[variant] || variantMapping.body;
  const textColor = gradient ? colors.text.primary : color ? colorMapping[color] : undefined;

  return (
    <StyledTypography
      variant={muiVariant as any}
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
