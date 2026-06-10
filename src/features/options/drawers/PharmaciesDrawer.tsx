import { 
  Box, 
  Button, 
  Stack, 
  Typography,
  Divider,
  Chip 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '../../../storage/schema';

interface PharmaciesDrawerProps {
  state: AppState;
}

/**
 * Drawer pour l'affichage et la gestion des pharmacies
 */
export function PharmaciesDrawer({ state }: PharmaciesDrawerProps) {
  const navigate = useNavigate();

  // Compter les missions par pharmacie
  const missionCounts: Record<string, number> = {};
  state.missions.forEach(mission => {
    const pharmacieId = mission.pharmacieId;
    missionCounts[pharmacieId] = (missionCounts[pharmacieId] || 0) + 1;
  });

  return (
    <Stack spacing={3}>
      {/* Statistiques */}
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Pharmacies ({state.pharmacies.length})
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Total des missions : {state.missions.length}
        </Typography>
      </Stack>

      <Divider />

      {/* Liste des pharmacies */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Liste des pharmacies
        </Typography>
        
        {state.pharmacies.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Aucune pharmacie enregistrée.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {state.pharmacies.map(pharmacie => (
              <Box
                key={pharmacie.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {pharmacie.nom}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {pharmacie.adresse}, {pharmacie.ville} ({pharmacie.codePostal})
                    </Typography>
                    
                    {pharmacie.telephone && (
                      <Typography variant="body2" color="text.secondary">
                        ☎ {pharmacie.telephone}
                      </Typography>
                    )}
                    
                    {pharmacie.email && (
                      <Typography variant="body2" color="text.secondary">
                        ✉ {pharmacie.email}
                      </Typography>
                    )}
                    
                    {pharmacie.notes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        "{pharmacie.notes}"
                      </Typography>
                    )}
                  </Box>
                  
                  <Chip 
                    label={missionCounts[pharmacie.id] || 0}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ flexShrink: 0 }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      {/* Actions */}
      <Stack spacing={2}>
        <Button
          variant="outlined"
          onClick={() => navigate('/pharmacy/add')}
          fullWidth
          data-testid="pharmacies-add-button"
        >
          + Ajouter une pharmacie
        </Button>
        
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Cliquez sur une pharmacie pour voir ses détails.
        </Typography>
      </Stack>
    </Stack>
  );
}
