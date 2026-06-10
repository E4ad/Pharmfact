import { 
  FormControl, 
  FormControlLabel, 
  InputLabel, 
  MenuItem, 
  Select, 
  Stack, 
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider 
} from '@mui/material';
import type { AppOptions } from '../../../storage/schema';

interface MissionSettingsDrawerProps {
  settings: AppOptions;
  onChange: (settings: AppOptions) => void;
}

const missionTypes = [
  { value: 'REMPLACEMENT_OFFICINE', label: 'Remplacement officine' },
  { value: 'GARDE', label: 'Garde' },
  { value: 'CLINIQUE', label: 'Clinique' },
];

/**
 * Drawer pour la configuration des paramètres de mission
 */
export function MissionSettingsDrawer({ settings, onChange }: MissionSettingsDrawerProps) {
  const updateSetting = <K extends keyof AppOptions>(section: keyof AppOptions, key: K, value: AppOptions[K]) => {
    onChange({ 
      ...settings, 
      [section]: { 
        ...settings[section], 
        [key]: value 
      } 
    });
  };

  const updateMissionDefaults = (key: keyof AppOptions['missionDefaults'], value: AppOptions['missionDefaults'][typeof key]) => {
    onChange({ 
      ...settings, 
      missionDefaults: { 
        ...settings.missionDefaults, 
        [key]: value 
      } 
    });
  };

  return (
    <Stack spacing={3}>
      {/* Section : Par défaut */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Paramètres par défaut
        </Typography>
        
        <FormControl fullWidth>
          <InputLabel id="default-mission-type-label">Type de mission par défaut</InputLabel>
          <Select
            labelId="default-mission-type-label"
            label="Type de mission par défaut"
            value={settings.missionDefaults?.defaultMissionType ?? 'REMPLACEMENT_OFFICINE'}
            onChange={(event) => updateMissionDefaults('defaultMissionType', event.target.value)}
          >
            {missionTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Stack direction="row" spacing={2}>
          <TextField
            label="Heure de début"
            type="time"
            value={settings.missionDefaults?.defaultStartTime ?? '08:00'}
            onChange={(event) => updateMissionDefaults('defaultStartTime', event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Heure de fin"
            type="time"
            value={settings.missionDefaults?.defaultEndTime ?? '17:00'}
            onChange={(event) => updateMissionDefaults('defaultEndTime', event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>
        
        <TextField
          label="Pause par défaut (minutes)"
          type="number"
          value={settings.missionDefaults?.defaultBreakMinutes ?? 60}
          onChange={(event) => updateMissionDefaults('defaultBreakMinutes', Number(event.target.value))}
          inputProps={{ min: 0, max: 1440, step: 5 }}
          fullWidth
        />
      </Stack>

      <Divider />

      {/* Section : Repas */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Repas
        </Typography>
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.missionDefaults?.mealAutoEnabled ?? true}
              exclusive
              onChange={(_, value) => updateMissionDefaults('mealAutoEnabled', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Repas automatique"
        />
        
        <TextField
          label="Seuil de repas (heures)"
          type="number"
          value={settings.missionDefaults?.mealThresholdHours ?? 8}
          onChange={(event) => updateMissionDefaults('mealThresholdHours', Number(event.target.value))}
          inputProps={{ min: 0, max: 24, step: 0.5 }}
          helperText="Nombre d'heures travaillées avant qu'un repas soit automatique"
          fullWidth
        />
        
        <TextField
          label="Montant de repas par défaut ($)"
          type="number"
          value={(settings.missionDefaults?.mealDefaultCents ?? 2000) / 100}
          onChange={(event) => updateMissionDefaults('mealDefaultCents', Math.round(Number(event.target.value) * 100))}
          inputProps={{ min: 0, step: 0.01 }}
          fullWidth
        />
      </Stack>

      <Divider />

      {/* Section : Kilométrage */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Kilométrage
        </Typography>
        
        <TextField
          label="Taux de kilométrage ($/km)"
          type="number"
          value={(settings.missionDefaults?.mileageRateCents ?? 61) / 100}
          onChange={(event) => updateMissionDefaults('mileageRateCents', Math.round(Number(event.target.value) * 100))}
          inputProps={{ min: 0, step: 0.01 }}
          fullWidth
        />
      </Stack>
    </Stack>
  );
}
