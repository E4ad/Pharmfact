import { Box, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { spacingFractional } from '../design-system/tokens';

type PageSectionProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
  spacing?: keyof typeof spacingFractional | number;
  titleVariant?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  sx?: SxProps<Theme>;
};

export function PageSection({ title, description, eyebrow, actions, children, spacing = '2.5', titleVariant, sx }: PageSectionProps) {
  const isCompactTitle = titleVariant === 'h4' || titleVariant === 'h5' || titleVariant === 'h6';
  return (
    <Stack component="section" spacing={spacingFractional[spacing as keyof typeof spacingFractional] || spacing} sx={sx}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={spacingFractional['1.5']}
        sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between' }}
      >
        <Stack spacing={spacingFractional['0.5']} sx={{ minWidth: 0 }}>
          {eyebrow ? (
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
              {eyebrow}
            </Typography>
          ) : null}
          <Typography variant={titleVariant ?? 'h2'} sx={{ letterSpacing: isCompactTitle ? '-0.02em' : '-0.03em' }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant={isCompactTitle ? 'body2' : undefined} color="text.secondary" sx={{ maxWidth: 720 }}>
              {description}
            </Typography>
          ) : null}
        </Stack>
        {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
      </Stack>
      {children}
    </Stack>
  );
}
