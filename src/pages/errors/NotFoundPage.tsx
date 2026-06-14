import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page introuvable · Pharmfact';
  }, []);

  return (
    <Box id="main-content" component="main" tabIndex={-1} sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'background.default' }}>
      <Card sx={{ maxWidth: 520, width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              Page introuvable
            </Typography>
            <Typography variant="h3">Cette page n’existe pas.</Typography>
            <Typography color="text.secondary">
              Le lien demandé est invalide ou la page n’a pas encore été ajoutée.
            </Typography>
            <Button component={Link} to="/activity" variant="contained">
              Retour à l’accueil
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
