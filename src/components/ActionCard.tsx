import { Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
};

export function ActionCard({ title, description, icon, onClick }: Props) {
  return (
    <Card>
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: { xs: 3, md: 4 } }}>
        <Stack spacing={3} sx={{ minHeight: 180, justifyContent: 'space-between' }}>
          <Stack spacing={2}>
            <Stack
              sx={{ width: 54, height: 54, borderRadius: 4, bgcolor: 'grey.100', color: 'text.primary', alignItems: 'center', justifyContent: 'center' }}
            >
              {icon}
            </Stack>
            <Typography variant="h5">{title}</Typography>
          </Stack>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
