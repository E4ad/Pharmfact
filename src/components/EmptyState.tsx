import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <Box
      sx={{
        p: { xs: 4, md: 5 },
        textAlign: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 5,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 52,
            height: 52,
            borderRadius: '999px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
          }}
        >
          <Inventory2RoundedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 750 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>{description}</Typography>
        {actionLabel && onAction ? <Button variant="contained" onClick={onAction}>{actionLabel}</Button> : null}
      </Stack>
    </Box>
  );
}
