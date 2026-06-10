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
import type { FiscalSettings } from '../../../storage/schema';

interface FinancialDrawerProps {
  settings: FiscalSettings;
  onChange: (settings: FiscalSettings) => void;
}

/**
 * Drawer pour la configuration financière et fiscale
 */
export function FinancialDrawer({ settings, onChange }: FinancialDrawerProps) {
  const updateSetting = <K extends keyof FiscalSettings>(key: K, value: FiscalSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <Stack spacing={3}>
      {/* Section : Réserve fiscale */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Réserve fiscale
        </Typography>
        
        <TextField
          label="Taux de réserve fiscale (%)"
          type="number"
          value={settings.reserveRate * 100}
          onChange={(event) => updateSetting('reserveRate', Number(event.target.value) / 100)}
          inputProps={{ min: 0, max: 100, step: 1 }}
          helperText="Pourcentage du bénéfice net à mettre en réserve"
          fullWidth
        />
      </Stack>

      <Divider />

      {/* Section : Acomptes */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Acomptes provisionnels
        </Typography>
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.enableInstalmentTracking ?? false}
              exclusive
              onChange={(_, value) => updateSetting('enableInstalmentTracking', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true} data-testid="financial-enable-instalment-true">
                Activé
              </ToggleButton>
              <ToggleButton value={false} data-testid="financial-enable-instalment-false">
                Désactivé
              </ToggleButton>
            </ToggleButtonGroup>
          }
          label="Suivi des acomptes provisionnels"
        />
      </Stack>

      <Divider />

      {/* Section : Seuil petit fournisseur */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Seuil petit fournisseur
        </Typography>
        
        <TextField
          label="Seuil petit fournisseur ($)"
          type="number"
          value={settings.smallSupplierThresholdCents / 100}
          onChange={(event) => updateSetting('smallSupplierThresholdCents', Number(event.target.value) * 100)}
          inputProps={{ min: 0, step: 100 }}
          helperText="Seuil annuel de fourniture pour le statut de petit fournisseur"
          fullWidth
        />
        
        <TextField
          label="Taux d'alerte petit fournisseur (%)"
          type="number"
          value={settings.smallSupplierWarningRate * 100}
          onChange={(event) => updateSetting('smallSupplierWarningRate', Number(event.target.value) / 100)}
          inputProps={{ min: 0, max: 100, step: 1 }}
          helperText="Pourcentage du seuil à partir duquel une alerte est affichée"
          fullWidth
        />
        
        <FormControl fullWidth>
          <InputLabel id="default-tax-status-label">Statut fiscal par défaut</InputLabel>
          <Select
            labelId="default-tax-status-label"
            label="Statut fiscal par défaut"
            value={settings.defaultTaxStatus ?? 'SMALL_SUPPLIER'}
            onChange={(event) => updateSetting('defaultTaxStatus', event.target.value as FiscalSettings['defaultTaxStatus'])}
          >
            <MenuItem value="SMALL_SUPPLIER">Petit fournisseur (non inscrit)</MenuItem>
            <MenuItem value="REGISTERED">Inscrit (TPS/TVQ applicables)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Divider />

      {/* Section : Dépenses déductibles */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Dépenses déductibles
        </Typography>
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.includeMissionDeductibleExpenses ?? false}
              exclusive
              onChange={(_, value) => updateSetting('includeMissionDeductibleExpenses', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Inclure les frais déductibles issus des missions"
        />
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.enableExpenseTracking ?? false}
              exclusive
              onChange={(_, value) => updateSetting('enableExpenseTracking', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Suivi des dépenses manuelles"
        />
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.trackExpenseReceipts ?? false}
              exclusive
              onChange={(_, value) => updateSetting('trackExpenseReceipts', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Suivre les justificatifs"
        />
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.warnMissingExpenseReceipts ?? false}
              exclusive
              onChange={(_, value) => updateSetting('warnMissingExpenseReceipts', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Alerter si justificatif manquant"
        />
      </Stack>

      <Divider />

      {/* Section : Vues financières */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Vues financières
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Sélectionnez les vues à afficher dans l'état financier :
        </Typography>
        
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={settings.showMonthlyView ?? false}
                exclusive
                onChange={(_, value) => updateSetting('showMonthlyView', Boolean(value))}
                size="small"
              >
                <ToggleButton value={true}>Activé</ToggleButton>
                <ToggleButton value={false}>Désactivé</ToggleButton>
              </ToggleButtonGroup>
            }
            label="Mensuelle"
          />
          
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={settings.showQuarterlyView ?? false}
                exclusive
                onChange={(_, value) => updateSetting('showQuarterlyView', Boolean(value))}
                size="small"
              >
                <ToggleButton value={true}>Activé</ToggleButton>
                <ToggleButton value={false}>Désactivé</ToggleButton>
              </ToggleButtonGroup>
            }
            label="Trimestrielle"
          />
          
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={settings.showAnnualView ?? false}
                exclusive
                onChange={(_, value) => updateSetting('showAnnualView', Boolean(value))}
                size="small"
              >
                <ToggleButton value={true}>Activé</ToggleButton>
                <ToggleButton value={false}>Désactivé</ToggleButton>
              </ToggleButtonGroup>
            }
            label="Annuelle"
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
