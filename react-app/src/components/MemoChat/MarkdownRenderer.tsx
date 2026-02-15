import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Typography, Link, Box } from '@mui/material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';

interface MarkdownRendererProps {
  content: string;
  sources?: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, sources }) => {
  // URLパターンの検出と抽出
  const extractUrls = (text: string): string[] => {
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    return text.match(urlPattern) || [];
  };

  // 出典番号を抽出（[1], [2]などの形式）
  const extractCitations = (text: string): string[] => {
    const citationPattern = /\[(\d+)\]/g;
    const matches = text.match(citationPattern) || [];
    return matches.map(m => m.replace(/[\[\]]/g, ''));
  };

  // カスタムレンダラー
  const components = {
    // リンクのカスタムレンダリング
    a: ({ href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http');
      
      return (
        <Link
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          sx={{
            color: '#FF8C5A',
            textDecoration: 'none',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            borderBottom: '1px solid transparent',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderBottomColor: '#FF8C5A',
              backgroundColor: 'rgba(255, 140, 90, 0.05)',
              borderRadius: '4px',
              px: 0.5,
              mx: -0.5,
            }
          }}
          {...props}
        >
          {children}
          {isExternal && (
            <OpenInNewIcon 
              sx={{ 
                fontSize: 14, 
                color: '#9E9891',
                transition: 'color 0.2s ease',
                '.MuiLink-root:hover &': {
                  color: '#FF8C5A'
                }
              }} 
            />
          )}
        </Link>
      );
    },
    
    // パラグラフのカスタムレンダリング
    p: ({ children, ...props }: any) => {
      // テキスト内のURLを自動的にリンク化
      const processChildren = (child: any): any => {
        if (typeof child === 'string') {
          // URLパターンでテキストを分割
          const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
          const parts = child.split(urlPattern);
          const matches = child.match(urlPattern);
          
          if (!matches) return child;
          
          const result = [];
          parts.forEach((part: string, index: number) => {
            if (part) result.push(part);
            if (matches[index]) {
              result.push(
                <Link
                  key={`link-${index}`}
                  href={matches[index]}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#FF8C5A',
                    textDecoration: 'none',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {matches[index].length > 50 
                    ? matches[index].substring(0, 50) + '...' 
                    : matches[index]}
                  <OpenInNewIcon sx={{ fontSize: 12 }} />
                </Link>
              );
            }
          });
          return result;
        }
        return child;
      };
      
      // childrenが配列の場合と単一要素の場合を処理
      const processedChildren = React.Children.map(children, processChildren);
      
      return (
        <Typography 
          variant="body1" 
          paragraph 
          sx={{ 
            mb: 1.5,
            lineHeight: 1.7,
            color: '#2D2A26'
          }}
          {...props}
        >
          {processedChildren}
        </Typography>
      );
    },
    
    // コードブロックのカスタムレンダリング
    code: ({ inline, className, children, ...props }: any) => {
      if (!inline) {
        return (
          <Box
            component="pre"
            sx={{
              backgroundColor: 'rgba(240, 232, 216, 0.3)',
              borderRadius: '8px',
              p: 2,
              overflow: 'auto',
              fontSize: '13px',
              fontFamily: 'Monaco, Consolas, monospace',
              border: '1px solid rgba(240, 232, 216, 0.5)',
              my: 2,
            }}
          >
            <code className={className} {...props}>
              {children}
            </code>
          </Box>
        );
      }
      
      return (
        <Box
          component="code"
          sx={{
            backgroundColor: 'rgba(255, 140, 90, 0.1)',
            color: '#D2691E',
            px: 0.5,
            py: 0.25,
            borderRadius: '4px',
            fontSize: '0.9em',
            fontFamily: 'Monaco, Consolas, monospace',
          }}
          {...props}
        >
          {children}
        </Box>
      );
    },
    
    // リストのカスタムレンダリング
    ul: ({ children, ...props }: any) => (
      <Box
        component="ul"
        sx={{
          pl: 3,
          mb: 1.5,
          '& li': {
            mb: 0.5,
            color: '#2D2A26',
            '&::marker': {
              color: '#FF8C5A'
            }
          }
        }}
        {...props}
      >
        {children}
      </Box>
    ),
    
    ol: ({ children, ...props }: any) => (
      <Box
        component="ol"
        sx={{
          pl: 3,
          mb: 1.5,
          '& li': {
            mb: 0.5,
            color: '#2D2A26',
            '&::marker': {
              color: '#FF8C5A',
              fontWeight: 600
            }
          }
        }}
        {...props}
      >
        {children}
      </Box>
    ),
    
    // 引用のカスタムレンダリング
    blockquote: ({ children, ...props }: any) => (
      <Box
        sx={{
          borderLeft: '4px solid #FF8C5A',
          pl: 2,
          ml: 0,
          my: 2,
          py: 0.5,
          backgroundColor: 'rgba(255, 140, 90, 0.05)',
          borderRadius: '0 8px 8px 0',
          fontStyle: 'italic',
          color: '#6B6560'
        }}
        {...props}
      >
        {children}
      </Box>
    ),
    
    // 見出しのカスタムレンダリング
    h1: ({ children, ...props }: any) => (
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2D2A26', mt: 2, mb: 1 }} {...props}>
        {children}
      </Typography>
    ),
    h2: ({ children, ...props }: any) => (
      <Typography variant="h6" sx={{ fontWeight: 600, color: '#2D2A26', mt: 1.5, mb: 0.75 }} {...props}>
        {children}
      </Typography>
    ),
    h3: ({ children, ...props }: any) => (
      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2D2A26', mt: 1, mb: 0.5 }} {...props}>
        {children}
      </Typography>
    ),
  };

  return (
    <Box sx={{ '& > *:first-of-type': { mt: 0 }, '& > *:last-child': { mb: 0 } }}>
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer;