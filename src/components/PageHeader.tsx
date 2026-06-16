import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { brandColors, neutralColors, componentBorderRadius, borderRadiusScale, borderWidth, spacingScale, spacingFractional, homePageTokens } from '../design-system/tokens';
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
          borderRadius: borderRadiusScale.xl,
          height: { xs: homePageTokens.heroHeight.mobile, md: homePageTokens.heroHeight.desktop },
          px: { xs: spacingScale.md, md: spacingScale.lg },
          py: spacingScale.md,
          color: 'common.white',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${brandColors.primary[950]} 0%, ${neutralColors.slate[800]} 100%)`
              : `linear-gradient(135deg, ${brandColors.primary[600]} 0%, ${brandColors.primary[800]} 100%)`,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 16px 48px rgba(0, 0, 0, 0.4)`
            : `0 16px 48px rgba(37, 99, 235, 0.22)`,
          // Subtle decoration - small circle in top-right corner
          '&::after': {
            content: '""',
            position: 'absolute',
            right: { xs: spacingScale.md, md: spacingScale.lg },
            top: { xs: spacingScale.md, md: spacingScale.lg },
            width: { xs: 64, md: 80 },
            height: { xs: 64, md: 80 },
            borderRadius: borderRadiusScale.full,
            background: alpha(theme.palette.common.white, 0.12),
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      data-testid={testId}
    >
      <Stack spacing={spacingScale.sm} sx={{ position: 'relative', zIndex: 1, height: '100%', justifyContent: 'center' }}>
        <Stack spacing={spacingScale.md} sx={{ alignItems: 'flex-start' }}>
          <BackHomeButton
            to={backTo}
            label={backLabel}
            buttonProps={{
              sx: (theme) => ({
                color: 'inherit',
                bgcolor: alpha(theme.palette.common.white, 0.12),
                border: `${borderWidth.thin}px solid ${alpha(theme.palette.common.white, 0.2)}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.common.white, 0.18),
                },
              }),
            }}
          />
          <Stack spacing={spacingFractional['0.5']} sx={{ maxWidth: 760 }}>
            <Typography
              variant="overline"
              sx={(theme) => ({
                color: alpha(theme.palette.common.white, 0.78),
                fontWeight: 800,
                letterSpacing: '0.12em',
              })}
            >
              {eyebrow}
            </Typography>
            <Typography 
              variant="h1" 
              sx={{ 
                color: 'inherit', 
                fontWeight: 850, 
                letterSpacing: '-0.04em',
                fontSize: { xs: '1.75rem', md: '2.25rem' },
              }}
            >
              {title}
            </Typography>
            {description ? (
              <Typography 
                variant="body1"
                sx={(theme) => ({
                  color: alpha(theme.palette.common.white, 0.86), 
                  maxWidth: 680,
                  fontSize: { xs: '0.875rem', md: '1rem' },
                })}
              >
                {description}
              </Typography>
            ) : null}
          </Stack>
          {actions ? (
            <Box sx={{ 
              flexShrink: 0, 
              mt: spacingScale.sm,
              display: 'flex',
              gap: spacingScale.sm,
            }}>
              {actions}
            </Box>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
