import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { brandColors, neutralColors, componentBorderRadius, borderWidth, spacingScale, spacingFractional } from '../design-system/tokens';
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
          minHeight: { xs: 128, md: 144 },
          px: { xs: spacingScale.md, md: spacingScale.lg },
          py: { xs: spacingScale.md, md: spacingScale.lg },
          color: 'common.white',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${brandColors.primary[950]} 0%, ${neutralColors.slate[800]} 100%)`
              : `linear-gradient(135deg, ${brandColors.primary[600]} 0%, ${brandColors.primary[800]} 100%)`,
          boxShadow: theme.runtimeTokens.shadows.pageHeader[theme.palette.mode === 'dark' ? 'dark' : 'light'],
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 45%)',
            pointerEvents: 'none',
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      data-testid={testId}
    >
      <Stack spacing={spacingScale.md} sx={{ position: 'relative', zIndex: 1, minHeight: '100%', justifyContent: 'space-between' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={spacingScale.sm}
          sx={{
            width: '100%',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <BackHomeButton
            to={backTo}
            label={backLabel}
            data-testid={testId ? `${testId}-back-home` : undefined}
              buttonProps={{
                size: 'small',
                sx: (theme) => ({
                  color: 'inherit',
                  bgcolor: alpha(theme.palette.common.white, 0.12),
                  border: `${borderWidth.thin}px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  borderRadius: theme.runtimeTokens.controlRadius,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.18),
                  },
                }),
              }}
          />
          {actions ? (
            <Box sx={{
              flexShrink: 0,
              display: 'flex',
              gap: spacingScale.sm,
              maxWidth: '100%',
            }}>
              {actions}
            </Box>
          ) : null}
        </Stack>
        <Stack spacing={spacingScale.md} sx={{ alignItems: 'flex-start' }}>
          <Stack spacing={spacingFractional['0.5']} sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={(theme) => ({ color: alpha(theme.palette.common.white, 0.78), fontWeight: 800, letterSpacing: '0.12em' })}>
              {eyebrow}
            </Typography>
            <Typography variant="h1" sx={{ color: 'inherit', fontWeight: 850, letterSpacing: '-0.04em', fontSize: { xs: '1.6rem', md: '2rem' } }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body1" sx={(theme) => ({ color: alpha(theme.palette.common.white, 0.86), maxWidth: 680, fontSize: { xs: '0.875rem', md: '0.98rem' } })}>
                {description}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
