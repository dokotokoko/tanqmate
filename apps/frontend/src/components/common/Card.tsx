import React from 'react';
import { Card as MuiCard, CardContent, CardProps as MuiCardProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { borderRadius, colors, shadows, spacing, transitions } from '../../styles/design-system';

interface CardProps extends MuiCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'tinted' | 'interactive' | 'gradient';
  hoverable?: boolean;
  noPadding?: boolean;
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'cardvariant' && prop !== 'hoverable',
})<{ cardvariant?: string; hoverable?: boolean }>(({ cardvariant = 'default', hoverable }) => {
  const normalizedVariant = cardvariant === 'gradient' ? 'tinted' : cardvariant;

  const baseStyles = {
    borderRadius: borderRadius.card,
    transition: transitions.preset.smooth,
    position: 'relative' as const,
    overflow: 'hidden',
    backgroundImage: 'none',
  };

  const variantStyles = {
    default: {
      background: colors.background.paper,
      boxShadow: shadows.card.default,
      border: `1px solid ${colors.border.soft}`,
    },
    elevated: {
      background: colors.background.elevated,
      boxShadow: shadows.md,
      border: `1px solid ${colors.border.soft}`,
    },
    outlined: {
      background: colors.background.paper,
      boxShadow: 'none',
      border: `1px solid ${colors.border.soft}`,
    },
    tinted: {
      background: colors.background.subtle,
      boxShadow: shadows.sm,
      border: `1px solid ${colors.border.warm}`,
    },
    interactive: {
      background: colors.background.paper,
      boxShadow: shadows.card.default,
      border: `1px solid ${colors.border.soft}`,
    },
  };

  const hoverStyles = hoverable || normalizedVariant === 'interactive'
    ? {
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: shadows.card.hover,
          borderColor: colors.border.warm,
        },
        '&:active': {
          transform: 'translateY(0)',
          boxShadow: shadows.card.active,
        },
      }
    : {};

  return {
    ...baseStyles,
    ...variantStyles[normalizedVariant as keyof typeof variantStyles],
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
    <StyledCard cardvariant={variant} hoverable={hoverable} {...props}>
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
