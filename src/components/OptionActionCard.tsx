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
    <Card data-testid={testId} variant="outlined">
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2 }}>
        <Stack direction="row" spacing={1.75} sx={{ alignItems: 'flex-start', minHeight: 88 }}>
          <Box sx={{ pt: 0.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                backgroundColor: toneColors[iconTone],
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& svg': { fontSize: 20 },
              }}
            >
              {icon}
            </Box>
          </Box>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
