import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { Box, Button, Card, CardActionArea, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { updateAppState, useAppState } from '../../storage/localStore';

export function OnboardingPage() {
  const state = useAppState();
  const navigate = useNavigate();

  function selectProfile(id: string) {
    updateAppState((current) => ({ ...current, activePharmacienId: id }));
    navigate('/activity');
  }

  return (
    <Box sx={{ minHeight: '72vh', display: 'grid', placeItems: 'center' }}>
      <Stack spacing={4} sx={{ width: 'min(980px, 100%)', alignItems: 'center' }}>
        <Typography className="welcome-hello" variant="h1">Bonjour</Typography>
        <Stack className="welcome-picker" spacing={4} sx={{ width: '100%', alignItems: 'center' }}>
          <Stack spacing={1} sx={{ textAlign: 'center' }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Sélection du profil</Typography>
            <Typography variant="h2">Qui êtes-vous ?</Typography>
            <Typography color="text.secondary">Choisissez un profil pour retrouver vos missions, factures et indicateurs financiers.</Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, width: '100%' }}>
            {state.pharmaciens.map((pharmacien) => (
              <Card key={pharmacien.id}>
                <CardActionArea data-testid="user-card" onClick={() => selectProfile(pharmacien.id)} sx={{ p: 3, minHeight: 160 }}>
                  <Stack spacing={2}>
                    <PersonRoundedIcon fontSize="large" />
                    <Typography variant="h5">{pharmacien.nom}</Typography>
                    <Typography color="text.secondary">Entrer avec ce profil</Typography>
                  </Stack>
                </CardActionArea>
              </Card>
            ))}
            <Card>
              <CardActionArea onClick={() => navigate('/pharmacien/new')} sx={{ p: 3, minHeight: 160 }}>
                <Stack spacing={2}>
                  <AddRoundedIcon fontSize="large" />
                  <Typography variant="h5">Nouveau pharmacien</Typography>
                  <Typography color="text.secondary">Créer un profil et commencer</Typography>
                </Stack>
              </CardActionArea>
            </Card>
          </Box>
          {!state.pharmaciens.length ? <Button variant="contained" onClick={() => navigate('/pharmacien/new')}>Créer mon profil pharmacien</Button> : null}
        </Stack>
      </Stack>
    </Box>
  );
}
