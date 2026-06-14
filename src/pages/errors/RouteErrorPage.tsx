import { Box, Button, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { SurfaceCard } from '../../components/SurfaceCard';

export function RouteErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Une erreur est survenue';

  const message = isRouteErrorResponse(error)
    ? 'La page demandée est introuvable ou inaccessible.'
    : 'L’application a rencontré une erreur inattendue.';

  useEffect(() => {
    document.title = 'Erreur · Pharmfact';
  }, []);

  return (
    <Box id="main-content" component="main" tabIndex={-1} sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
      <SurfaceCard contentSx={{ p: { xs: 3, md: 4 } }} sx={{ maxWidth: 560, width: '100%' }}>
        <Stack spacing={2}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              Erreur
            </Typography>
            <Typography variant="h3">{title}</Typography>
            <Typography color="text.secondary">{message}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button component={Link} to="/activity" variant="contained">
                Retour à l’accueil
              </Button>
              <Button onClick={() => window.location.reload()} variant="outlined">
                Recharger
              </Button>
            </Stack>
          </Stack>
        </SurfaceCard>
    </Box>
  );
}
