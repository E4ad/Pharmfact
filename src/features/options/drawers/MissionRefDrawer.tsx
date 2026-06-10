import { 
  List, 
  ListItem, 
  ListItemText, 
  Stack, 
  Typography,
  Divider,
  Chip 
} from '@mui/material';
import { useAppState } from '../../../storage/localStore';

// Types de mission disponibles
const missionTypes = [
  { key: 'REMPLACEMENT_OFFICINE', label: 'Remplacement officine', description: 'Mission de remplacement en pharmacie officielle' },
  { key: 'GARDE', label: 'Garde', description: 'Mission de garde ou d\'urgence' },
  { key: 'CLINIQUE', label: 'Clinique', description: 'Mission en clinique ou cabinet' },
];

// Types de frais disponibles
const expenseTypes = [
  { key: 'REPAS', label: 'Repas', category: 'Dépense déductible' },
  { key: 'KM', label: 'Kilométrage', category: 'Dépense déductible' },
  { key: 'PARKING', label: 'Stationnement', category: 'Dépense déductible' },
  { key: 'TOLL', label: 'Péage', category: 'Dépense déductible' },
  { key: 'LODGING', label: 'Hôtel', category: 'Dépense déductible' },
  { key: 'TRANSPORT', label: 'Transport', category: 'Dépense déductible' },
  { key: 'SUPPLIES', label: 'Fourniture', category: 'Dépense déductible' },
  { key: 'OTHER', label: 'Autre', category: 'Dépense déductible' },
  { key: 'NON_DEDUCTIBLE', label: 'Autre non déductible', category: 'Non déductible' },
];

// Statuts de mission
const missionStatuses = [
  { key: 'DRAFT', label: 'Brouillon', description: 'Mission en cours de création' },
  { key: 'CONFIRMED', label: 'Confirmée', description: 'Mission validée' },
  { key: 'IN_PROGRESS', label: 'En cours', description: 'Mission en cours de réalisation' },
  { key: 'COMPLETED', label: 'Terminée', description: 'Mission complète' },
  { key: 'ARCHIVED', label: 'Archivée', description: 'Mission archivée' },
  { key: 'CANCELLED', label: 'Annulée', description: 'Mission annulée' },
];

// Statuts de facture
const invoiceStatuses = [
  { key: 'GENERATED', label: 'Générée', description: 'Facture générée mais non envoyée' },
  { key: 'SENT', label: 'Envoyée', description: 'Facture envoyée au client' },
  { key: 'PAID', label: 'Payée', description: 'Facture payée' },
  { key: 'ARCHIVED', label: 'Archivée', description: 'Facture archivée' },
  { key: 'VOIDED', label: 'Annulée', description: 'Facture annulée' },
];

/**
 * Drawer pour l'affichage du référentiel des missions
 * V1: Affichage seulement (pas d'édition)
 */
export function MissionRefDrawer() {
  const state = useAppState();
  
  // Compter les utilisations
  const missionTypeCounts: Record<string, number> = {};
  state.missions.forEach(mission => {
    const type = mission.defaultMissionType || 'REMPLACEMENT_OFFICINE';
    missionTypeCounts[type] = (missionTypeCounts[type] || 0) + 1;
  });

  const expenseTypeCounts: Record<string, number> = {};
  state.missions.forEach(mission => {
    mission.days.forEach(day => {
      day.expenses?.forEach(expense => {
        const type = expense.typeKey || 'OTHER';
        expenseTypeCounts[type] = (expenseTypeCounts[type] || 0) + 1;
      });
    });
  });

  return (
    <Stack spacing={3}>
      {/* Types de mission */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Types de mission
        </Typography>
        
        <List dense>
          {missionTypes.map((type) => (
            <ListItem key={type.key} disableGutters>
              <ListItemText
                primary={type.label}
                secondary={type.description}
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.875rem' }}
              />
              <Chip 
                label={missionTypeCounts[type.key] || 0}
                size="small"
                variant="outlined"
                color="primary"
              />
            </ListItem>
          ))}
        </List>
      </Stack>

      <Divider />

      {/* Types de frais */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Types de frais
        </Typography>
        
        <List dense>
          {expenseTypes.map((type) => (
            <ListItem key={type.key} disableGutters>
              <ListItemText
                primary={type.label}
                secondary={
                  <>
                    <Chip 
                      label={type.category}
                      size="small"
                      variant="filled"
                      color={type.category === 'Non déductible' ? 'default' : 'success'}
                      sx={{ mr: 1, fontSize: '0.75rem' }}
                    />
                    {expenseTypeCounts[type.key] || 0} utilisations
                  </>
                }
                primaryTypographyProps={{ fontWeight: 500 }}
                secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.875rem' }}
              />
            </ListItem>
          ))}
        </List>
      </Stack>

      <Divider />

      {/* Statuts mission */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Statuts mission
        </Typography>
        
        <List dense>
          {missionStatuses.map((status) => {
            const count = state.missions.filter(m => m.status === status.key).length;
            return (
              <ListItem key={status.key} disableGutters>
                <ListItemText
                  primary={status.label}
                  secondary={status.description}
                  primaryTypographyProps={{ fontWeight: 500 }}
                  secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.875rem' }}
                />
                <Chip 
                  label={count}
                  size="small"
                  variant="outlined"
                  color={status.key === 'COMPLETED' ? 'success' : 
                        status.key === 'CANCELLED' ? 'error' : 'default'}
                />
              </ListItem>
            );
          })}
        </List>
      </Stack>

      <Divider />

      {/* Statuts facture */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Statuts facture
        </Typography>
        
        <List dense>
          {invoiceStatuses.map((status) => {
            const count = state.invoices.filter(i => i.status === status.key).length;
            return (
              <ListItem key={status.key} disableGutters>
                <ListItemText
                  primary={status.label}
                  secondary={status.description}
                  primaryTypographyProps={{ fontWeight: 500 }}
                  secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.875rem' }}
                />
                <Chip 
                  label={count}
                  size="small"
                  variant="outlined"
                  color={status.key === 'PAID' ? 'success' : 
                        status.key === 'VOIDED' ? 'error' : 
                        status.key === 'SENT' ? 'warning' : 'default'}
                />
              </ListItem>
            );
          })}
        </List>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ pt: 2, textAlign: 'center' }}>
        Version 1.0 - Affichage seulement
      </Typography>
    </Stack>
  );
}
