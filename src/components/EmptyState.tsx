import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { borderWidth, iconSize, spacingScale } from '../design-system/tokens';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  const theme = useTheme();
  const hasAction = Boolean(actionLabel && onAction);

  return (
    <Box
      sx={{
        p: { xs: spacingScale.lg, md: spacingScale.xl },
        textAlign: 'center',
        border: `${borderWidth.thin}px dashed`,
        borderColor: 'divider',
        borderRadius: theme.runtimeTokens.surfaceRadius,
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={spacingScale.sm} sx={{ alignItems: 'center' }}>
        <Box
          aria-hidden="true"
          tabIndex={-1}
          sx={{
            width: iconSize.lg,
            height: iconSize.lg,
            borderRadius: theme.runtimeTokens.iconRadius,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            // No border - visual hierarchy through bgcolor only
          }}
        >
          <Inventory2RoundedIcon />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 750 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>{description}</Typography>
        {hasAction ? <Button variant="contained" onClick={onAction}>{actionLabel}</Button> : null}
      </Stack>
    </Box>
  );
}
