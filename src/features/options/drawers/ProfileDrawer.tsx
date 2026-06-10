import { 
  Avatar, 
  Box, 
  Button, 
  Stack, 
  Typography,
  Divider,
  Chip 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../../storage/localStore';
import { activePharmacien } from '../../../storage/selectors';
import type { AppState } from '../../../storage/schema';

interface ProfileDrawerProps {
  state: AppState;
}

/**
 * Drawer pour l'affichage et la gestion du profil actif
 */
export function ProfileDrawer({ state }: ProfileDrawerProps) {
  const navigate = useNavigate();
  const currentActive = activePharmacien(state);

  // Compter les missions par pharmacien
  const missionCounts: Record<string, number> = {};
  state.missions.forEach(mission => {
    const pharmacienId = mission.pharmacienId;
    missionCounts[pharmacienId] = (missionCounts[pharmacienId] || 0) + 1;
  });

  // Compter les factures par pharmacien
  const invoiceCounts: Record<string, number> = {};
  state.invoices.forEach(invoice => {
    const pharmacienId = invoice.pharmacienId;
    invoiceCounts[pharmacienId] = (invoiceCounts[pharmacienId] || 0) + 1;
  });

  return (
    <Stack spacing={3}>
      {/* Profil actuel */}
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
          {currentActive?.nom.charAt(0).toUpperCase()}
        </Avatar>
        
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {currentActive?.nom ?? 'Aucun profil actif'}
        </Typography>
        
        {currentActive && (
          <>
            <Chip 
              label={currentActive.taxStatus === 'SMALL_SUPPLIER' ? 'Petit fournisseur' : 'Inscrit'}
              size="small"
              color={currentActive.taxStatus === 'SMALL_SUPPLIER' ? 'default' : 'primary'}
              variant="outlined"
            />
            
            <Typography variant="body2" color="text.secondary">
              {currentActive.email}
            </Typography>
          </>
        )}
      </Stack>

      <Divider />

      {/* Statistiques */}
      {currentActive && (
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'center' }}>
            Statistiques
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box sx={{ 
              p: 2, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {missionCounts[currentActive.id] || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Missions
              </Typography>
            </Box>
            
            <Box sx={{ 
              p: 2, 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {invoiceCounts[currentActive.id] || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Factures
              </Typography>
            </Box>
          </Box>
        </Stack>
      )}

      <Divider />

      {/* Liste des profils */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Tous les profils ({state.pharmaciens.length})
        </Typography>
        
        <Stack spacing={1}>
          {state.pharmaciens.map(pharmacien => (
            <Box
              key={pharmacien.id}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                ...(pharmacien.id === state.activePharmacienId && {
                  borderColor: 'primary.main',
                  bgcolor: 'action.selected',
                }),
              }}
              onClick={() => {
                // Sélectionner ce pharmacien comme actif
                import { setAppState } from '../../../storage/localStore';
                setAppState({ ...state, activePharmacienId: pharmacien.id });
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                  {pharmacien.nom.charAt(0).toUpperCase()}
                </Avatar>
                
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pharmacien.nom}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pharmacien.taxStatus === 'SMALL_SUPPLIER' ? 'Petit fournisseur' : 'Inscrit'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Chip 
                    label={missionCounts[pharmacien.id] || 0}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                  <Chip 
                    label={invoiceCounts[pharmacien.id] || 0}
                    size="small"
                    variant="outlined"
                    color="success"
                  />
                </Box>
              </Box>
            </Box>
          ))}
        </Stack>
      </Stack>

      <Divider />

      {/* Actions */}
      <Stack spacing={2}>
        <Button
          variant="outlined"
          onClick={() => navigate('/pharmacien/new')}
          fullWidth
          data-testid="profile-add-pharmacien-button"
        >
          + Ajouter un pharmacien
        </Button>
        
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Cliquez sur un profil pour le sélectionner comme actif.
        </Typography>
      </Stack>
    </Stack>
  );
}
