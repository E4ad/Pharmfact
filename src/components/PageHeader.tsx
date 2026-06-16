import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { componentBorderRadius, borderWidth } from '../design-system/tokens';
import { BackHomeButton } from './BackHomeButton';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
  'data-testid'?: string;
  sx?: SxProps<Theme>;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  backTo = '/activity',
  backLabel = 'Accueil',
  actions,
  children,
  'data-testid': testId,
  sx,
}: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={[
        (theme) => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: componentBorderRadius.card,
          px: { xs: 2.5, md: 4 },
          py: { xs: 2.5, md: 3.5 },
          color: 'common.white',
          background:
            theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #172554 0%, #1e293b 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 24px 70px rgba(0, 0, 0, 0.42)'
            : '0 24px 70px rgba(37, 99, 235, 0.22)',
          '&::after': {
            content: '""',
            position: 'absolute',
            right: { xs: -64, md: -24 },
            top: { xs: -72, md: -58 },
            width: { xs: 190, md: 260 },
            height: { xs: 190, md: 260 },
            borderRadius: componentBorderRadius.full,
            background: 'rgba(255, 255, 255, 0.12)',
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      data-testid={testId}
    >
      <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ position: 'relative', zIndex: 1 }}>
        <BackHomeButton
          to={backTo}
          label={backLabel}
          buttonProps={{
            sx: {
              color: 'inherit',
              bgcolor: 'rgba(255, 255, 255, 0.12)',
              border: `${borderWidth.thin}px solid rgba(255, 255, 255, 0.2)`,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.18)',
              },
            },
          }}
        />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between' }}
        >
          <Stack spacing={1} sx={{ maxWidth: 760 }}>
            <Typography
              variant="overline"
              sx={{
                color: 'rgba(255, 255, 255, 0.78)',
                fontWeight: 800,
                letterSpacing: '0.12em',
              }}
            >
              {eyebrow}
            </Typography>
            <Typography variant="h1" sx={{ color: 'inherit', fontWeight: 850, letterSpacing: '-0.04em' }}>
              {title}
            </Typography>
            {description ? (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.86)', maxWidth: 680 }}>
                {description}
              </Typography>
            ) : null}
          </Stack>
          {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
