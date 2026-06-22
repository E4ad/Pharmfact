import React from 'react';
import { Card, CardContent, type CardProps, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { spacingScale, componentBorderRadius } from '../design-system/tokens';

type SurfaceRadius = 'card' | 'dashboardCard' | 'settingsCard' | 'hero';

// Map SurfaceRadius to actual border radius values
const surfaceRadiusMap: Record<SurfaceRadius, number> = {
  card: componentBorderRadius.card,
  dashboardCard: componentBorderRadius.dashboardCard,
  settingsCard: componentBorderRadius.settingsCard,
  hero: componentBorderRadius.hero,
};

type SurfaceCardProps = Omit<CardProps, 'children'> & {
  children: ReactNode;
  contentSx?: SxProps<Theme>;
  flush?: boolean;
  radius?: SurfaceRadius;
};

export function SurfaceCard({ children, contentSx, flush = false, radius = 'card', sx, ...props }: SurfaceCardProps) {
  // Use the radius prop to select the appropriate border radius
  const surfaceRadius = surfaceRadiusMap[radius];
  const clickable = Boolean(props.onClick);

  return (
    <Card
      elevation={0}
      sx={[
        (theme) => ({
          border: `${theme.runtimeTokens.borderWidth}px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'}`,
          borderRadius: surfaceRadius,
          bgcolor: 'background.paper',
          boxShadow: theme.runtimeTokens.shadows.card[theme.palette.mode === 'dark' ? 'dark' : 'light'],
          overflow: 'hidden',
          transition: `box-shadow ${theme.transitions.duration.standard}, transform ${theme.transitions.duration.standard}`,
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
          },
          ...(clickable
            ? {
                '&:hover': {
                  boxShadow: theme.runtimeTokens.shadows.card[theme.palette.mode === 'dark' ? 'elevatedDark' : 'elevatedLight'],
                  transform: 'translateY(-2px)',
                  '@media (prefers-reduced-motion: reduce)': {
                    transform: 'none',
                  },
                },
                '&:active': {
                  transform: 'translateY(0)',
                  '@media (prefers-reduced-motion: reduce)': {
                    transform: 'none',
                  },
                },
              }
            : {}),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      <CardContent
        sx={{
          p: flush ? 0 : { xs: spacingScale.md, md: spacingScale.lg },
          '&:last-child': { pb: flush ? 0 : { xs: spacingScale.md, md: spacingScale.lg } },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
}
