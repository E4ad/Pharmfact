import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageBackButton } from '../../components/PageBackButton';
import { useAppState, updateAppState } from '../../storage/localStore';
import type { AppOptions, TaxStatus, UiSettings, LocalDataSettings } from '../../storage/schema';
import { activePharmacien, selectAppOptions, selectFinancialOptions, selectUiOptions, selectLocalDataOptions } from '../../storage/selectors';

const missionTypes = [
  ['REMPLACEMENT_OFFICINE', 'Remplacement officine'],
  ['GARDE', 'Garde'],
  ['CLINIQUE', 'Clinique'],
];

export function OptionsPage() {
  const navigate = useNavigate();
  const state = useAppState();
  const currentActive = activePharmacien(state);

  const appOptions = selectAppOptions(state);
  const fiscalSettings = selectFinancialOptions(state);
  const uiSettings = selectUiOptions(state);
  const localDataSettings = selectLocalDataOptions(state);

  const [form, setForm] = useState<AppOptions>(() => appOptions);
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [taxStatus, setTaxStatus] = useState<TaxStatus>(() => fiscalSettings.defaultTaxStatus);
  const [uiSettingsForm, setUiSettingsForm] = useState<UiSettings>(() => uiSettings);
  const [localDataSettingsForm, setLocalDataSettingsForm] = useState<LocalDataSettings>(() => localDataSettings);

  useEffect(() => {
    const appOptions = selectAppOptions(state);
    const fiscalSettings = selectFinancialOptions(state);
    const uiSettings = selectUiOptions(state);
    const localDataSettings = selectLocalDataOptions(state);

    // Synchronisation initiale des states avec le store
    // eslint-disable-next-line react/no-sync-state-update
    setForm(appOptions);
    // eslint-disable-next-line react/no-sync-state-update
    setTaxStatus(fiscalSettings.defaultTaxStatus);
    // eslint-disable-next-line react/no-sync-state-update
    setUiSettingsForm(uiSettings);
    // eslint-disable-next-line react/no-sync-state-update
    setLocalDataSettingsForm(localDataSettings);
  }, [state]);

  const handleSave = () => {
    try {
      updateAppState((current) => ({
        ...current,
        appOptions: form,
        fiscalSettings: {
          ...current.fiscalSettings,
          defaultTaxStatus: taxStatus,
        },
        uiSettings: uiSettingsForm,
        localDataSettings: localDataSettingsForm,
      }));
      setToast({ severity: 'success', message: 'Paramètres enregistrés avec succès.' });
    } catch (error) {
      setToast({ severity: 'error', message: `Erreur lors de l'enregistrement.` });
    }
  };

  const handleChange =
    (field: keyof AppOptions) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  return (
    <Stack component="div" spacing={3} sx={{ width: 'min(980px, 100%)', mx: 'auto', py: 4 }}>
      <Stack direction="row" component="div" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
        <PageBackButton to="/activity" data-testid="options-back-button" />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Paramètres
        </Typography>
      </Stack>

      <Card>
        <CardContent>
          <Stack direction="row" component="div" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <SettingsRoundedIcon />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Informations générales
            </Typography>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Nom du pharmacien actif"
              value={currentActive?.nom ?? ''}
              disabled
              helperText="Sélectionné dans la section Pharmaciens"
              variant="outlined"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl>
              <InputLabel id="tax-status-label">Statut fiscal par défaut</InputLabel>
              <Select
                labelId="tax-status-label"
                value={taxStatus}
                label="Statut fiscal par défaut"
                onChange={(event) => setTaxStatus(event.target.value as TaxStatus)}
              >
                <MenuItem value="SMALL_SUPPLIER">Petit fournisseur (non inscrit)</MenuItem>
                <MenuItem value="REGISTERED">Inscrit (TPS/TVQ applicables)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" component="div" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <PersonAddAltRoundedIcon />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Missions
            </Typography>
          </Stack>
          <Stack spacing={2}>
            <FormControl>
              <InputLabel id="mission-type-label">Type de mission par défaut</InputLabel>
              <Select
                labelId="mission-type-label"
                value={form.missionDefaults.defaultMissionType ?? 'REMPLACEMENT_OFFICINE'}
                label="Type de mission par défaut"
                onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultMissionType: event.target.value } }))}
              >
                {missionTypes.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Heure de début par défaut"
              type="time"
              value={form.missionDefaults.defaultStartTime ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultStartTime: event.target.value } }))}
              slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Heure de fin par défaut"
              type="time"
              value={form.missionDefaults.defaultEndTime ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultEndTime: event.target.value } }))}
              slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Pause par défaut (minutes)"
              type="number"
              value={form.missionDefaults.defaultBreakMinutes ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultBreakMinutes: Number(event.target.value) } }))}
              slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Délai de paiement (jours)"
              type="number"
              value={form.invoiceDefaults.invoiceDueDays ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, invoiceDefaults: { ...prev.invoiceDefaults, invoiceDueDays: Number(event.target.value) } }))}
              slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={form.missionDefaults.mealAutoEnabled ?? false}
                  exclusive
                  onChange={(event, value) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mealAutoEnabled: value } }))}
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
              value={form.missionDefaults.mealThresholdHours ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mealThresholdHours: Number(event.target.value) } }))}
              slotProps={{ htmlInput: { min: 0, step: 0.5 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Montant de repas par défaut (cents)"
              type="number"
              value={form.missionDefaults.mealDefaultCents ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mealDefaultCents: Number(event.target.value) } }))}
              slotProps={{ htmlInput: { min: 0, step: 100 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Taux de kilométrage (cents)"
              type="number"
              value={form.missionDefaults.mileageRateCents ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mileageRateCents: Number(event.target.value) } }))}
              slotProps={{ htmlInput: { min: 0, step: 100 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" component="div" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <AddBusinessRoundedIcon />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Facturation & PDF
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paramètres de facture, conditions de paiement et génération PDF.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Mode de paiement"
              value={form.invoiceDefaults.paymentTerms ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, invoiceDefaults: { ...prev.invoiceDefaults, paymentTerms: event.target.value } }))}
              variant="outlined"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Conditions de paiement"
              value={form.invoiceDefaults.paymentTerms ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, invoiceDefaults: { ...prev.invoiceDefaults, paymentTerms: event.target.value } }))}
              multiline
              minRows={2}
              variant="outlined"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={form.pdfCalendar.pdfFooterEnabled ?? false}
                  exclusive
                  onChange={(event, value) => setForm(prev => ({ ...prev, pdfCalendar: { ...prev.pdfCalendar, pdfFooterEnabled: value } }))}
                >
                  <ToggleButton value={true}>Activé</ToggleButton>
                  <ToggleButton value={false}>Désactivé</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Pied de page PDF"
            />
            <TextField
              label="Titre de l'événement de calendrier"
              value={form.pdfCalendar.calendarEventTitle ?? ''}
              onChange={(event) => setForm(prev => ({ ...prev, pdfCalendar: { ...prev.pdfCalendar, calendarEventTitle: event.target.value } }))}
              variant="outlined"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={form.pdfCalendar.calendarIcsEnabled ?? false}
                  exclusive
                  onChange={(event, value) => setForm(prev => ({ ...prev, pdfCalendar: { ...prev.pdfCalendar, calendarIcsEnabled: value } }))}
                >
                  <ToggleButton value={true}>Activé</ToggleButton>
                  <ToggleButton value={false}>Désactivé</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Calendrier ICS"
            />
            <FormControl>
              <InputLabel id="calendar-reminder-label">Rappel de calendrier</InputLabel>
              <Select
                labelId="calendar-reminder-label"
                value={form.pdfCalendar.calendarReminder ?? 'NONE'}
                label="Rappel de calendrier"
                onChange={(event) => setForm(prev => ({ ...prev, pdfCalendar: { ...prev.pdfCalendar, calendarReminder: event.target.value as 'NONE' | 'ONE_HOUR' | 'DAY_BEFORE' } }))}
              >
                <MenuItem value="NONE">Aucun</MenuItem>
                <MenuItem value="ONE_HOUR">1 heure avant</MenuItem>
                <MenuItem value="DAY_BEFORE">La veille</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" component="div" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <SettingsRoundedIcon />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Financier & fiscalité
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Réserve fiscale, acomptes provisionnels, seuils et suivi des dépenses déductibles.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Taux de réserve fiscale"
              type="number"
              value={fiscalSettings.reserveRate * 100}
              onChange={(event) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, reserveRate: Number(event.target.value) / 100 } }))}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 1 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Seuil petit fournisseur"
              type="number"
              value={fiscalSettings.smallSupplierThresholdCents / 100}
              onChange={(event) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, smallSupplierThresholdCents: Number(event.target.value) * 100 } }))}
              slotProps={{ htmlInput: { min: 0, step: 1000 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <TextField
              label="Seuil d'alerte petit fournisseur"
              type="number"
              value={fiscalSettings.smallSupplierWarningRate * 100}
              onChange={(event) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, smallSupplierWarningRate: Number(event.target.value) / 100 } }))}
              slotProps={{ htmlInput: { min: 0, max: 100, step: 1 }, inputLabel: { shrink: true } }}
              variant="outlined"
            />
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={fiscalSettings.includeMissionDeductibleExpenses}
                  exclusive
                  onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, includeMissionDeductibleExpenses: value } }))}
                >
                  <ToggleButton value={true}>Activé</ToggleButton>
                  <ToggleButton value={false}>Désactivé</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Inclure frais déductibles issus des missions"
            />
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={fiscalSettings.enableInstalmentTracking}
                  exclusive
                  onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, enableInstalmentTracking: value } }))}
                >
                  <ToggleButton value={true}>Activé</ToggleButton>
                  <ToggleButton value={false}>Désactivé</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Suivi des acomptes provisionnels"
            />
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={fiscalSettings.enableExpenseTracking}
                  exclusive
                  onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, enableExpenseTracking: value } }))}
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
                  value={fiscalSettings.trackExpenseReceipts}
                  exclusive
                  onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, trackExpenseReceipts: value } }))}
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
                  value={fiscalSettings.warnMissingExpenseReceipts}
                  exclusive
                  onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, warnMissingExpenseReceipts: value } }))}
                >
                  <ToggleButton value={true}>Activé</ToggleButton>
                  <ToggleButton value={false}>Désactivé</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Alerter si justificatif manquant"
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Vues financières</Typography>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <ToggleButtonGroup
                    value={fiscalSettings.showMonthlyView}
                    exclusive
                    onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, showMonthlyView: value } }))}
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
                    value={fiscalSettings.showQuarterlyView}
                    exclusive
                    onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, showQuarterlyView: value } }))}
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
                    value={fiscalSettings.showAnnualView}
                    exclusive
                    onChange={(event, value) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, showAnnualView: value } }))}
                  >
                    <ToggleButton value={true}>Activé</ToggleButton>
                    <ToggleButton value={false}>Désactivé</ToggleButton>
                  </ToggleButtonGroup>
                }
                label="Annuelle"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" component="div" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <SettingsRoundedIcon />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Apparence
            </Typography>
          </Stack>
          <Stack spacing={2}>
            <FormControl>
              <InputLabel id="theme-mode-label">Mode d'affichage</InputLabel>
              <Select
                labelId="theme-mode-label"
                value={uiSettingsForm.themeMode}
                label="Mode d'affichage"
                onChange={(event) => setUiSettingsForm(prev => ({ ...prev, themeMode: event.target.value as 'light' | 'dark' | 'system' }))}
              >
                <MenuItem value="light">Clair</MenuItem>
                <MenuItem value="dark">Sombre</MenuItem>
                <MenuItem value="system">Système</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
            <SettingsRoundedIcon />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              Données locales
            </Typography>
          </Stack>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={localDataSettingsForm.autoBackupEnabled}
                  exclusive
                  onChange={(event, value) => setLocalDataSettingsForm(prev => ({ ...prev, autoBackupEnabled: value }))}
                >
                  <ToggleButton value={true}>Activé</ToggleButton>
                  <ToggleButton value={false}>Désactivé</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Sauvegarde automatique"
            />
            <Button
              variant="outlined"
              onClick={() => navigate('/settings')}
              sx={{ alignSelf: 'flex-start' }}
            >
              Gestion avancée des données
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveRoundedIcon />}
          onClick={handleSave}
          sx={{ borderRadius: 999, px: 4, py: 1.5 }}
          data-testid="options-save-button"
        >
          Enregistrer
        </Button>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}