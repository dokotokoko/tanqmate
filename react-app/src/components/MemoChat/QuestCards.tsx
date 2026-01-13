import React from 'react';
import { Box, Button } from '@mui/material';
import { motion } from 'framer-motion';

interface QuestCard {
  id: string;
  label: string;
  emoji: string;
  color: 'teal' | 'yellow' | 'purple' | 'pink' | 'green';
}

interface QuestCardsProps {
  cards: QuestCard[];
  onCardClick: (cardId: string, cardLabel: string) => void;
}

const colorStyles = {
  teal: {
    background: '#E8F6F5',
    color: '#1A8A82',
    hoverBackground: '#D4F0EE',
    hoverShadow: '0 6px 16px rgba(91, 191, 186, 0.25)',
  },
  yellow: {
    background: '#FFF9E6',
    color: '#B8860B',
    hoverBackground: '#FFF3CC',
    hoverShadow: '0 6px 16px rgba(255, 209, 102, 0.3)',
  },
  purple: {
    background: '#F3EEFF',
    color: '#7C3AED',
    hoverBackground: '#EDE4FF',
    hoverShadow: '0 6px 16px rgba(167, 139, 250, 0.25)',
  },
  pink: {
    background: '#FDF2F8',
    color: '#DB2777',
    hoverBackground: '#FCE7F3',
    hoverShadow: '0 6px 16px rgba(244, 114, 182, 0.25)',
  },
  green: {
    background: '#EEFBF0',
    color: '#15803D',
    hoverBackground: '#DCFCE7',
    hoverShadow: '0 6px 16px rgba(107, 203, 119, 0.25)',
  },
};

const QuestCards: React.FC<QuestCardsProps> = ({ cards, onCardClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        marginTop: '16px',
      }}
    >
      {cards.map((card, index) => {
        const style = colorStyles[card.color];
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.1,
              duration: 0.3,
              ease: 'easeOut'
            }}
          >
            <Button
              onClick={() => onCardClick(card.id, card.label)}
              sx={{
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: 'none',
                background: style.background,
                color: style.color,
                textTransform: 'none',
                minWidth: 'auto',
                '&:hover': {
                  background: style.hoverBackground,
                  boxShadow: style.hoverShadow,
                  transform: 'translateY(-2px) scale(1.02)',
                },
                '&:focus': {
                  outline: 'none',
                  transform: 'translateY(-2px) scale(1.02)',
                },
                '&:active': {
                  transform: 'translateY(0) scale(0.98)',
                },
              }}
            >
              <span style={{ fontSize: '14px' }}>{card.emoji}</span>
              {card.label}
            </Button>
          </motion.div>
        );
      })}
    </Box>
  );
};

export default QuestCards;