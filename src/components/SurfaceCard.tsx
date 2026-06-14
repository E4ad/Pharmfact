import { Card, CardContent, type CardProps, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

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
        {
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        },
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
