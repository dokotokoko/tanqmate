import React from 'react';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { borderRadius, colors, shadows } from '../../styles/design-system';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  sideContent?: React.ReactNode;
  panelMaxWidth?: number | string | Record<string, number | string>;
  panelMinHeight?: number | string | Record<string, number | string>;
  panelSx?: SxProps<Theme>;
}

const AuthShell: React.FC<AuthShellProps> = ({
  title,
  subtitle,
  children,
  sideContent,
  panelMaxWidth = 448,
  panelMinHeight = { xs: 'auto', md: 680 },
  panelSx,
}) => {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.background.default,
        backgroundImage:
          'linear-gradient(180deg, rgba(255, 253, 247, 0.78) 0%, rgba(255, 246, 232, 0.66) 100%)',
        py: { xs: 2, md: 5 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 5 }}
          alignItems="center"
          justifyContent="center"
          sx={{ minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' } }}
        >
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              maxWidth: panelMaxWidth,
              minHeight: panelMinHeight,
              p: { xs: 2.5, sm: 3.25 },
              borderRadius: { xs: borderRadius.xl, md: '28px' },
              border: `1px solid ${colors.border.soft}`,
              backgroundColor: colors.background.paper,
              boxShadow: shadows.md,
              ...panelSx,
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 2.5 }}>
              <Typography component="p" variant="body2" sx={{ color: colors.accentWarm.active, fontWeight: 700 }}>
                探Qメイト
              </Typography>
              <Typography component="h1" variant="h4" sx={{ mt: 0.75, color: colors.text.primary, fontWeight: 800 }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: colors.text.secondary, lineHeight: 1.7 }}>
                {subtitle}
              </Typography>
            </Box>
            {children}
          </Paper>

          {sideContent && (
            <Box sx={{ width: '100%', maxWidth: { xs: 448, md: 360 } }}>
              {sideContent}
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default AuthShell;
