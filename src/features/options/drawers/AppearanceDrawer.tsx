import { FormControl, InputLabel, MenuItem, Select, Stack, Typography, Box, Chip } from '@mui/material';
import { type UiSettings } from '../../../storage/schema';
import { useThemeContext } from '../../../contexts/ThemeContext';

interface AppearanceDrawerProps {
  settings: UiSettings;
  onChange: (settings: UiSettings) => void;
}

const themeOptions = [
  { value: 'light' as const, label: 'Clair', description: 'Thème clair' },
  { value: 'dark' as const, label: 'Sombre', description: 'Thème sombre' },
  { value: 'system' as const, label: 'Système', description: 'Suit les préférences système' },
];

const primaryColorOptions = [
  { value: '#2563eb', label: 'Bleu par défaut' },
  { value: '#059669', label: 'Vert' },
  { value: '#d97706', label: 'Ambre' },
  { value: '#dc2626', label: 'Rouge' },
  { value: '#7c3aed', label: 'Violet' },
];

/**
 * Drawer pour la configuration de l'apparence (thème)
 * Applique les changements immédiatement sans attendre la sauvegarde
 */
export function AppearanceDrawer({ settings, onChange }: AppearanceDrawerProps) {
  const { setMode } = useThemeContext();

  const handleThemeChange = (value: UiSettings['themeMode']) => {
    // Appliquer immédiatement le changement de thème
    setMode(value);
    // Mettre à jour les settings pour la sauvegarde
    onChange({ ...settings, themeMode: value });
  };

  const handlePrimaryColorChange = (value: string) => {
    onChange({ ...settings, primaryColor: value });
  };

  const currentThemeMode = settings.themeMode ?? 'system';

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Thème
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          {themeOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              onClick={() => handleThemeChange(option.value)}
              color={currentThemeMode === option.value ? 'primary' : 'default'}
              variant={currentThemeMode === option.value ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
              data-testid={`theme-option-${option.value}`}
            />
          ))}
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {themeOptions.find(o => o.value === currentThemeMode)?.description}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Couleur principale
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel id="primary-color-label">Couleur d'accentuation</InputLabel>
          <Select
            labelId="primary-color-label"
            label="Couleur d'accentuation"
            value={settings.primaryColor ?? '#2563eb'}
            onChange={(event) => handlePrimaryColorChange(event.target.value)}
            data-testid="appearance-primary-color-select"
          >
            {primaryColorOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: option.value,
                      border: '2px solid',
                      borderColor: 'divider',
                    }}
                  />
                  {option.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
          Couleur utilisée pour les boutons principaux et accents.
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
        Les changements de thème sont appliqués immédiatement. N'oubliez pas d'enregistrer pour conserver vos préférences.
      </Typography>
    </Stack>
  );
}
