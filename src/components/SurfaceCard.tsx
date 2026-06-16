import { Card, CardContent, type CardProps, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { componentBorderRadius, componentShadows, spacingScale } from '../design-system/tokens';

type SurfaceCardProps = Omit<CardProps, 'children'> & {
  children: ReactNode;
  contentSx?: SxProps<Theme>;
  flush?: boolean;
};

export function SurfaceCard({ children, contentSx, flush = false, sx, ...props }: SurfaceCardProps) {
  return (
    <Card
      elevation={0}
      sx={[
        (theme) => ({
          border: 'none',
          borderRadius: componentBorderRadius.card,
          bgcolor: 'background.paper',
          boxShadow: theme.palette.mode === 'dark' ? componentShadows.card.dark : componentShadows.card.light,
          overflow: 'hidden',
          transition: `box-shadow ${theme.transitions.duration.normal}, transform ${theme.transitions.duration.normal}`,
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark' ? componentShadows.card.elevatedDark : componentShadows.card.elevatedLight,
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
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
