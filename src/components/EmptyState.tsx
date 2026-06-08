import { Box, Button, Stack, Typography } from '@mui/material';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <Box sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 5, bgcolor: 'background.paper' }}>
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <Typography variant="h5">{title}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>{description}</Typography>
        {actionLabel && onAction ? <Button variant="contained" onClick={onAction}>{actionLabel}</Button> : null}
      </Stack>
    </Box>
  );
}
