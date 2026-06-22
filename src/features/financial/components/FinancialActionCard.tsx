import { CardActionArea, Stack, Typography, Box, type SxProps, type Theme, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { SurfaceCard } from '../../../components/SurfaceCard';

type IconTone = 'green' | 'blue' | 'amber' | 'purple' | 'red' | 'gray';

interface FinancialActionCardProps {
  iconTone: IconTone;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const toneStyles: Record<IconTone, SxProps<Theme>> = {
  green: (theme) => ({
    bgcolor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
  }),
  blue: (theme) => ({
    bgcolor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
  }),
  amber: (theme) => ({
    bgcolor: alpha(theme.palette.warning.main, 0.12),
    color: theme.palette.warning.main,
  }),
  purple: (theme) => ({
    bgcolor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.main,
  }),
  red: (theme) => ({
    bgcolor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
  }),
  gray: (theme) => ({
    bgcolor: alpha(theme.palette.text.secondary, 0.08),
    color: theme.palette.text.secondary,
  }),
};

export function FinancialActionCard({
  iconTone,
  icon,
  title,
  description,
  onClick,
}: FinancialActionCardProps) {
  const theme = useTheme();

  return (
    <SurfaceCard radius="dashboardCard">
      <CardActionArea onClick={onClick} sx={{ p: 3 }}>
        <Stack spacing={2} sx={{ minHeight: 140, justifyContent: 'space-between' }}>
          <Stack spacing={2}>
             <Box
               sx={{ 
                 width: 40,
                 height: 40,
                 borderRadius: theme.runtimeTokens.iconRadius,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 ...toneStyles[iconTone],
               }}
             >
              {icon}
            </Box>
            <Typography variant="h6">{title}</Typography>
          </Stack>
          <Typography color="text.secondary" variant="body2">{description}</Typography>
        </Stack>
      </CardActionArea>
    </SurfaceCard>
  );
}
