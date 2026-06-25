import { alpha, Box, Button, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { brandColors, borderWidth, spacingScale, spacingFractional, borderRadiusScale } from '../design-system/tokens';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

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
  backTo,
  backLabel,
  actions,
  children,
  'data-testid': testId,
  sx,
}: PageHeaderProps) {
  // No back button if backTo is not provided
  const showBackButton = Boolean(backTo);

  return (
    <Box
      component="header"
      sx={[
        (theme) => ({
          position: 'relative',
          overflow: 'hidden',
          borderRadius: borderRadiusScale.xs,
          minHeight: { xs: 128, md: 144 },
          px: { xs: spacingScale.md, md: spacingScale.lg },
          py: { xs: spacingScale.md, md: spacingScale.lg },
          color: 'common.white',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${brandColors.primary[950]} 0%, #334155 100%)`
              : `linear-gradient(135deg, ${brandColors.primary[600]} 0%, ${brandColors.primary[800]} 100%)`,
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
          {showBackButton && backTo && backLabel ? (
            <Button
              aria-label={backLabel}
              component={RouterLink}
              to={backTo}
              size="small"
              startIcon={<ArrowBackRoundedIcon fontSize="small" />}
              data-testid={testId ? `${testId}-back-home` : undefined}
              sx={(theme) => ({
                alignSelf: 'flex-start',
                height: 32,
                minWidth: 0,
                px: 1.2,
                color: 'common.white',
                bgcolor: alpha(theme.palette.common.white, 0.12),
                border: `${borderWidth.thin}px solid ${alpha(theme.palette.common.white, 0.2)}`,
                borderRadius: borderRadiusScale.xs,
                fontWeight: 800,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.18),
                },
              })}
            >
              {backLabel}
            </Button>
          ) : null}
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
