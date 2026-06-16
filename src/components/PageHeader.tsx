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
          px: { xs: spacingFractional['2.5'], md: spacingScale.md },
          py: { xs: spacingFractional['2.5'], md: spacingFractional['3.5'] },
          color: 'common.white',
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${brandColors.primary[950]} 0%, ${neutralColors.slate[800]} 100%)`
              : `linear-gradient(135deg, ${brandColors.primary[600]} 0%, ${brandColors.primary[800]} 100%)`,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 24px 70px ${theme.palette.common.black}42`
            : `0 24px 70px ${alpha(theme.palette.primary.main, 0.22)}`,
          '&::after': {
            content: '""',
            position: 'absolute',
            right: { xs: -64, md: -24 },
            top: { xs: -72, md: -58 },
            width: { xs: 190, md: 260 },
            height: { xs: 190, md: 260 },
            borderRadius: componentBorderRadius.full,
            background: alpha(theme.palette.common.white, 0.12),
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
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between' }}
        >
          <Stack spacing={1} sx={{ maxWidth: 760 }}>
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
            <Typography variant="h1" sx={{ color: 'inherit', fontWeight: 850, letterSpacing: '-0.04em' }}>
              {title}
            </Typography>
            {description ? (
              <Typography sx={(theme) => ({ color: alpha(theme.palette.common.white, 0.86), maxWidth: 680 })}>
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
