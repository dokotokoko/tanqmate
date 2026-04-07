import React from 'react';
import { 
  Card, 
  CardActionArea,
  CardContent, 
  Typography, 
  Box,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  OpenInNew as OpenInNewIcon,
  Language as LanguageIcon,
  Article as ArticleIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';

export interface WebSource {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
  favicon?: string;
  thumbnail?: string;
}

interface SourceCardProps {
  source: WebSource;
  index: number;
}

// URLからドメイン名を抽出
const extractDomain = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'unknown';
  }
};

// ファビコンURLを取得
const getFaviconUrl = (url: string): string => {
  try {
    const domain = new URL(url).origin;
    return `${domain}/favicon.ico`;
  } catch {
    return '';
  }
};

const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  const domain = source.domain || extractDomain(source.url);
  const faviconUrl = source.favicon || getFaviconUrl(source.url);
  
  const handleClick = () => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <Card
        sx={{
          mb: 0.75,
          borderRadius: '8px',
          border: '1px solid rgba(255, 140, 90, 0.15)',
          backgroundColor: '#FFFBF5',
          boxShadow: '0 1px 3px rgba(255, 140, 90, 0.05)',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          '&:hover': {
            backgroundColor: '#FFF6E8',
            borderColor: 'rgba(255, 140, 90, 0.3)',
            transform: 'translateX(4px)',
          }
        }}
      >
        <CardActionArea 
          onClick={handleClick}
          sx={{
            padding: 0,
            height: '100%',
            '& .MuiCardActionArea-focusHighlight': {
              opacity: 0.03,
            }
          }}
        >
          <CardContent sx={{ 
            p: '10px 12px',
            '&:last-child': { pb: '10px' }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              minHeight: 0
            }}>
              {/* ファビコン/アイコン */}
              <Box sx={{ 
                flexShrink: 0,
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 140, 90, 0.08)',
                overflow: 'hidden',
              }}>
                {faviconUrl ? (
                  <img 
                    src={faviconUrl}
                    alt={domain}
                    style={{
                      width: 16,
                      height: 16,
                      objectFit: 'contain'
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#FF8C5A"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
                    }}
                  />
                ) : (
                  <LanguageIcon sx={{ color: '#FF8C5A', fontSize: 16 }} />
                )}
              </Box>

              {/* タイトル */}
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontWeight: 500,
                  color: '#2D2A26',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                {source.title || 'No title'}
              </Typography>

              {/* URL/ドメイン */}
              <Typography
                variant="caption"
                sx={{
                  color: '#9E9891',
                  fontSize: '11px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {domain}
                <OpenInNewIcon sx={{ fontSize: 12, color: '#9E9891' }} />
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </motion.div>
  );
};

// 複数のソースカードを表示するコンテナ
export const SourceCardList: React.FC<{ sources: WebSource[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <Box sx={{ 
      mt: 1.5,
      pt: 1.5,
      borderTop: '1px solid rgba(240, 232, 216, 0.5)'
    }}>
      <Typography
        variant="caption"
        sx={{
          color: '#9E9891',
          fontSize: '11px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 0.75,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        <Box component="span" sx={{ fontSize: '12px' }}>📚</Box>
        参考資料
      </Typography>
      {sources.map((source, index) => (
        <SourceCard key={`${source.url}-${index}`} source={source} index={index} />
      ))}
    </Box>
  );
};

export default SourceCard;