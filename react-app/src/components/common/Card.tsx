import React from 'react';
import { Card as MuiCard, CardContent, CardProps as MuiCardProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { colors, spacing, borderRadius, transitions, shadows } from '../../styles/design-system';

interface CardProps extends MuiCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  hoverable?: boolean;
  noPadding?: boolean;
}

const StyledCard = styled(MuiCard)<{ variant?: string; hoverable?: boolean }>(({ variant, hoverable }) => {
  const baseStyles = {
    borderRadius: borderRadius.card,
    transition: transitions.preset.smooth,
    position: 'relative' as const,
    overflow: 'hidden',
  };

  const variantStyles = {
    default: {
      background: colors.background.paper,
      boxShadow: shadows.card.default,
      border: 'none',
    },
    elevated: {
      background: colors.background.elevated,
      boxShadow: shadows.elevated,
      border: 'none',
    },
    outlined: {
      background: colors.background.paper,
      boxShadow: 'none',
      border: `1px solid ${colors.grey[300]}`,
    },
    gradient: {
      background: `linear-gradient(135deg, ${colors.primary[50]} 0%, ${colors.secondary[50]} 100%)`,
      boxShadow: shadows.card.default,
      border: 'none',
    },
  };

  const hoverStyles = hoverable
    ? {
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: shadows.card.hover,
        },
        '&:active': {
          transform: 'translateY(-2px)',
          boxShadow: shadows.card.active,
        },
      }
    : {};

  return {
    ...baseStyles,
    ...(variant && variantStyles[variant as keyof typeof variantStyles]),
    ...hoverStyles,
  };
});

const Card: React.FC<CardProps> = ({
  variant = 'default',
  hoverable = false,
  noPadding = false,
  children,
  ...props
}) => {
  return (
    <StyledCard variant={variant} hoverable={hoverable} {...props}>
      {noPadding ? (
        children
      ) : (
        <CardContent
          sx={{
            padding: spacing.layout.cardPadding,
            '&:last-child': {
              paddingBottom: spacing.layout.cardPadding,
            },
          }}
        >
          {children}
        </CardContent>
      )}
    </StyledCard>
  );
};

export default Card;