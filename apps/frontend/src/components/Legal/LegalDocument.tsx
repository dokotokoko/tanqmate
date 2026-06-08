import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Link as RouterLink } from 'react-router-dom';
import { colors } from '../../styles/design-system';

interface LegalDocumentProps {
  title: string;
  content: string;
}

const LegalDocument: React.FC<LegalDocumentProps> = ({ title, content }) => {
  return (
    <Box sx={{ bgcolor: colors.background.default, minHeight: '100vh', py: { xs: 5, md: 8 } }}>
      <Container maxWidth="md">
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBack />}
          sx={{ mb: 3, color: colors.text.secondary, fontWeight: 700 }}
        >
          トップへ戻る
        </Button>

        <Typography
          component="h1"
          sx={{ fontSize: { xs: 28, md: 38 }, fontWeight: 900, color: colors.text.primary, mb: 4 }}
        >
          {title}
        </Typography>

        <Box
          sx={{
            bgcolor: colors.background.paper,
            border: `1px solid ${colors.border.soft}`,
            borderRadius: 3,
            p: { xs: 3, md: 5 },
            color: colors.text.primary,
            lineHeight: 1.9,
            fontSize: 16,
            '& h1': { fontSize: { xs: 24, md: 30 }, fontWeight: 800, mt: 4, mb: 2 },
            '& h2': { fontSize: { xs: 20, md: 24 }, fontWeight: 800, mt: 4, mb: 1.5 },
            '& h3': { fontSize: { xs: 17, md: 19 }, fontWeight: 700, mt: 3, mb: 1 },
            '& h1:first-of-type': { mt: 0 },
            '& p': { my: 1.5, color: colors.text.secondary, lineHeight: 1.9 },
            '& ul, & ol': { pl: 3, my: 1.5, color: colors.text.secondary },
            '& li': { my: 0.75, lineHeight: 1.85 },
            '& a': { color: colors.accentWarm.active, fontWeight: 600 },
            '& hr': { border: 'none', borderTop: `1px solid ${colors.border.soft}`, my: 3 },
            '& strong': { color: colors.text.primary, fontWeight: 700 },
            '& table': { borderCollapse: 'collapse', width: '100%', my: 2 },
            '& th, & td': { border: `1px solid ${colors.border.soft}`, p: 1.25, textAlign: 'left' },
          }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </Box>
      </Container>
    </Box>
  );
};

export default LegalDocument;
