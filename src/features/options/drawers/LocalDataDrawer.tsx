import { 
  FormControlLabel, 
  Stack, 
  Typography,
  Button,
  Divider 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { LocalDataSettings } from '../../../storage/schema';

interface LocalDataDrawerProps {
  settings: LocalDataSettings;
  onChange: (settings: LocalDataSettings) => void;
}

/**
 * Drawer pour la configuration des données locales
 */
export function LocalDataDrawer({ settings, onChange }: LocalDataDrawerProps) {
  const navigate = useNavigate();

  const updateSetting = (key: keyof LocalDataSettings, value: LocalDataSettings[typeof key]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Stack spacing={3}>
      {/* Section : Sauvegarde */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Sauvegarde automatique
        </Typography>
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.autoBackupEnabled ?? true}
              exclusive
              onChange={(_, value) => updateSetting('autoBackupEnabled', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Sauvegarde automatique des données"
        />
        
        <Typography variant="body2" color="text.secondary">
          Les données sont automatiquement sauvegardées dans le stockage local de votre navigateur.
          Vous pouvez désactiver cette option si vous préférez gérer manuellement vos sauvegardes.
        </Typography>
      </Stack>

      <Divider />

      {/* Section : Gestion avancée */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Gestion avancée
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Accédez à la page de gestion avancée pour exporter, importer ou réinitialiser vos données.
        </Typography>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/settings')}
          fullWidth
          data-testid="local-data-advanced-button"
        >
          Gestion avancée des données
        </Button>
      </Stack>

      <Divider />

      {/* Section : Informations */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Informations
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          • Les données sont stockées localement dans votre navigateur.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Aucune donnée n'est envoyée à un serveur sans votre consentement.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Pour sauvegarder vos données, utilisez l'export dans la page de gestion avancée.
        </Typography>
      </Stack>
    </Stack>
  );
}
