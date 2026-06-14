import { Dialog, DialogTitle, DialogContent, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

interface FinancialModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  'data-testid'?: string;
}

export function FinancialModal({ title, open, onClose, children, 'data-testid': testId }: FinancialModalProps) {
  const titleId = `financial-modal-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-title`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
      data-testid={testId || 'financial-modal'}
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            width: { xs: '100%', sm: 480 },
            zIndex: 1400,
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0, position: 'relative' }}>
        <Typography id={titleId} variant="h6">{title}</Typography>
        <IconButton
          aria-label="Fermer"
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// Alias pour la rétrocompatibilité
export const FinancialDrawer = FinancialModal;

// Export principal
export default FinancialModal;
