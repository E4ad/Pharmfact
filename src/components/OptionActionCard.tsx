import { Card, CardActionArea, Stack, Typography, Box } from '@mui/material';
import type { ReactNode } from 'react';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface OptionActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconTone?: IconTone;
  onClick: () => void;
  'data-testid'?: string;
}

const toneColors: Record<IconTone, string> = {
  green: '#C8E6C9',
  blue: '#BBDEFB',
  amber: '#FFE0B2',
  purple: '#E1BEE7',
  red: '#FFCDD2',
  gray: '#F5F5F5',
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
    <Card data-testid={testId}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: { xs: 3, md: 4 } }}>
        <Stack spacing={3} sx={{ minHeight: 180, justifyContent: 'space-between' }}>
          <Stack spacing={2}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 4,
                backgroundColor: toneColors[iconTone],
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
            <Typography variant="h5">{title}</Typography>
          </Stack>
          <Typography color="text.secondary">{description}</Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
