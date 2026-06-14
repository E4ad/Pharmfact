import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { spacingScale } from '../design-system';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, confirmLabel, onClose, onConfirm }: Props) {
  const titleId = 'confirm-dialog-title';
  const descriptionId = 'confirm-dialog-description';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          sx: { zIndex: 1400 },
        },
      }}
    >
      <DialogTitle id={titleId} sx={{ pb: 1, fontWeight: 750 }}>
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <DialogContentText id={descriptionId}>{description}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: spacingScale.lg, pb: spacingScale.lg, gap: 1 }}>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
