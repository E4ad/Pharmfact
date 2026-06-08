import { Card, CardContent, Stack, Typography, Box } from '@mui/material';
import { MoneyValue } from '../../../components/MoneyValue';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface FinancialMetricCardProps {
  iconTone: IconTone;
  icon: React.ReactNode;
  label: string;
  valueCents: number;
  helperText: string;
  compact?: boolean;
}

export function FinancialMetricCard({
  iconTone,
  icon,
  label,
  valueCents,
  helperText,
  compact = false,
}: FinancialMetricCardProps) {
  const toneColors: Record<IconTone, string> = {
    green: '#C8E6C9',
    blue: '#BBDEFB',
    amber: '#FFE0B2',
    purple: '#E1BEE7',
    red: '#FFCDD2',
    gray: '#F5F5F5',
  };

  return (
    <Card>
      <CardContent sx={{ p: compact ? 2 : 3 }}>
        <Stack spacing={1}>
           <Box
            sx={{ 
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: toneColors[iconTone],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1
            }}
          >
            {icon}
          </Box>
          
          <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          
          <MoneyValue cents={valueCents} variant={compact ? 'h5' : 'h4'} />
          
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
