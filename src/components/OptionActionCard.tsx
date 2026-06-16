import { CardActionArea, Stack, Typography, Box, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { componentBorderRadius, iconSize, cardActionHeight, spacingFractional, spacingScale, typographyScale } from '../design-system/tokens';
import { SurfaceCard } from './SurfaceCard';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface OptionActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone?: IconTone;
  onClick: () => void;
  'data-testid'?: string;
}

const toneStyles: Record<IconTone, SxProps<Theme>> = {
  green: (theme) => ({
    bgcolor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
    borderColor: alpha(theme.palette.success.main, 0.18),
  }),
  blue: (theme) => ({
    bgcolor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    borderColor: alpha(theme.palette.primary.main, 0.18),
  }),
  amber: (theme) => ({
    bgcolor: alpha(theme.palette.warning.main, 0.12),
    color: theme.palette.warning.main,
    borderColor: alpha(theme.palette.warning.main, 0.2),
  }),
  purple: (theme) => ({
    bgcolor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.main,
    borderColor: alpha(theme.palette.info.main, 0.18),
  }),
  red: (theme) => ({
    bgcolor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
    borderColor: alpha(theme.palette.error.main, 0.18),
  }),
  gray: (theme) => ({
    bgcolor: alpha(theme.palette.text.secondary, 0.08),
    color: theme.palette.text.secondary,
    borderColor: alpha(theme.palette.text.secondary, 0.16),
  }),
};

export function OptionActionCard({
  title,
  description,
  icon,
  iconTone = 'blue',
  onClick,
  'data-testid': testId,
}: OptionActionCardProps) {
  return (
    <SurfaceCard data-testid={testId} flush>
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: spacingScale.sm }}>
        <Stack direction="row" spacing={spacingFractional['1.75']} sx={{ alignItems: 'flex-start', minHeight: cardActionHeight.sm }}>
          <Box sx={{ pt: spacingFractional['0.25'] }}>
            <Box
              aria-hidden="true"
              sx={{
                width: iconSize.md,
                height: iconSize.md,
                borderRadius: componentBorderRadius.sm,
                // No border - visual hierarchy through bgcolor only
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& svg': { fontSize: typographyScale.base },
                ...toneStyles[iconTone],
              }}
            >
              {icon}
            </Box>
          </Box>
          <Stack spacing={spacingFractional['0.5']} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 750, lineHeight: 1.25 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </SurfaceCard>
  );
}
