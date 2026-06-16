import { Card, CardContent, type CardProps, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { componentBorderRadius, componentShadows, borderWidth } from '../design-system/tokens';

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
          border: `${borderWidth.thin}px solid`,
          borderColor: theme.palette.divider,
          borderRadius: componentBorderRadius.card,
          bgcolor: 'background.paper',
          boxShadow: theme.palette.mode === 'dark' ? componentShadows.card.dark : componentShadows.card.light,
          overflow: 'hidden',
          transition: `box-shadow ${theme.transitions.duration.normal}`,
          '&:hover': {
            boxShadow: theme.palette.mode === 'dark' ? componentShadows.card.elevatedDark : componentShadows.card.elevatedLight,
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      <CardContent
        sx={{
          p: flush ? 0 : { xs: 2, md: 3 },
          '&:last-child': { pb: flush ? 0 : { xs: 2, md: 3 } },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
}
