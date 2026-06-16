import { CardActionArea, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { componentBorderRadius, iconSize, cardActionHeight, spacingScale } from '../design-system/tokens';
import { SurfaceCard } from './SurfaceCard';

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  'data-testid'?: string;
};

export function ActionCard({ title, description, icon, onClick, 'data-testid': testId }: Props) {
  return (
    <SurfaceCard data-testid={testId} flush>
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: { xs: spacingScale.md, md: spacingScale.lg } }}>
        <Stack spacing={spacingScale.md} sx={{ minHeight: cardActionHeight.lg, justifyContent: 'space-between' }}>
          <Stack spacing={spacingScale.sm}>
            <Stack
              sx={{
                width: iconSize.xl,
                height: iconSize.xl,
                borderRadius: componentBorderRadius.sm,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                alignItems: 'center',
                justifyContent: 'center',
                // No border - visual hierarchy through bgcolor only
              }}
            >
              {icon}
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 750 }}>{title}</Typography>
          </Stack>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
      </CardActionArea>
    </SurfaceCard>
  );
}
