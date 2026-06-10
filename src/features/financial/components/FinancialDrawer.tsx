import { Drawer, Box, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

interface FinancialDrawerProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  'data-testid'?: string;
}

export function FinancialDrawer({ title, open, onClose, children, 'data-testid': testId }: FinancialDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      data-testid={testId || 'financial-drawer'}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 480 },
          p: 3,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <IconButton onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      {children}
    </Drawer>
  );
}
