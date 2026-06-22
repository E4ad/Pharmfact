import { Box, Button, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationSystem';
import { SurfaceCard } from './SurfaceCard';

type NotFoundStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  secondaryActionLabel?: string;
  secondaryActionTo?: string;
  onAction?: () => void;
  icon?: ReactNode;
  redirectTo?: string;
  toastMessage?: string;
};

export function NotFoundState({
  title,
  description,
  actionLabel = 'Retour à l’accueil',
  actionTo = '/activity',
  secondaryActionLabel,
  secondaryActionTo,
  onAction,
  icon,
  redirectTo,
  toastMessage,
}: NotFoundStateProps) {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!redirectTo || redirectedRef.current) return;
    redirectedRef.current = true;
    if (toastMessage) {
      notify({ severity: 'warning', message: toastMessage });
    }
    navigate(redirectTo, { replace: true });
  }, [navigate, notify, redirectTo, toastMessage]);

  return (
    <Box
      component="main"
      id="main-content"
      tabIndex={-1}
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 4 },
        bgcolor: 'background.default',
      }}
    >
      <SurfaceCard sx={{ width: 'min(680px, 100%)' }} contentSx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            {icon ? <Box aria-hidden="true">{icon}</Box> : null}
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, letterSpacing: '0.12em' }}>
              Ressource introuvable
            </Typography>
            <Typography variant="h3" sx={{ letterSpacing: '-0.03em' }}>
              {title}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 560 }}>
              {description}
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={Link} to={actionTo} variant="contained" onClick={onAction}>
              {actionLabel}
            </Button>
            {secondaryActionLabel && secondaryActionTo ? (
              <Button component={Link} to={secondaryActionTo} variant="outlined" color="inherit">
                {secondaryActionLabel}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </SurfaceCard>
    </Box>
  );
}
