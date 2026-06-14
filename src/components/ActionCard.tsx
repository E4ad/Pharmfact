import { CardActionArea, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
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
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: { xs: 3, md: 4 } }}>
        <Stack spacing={3} sx={{ minHeight: 180, justifyContent: 'space-between' }}>
          <Stack spacing={2}>
            <Stack
              sx={{
                width: 54,
                height: 54,
                borderRadius: 3,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
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
