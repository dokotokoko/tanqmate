import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { colors } from '../../styles/design-system';

interface AuthMigrationNoticeProps {
  showAction?: boolean;
}

const shouldShowNotice = import.meta.env.VITE_SHOW_AUTH_MIGRATION_NOTICE !== 'false';

const AuthMigrationNotice: React.FC<AuthMigrationNoticeProps> = ({ showAction = true }) => {
  if (!shouldShowNotice) {
    return null;
  }

  return (
    <Box
      role="note"
      aria-label="認証方法の変更のお知らせ"
      sx={{
        mb: 2.25,
        p: 2,
        borderRadius: '18px',
        border: `1px solid ${colors.trustBlue.main}`,
        backgroundColor: colors.trustBlue.soft,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <InfoOutlined sx={{ color: colors.trustBlue.strong, mt: 0.25 }} />
        <Box>
          <Typography sx={{ color: colors.text.primary, fontWeight: 800, mb: 0.5 }}>
            再登録をお願いします
          </Typography>
          <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.75 }}>
            セキュリティ向上とプライバシーポリシー整備のため、昨年度から認証方法を変更しました。以前使っていた方も、改めて新規登録が必要です。
          </Typography>
          {showAction && (
            <Button
              component={RouterLink}
              to="/signup"
              variant="contained"
              size="small"
              disableElevation
              sx={{
                mt: 1.5,
                backgroundColor: colors.trustBlue.main,
                color: colors.trustBlue.contrastText,
                fontWeight: 700,
                '&:hover': {
                  backgroundColor: colors.trustBlue.hover,
                },
              }}
            >
              新しく登録する
            </Button>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default AuthMigrationNotice;
