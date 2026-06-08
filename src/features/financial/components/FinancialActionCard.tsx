import { Card, CardActionArea, Stack, Typography, Box } from '@mui/material';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface FinancialActionCardProps {
  iconTone: IconTone;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export function FinancialActionCard({
  iconTone,
  icon,
  title,
  description,
  onClick,
}: FinancialActionCardProps) {
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
      <CardActionArea onClick={onClick} sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ minHeight: 140, justifyContent: 'space-between' }}>
          <Stack spacing={2}>
             <Box
               sx={{ 
                 width: 40,
                 height: 40,
                 borderRadius: '50%',
                 backgroundColor: toneColors[iconTone],
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center'
               }}
             >
              {icon}
            </Box>
            <Typography variant="h6">{title}</Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">{description}</Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
