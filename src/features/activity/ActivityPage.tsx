import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Box, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ActionCard } from '../../components/ActionCard';
import { useAppState } from '../../storage/localStore';
import { activePharmacien } from '../../storage/selectors';

export function ActivityPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const pharmacien = activePharmacien(state);

  return (
    <Stack spacing={5} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Accueil</Typography>
        <Typography variant="h2">{pharmacien ? `Bonjour ${pharmacien.nom.split(' ')[0]}` : 'Bonjour'}</Typography>
        <Typography color="text.secondary">Choisissez une action. L’interface reste volontairement calme et centrée sur la mission.</Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }, gap: 2 }}>
        <ActionCard title="Nouvelle mission" description="Créer une mission et calculer le résumé financier." icon={<AssignmentRoundedIcon />} onClick={() => navigate('/mission/new')} />
        <ActionCard title="Suivi des missions" description="Ouvrir la liste focalisée des missions." icon={<FactCheckRoundedIcon />} onClick={() => navigate('/missions')} />
        <ActionCard title="État financier" description="Revenus, acomptes, taxes et réserve fiscale." icon={<QueryStatsRoundedIcon />} onClick={() => navigate('/financial')} />
        <ActionCard title="Options" description="Profils, pharmacies et paramètres par défaut." icon={<SettingsRoundedIcon />} onClick={() => navigate('/options')} />
        <ActionCard title="Ajouter une pharmacie" description="Créer une fiche pharmacie et ses paramètres." icon={<LocalHospitalRoundedIcon />} onClick={() => navigate('/pharmacy/add')} />
      </Box>
    </Stack>
  );
}
