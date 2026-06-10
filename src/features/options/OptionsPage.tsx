import { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Stack, Typography, Snackbar, Alert, Divider, Drawer, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, ToggleButton, ToggleButtonGroup, IconButton } from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import LocalPharmacyRoundedIcon from '@mui/icons-material/LocalPharmacyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useNavigate } from 'react-router-dom';
import { BackHomeButton } from '../../components/BackHomeButton';
import { OptionActionCard } from '../../components/OptionActionCard';
import { useAppState, updateAppState } from '../../storage/localStore';
import { activePharmacien, selectAppOptions, selectFinancialOptions, selectUiOptions, selectLocalDataOptions } from '../../storage/selectors';
import type { AppOptions, TaxStatus, UiSettings, LocalDataSettings, Pharmacie, Pharmacien } from '../../storage/schema';

const missionTypes = [
  ['REMPLACEMENT_OFFICINE', 'Remplacement officine'],
  ['GARDE', 'Garde'],
  ['CLINIQUE', 'Clinique'],
];

type SettingsCategory = 'general' | 'missions' | 'invoicing' | 'financial' | 'appearance' | 'data' | 'references';

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
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(null);

  useEffect(() => {
    setForm(appOptions);
    setTaxStatus(fiscalSettings.defaultTaxStatus);
    setUiSettingsForm(uiSettings);
    setLocalDataSettingsForm(localDataSettings);
  }, [state]);

  const validateForm = (): boolean => {
    if (form.missionDefaults.defaultBreakMinutes < 0 || form.missionDefaults.defaultBreakMinutes > 1440) {
      setToast({ severity: 'error', message: 'La pause doit être entre 0 et 1440 minutes.' });
      return false;
    }
    if (form.missionDefaults.mealThresholdHours < 0 || form.missionDefaults.mealThresholdHours > 24) {
      setToast({ severity: 'error', message: 'Le seuil de repas doit être entre 0 et 24 heures.' });
      return false;
    }
    if (form.missionDefaults.mealDefaultCents < 0) {
      setToast({ severity: 'error', message: 'Le montant de repas doit être positif.' });
      return false;
    }
    if (form.missionDefaults.mileageRateCents < 0) {
      setToast({ severity: 'error', message: 'Le taux de kilométrage doit être positif.' });
      return false;
    }
    if (form.invoiceDefaults.invoiceDueDays < 0 || form.invoiceDefaults.invoiceDueDays > 365) {
      setToast({ severity: 'error', message: 'Le délai de paiement doit être entre 0 et 365 jours.' });
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;
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
      setActiveCategory(null);
    } catch (error) {
      setToast({ severity: 'error', message: `Erreur lors de l'enregistrement.` });
    }
  };

  const handleCloseDrawer = () => {
    setActiveCategory(null);
  };

  return (
    <>
      {/* Main Page with Tiles */}
      <Stack spacing={3} sx={{ width: 'min(980px, 100%)', mx: 'auto', py: 4 }}>
        <Stack spacing={2}>
          <BackHomeButton to="/activity" data-testid="options-back-button" />
          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
              Paramètres
            </Typography>
            <Typography variant="h2">Options</Typography>
            <Typography color="text.secondary">
              Configurez vos paramètres par défaut et préférences.
            </Typography>
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
          <OptionActionCard
            title="Informations générales"
            description="Profil actif et statut fiscal."
            icon={<SettingsRoundedIcon />}
            iconTone="blue"
            onClick={() => setActiveCategory('general')}
            data-testid="options-card-general"
          />
          
          <OptionActionCard
            title="Missions"
            description="Paramètres par défaut pour les missions."
            icon={<PersonAddAltRoundedIcon />}
            iconTone="amber"
            onClick={() => setActiveCategory('missions')}
            data-testid="options-card-missions"
          />

          <OptionActionCard
            title="Facturation & PDF"
            description="Paramètres de facture et PDF."
            icon={<AddBusinessRoundedIcon />}
            iconTone="purple"
            onClick={() => setActiveCategory('invoicing')}
            data-testid="options-card-invoicing"
          />

          <OptionActionCard
            title="Financier & fiscalité"
            description="Réserve fiscale, acomptes, seuils."
            icon={<SettingsRoundedIcon />}
            iconTone="green"
            onClick={() => setActiveCategory('financial')}
            data-testid="options-card-financial"
          />

          <OptionActionCard
            title="Apparence"
            description="Thème et couleurs de l'application."
            icon={<SettingsRoundedIcon />}
            iconTone="gray"
            onClick={() => setActiveCategory('appearance')}
            data-testid="options-card-appearance"
          />

          <OptionActionCard
            title="Données locales"
            description="Sauvegarde et gestion des données."
            icon={<SettingsRoundedIcon />}
            iconTone="blue"
            onClick={() => setActiveCategory('data')}
            data-testid="options-card-data"
          />
          <OptionActionCard
            title="Pharmaciens & Pharmacies"
            description="Gérer les profils et les lieux de mission."
            icon={<LocalPharmacyRoundedIcon />}
            iconTone="purple"
            onClick={() => setActiveCategory('references')}
            data-testid="options-card-references"
          />
        </Box>
      </Stack>

      {/* General Settings Panel */}
      <SettingsModal
        
        open={activeCategory === 'general'}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        title="Informations générales"
        description="Profil actif et statut fiscal par défaut."
        icon={<SettingsRoundedIcon color="primary" />}
      >
        <Stack spacing={2}>
          <TextField
            label="Nom du pharmacien actif"
            value={currentActive?.nom ?? ''}
            disabled
            helperText="Sélectionné dans la section Pharmaciens"
            variant="outlined"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Statut fiscal par défaut"
            value={taxStatus === 'SMALL_SUPPLIER' ? 'Petit fournisseur' : 'Inscrit'}
            disabled
            helperText="Modifiable dans les paramètres financiers"
            variant="outlined"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </SettingsModal>

      {/* Missions Settings Panel */}
      <SettingsModal
        
        open={activeCategory === 'missions'}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        title="Missions"
        description="Paramètres par défaut pour la création de missions."
        icon={<PersonAddAltRoundedIcon color="primary" />}
      >
        <Stack spacing={2}>
          <FormControl>
            <InputLabel id="mission-type-label">Type de mission</InputLabel>
            <Select
              labelId="mission-type-label"
              value={form.missionDefaults.defaultMissionType ?? 'REMPLACEMENT_OFFICINE'}
              label="Type de mission"
              onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultMissionType: event.target.value } }))}
            >
              {missionTypes.map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Heure de début"
            type="time"
            value={form.missionDefaults.defaultStartTime ?? ''}
            onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultStartTime: event.target.value } }))}
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Heure de fin"
            type="time"
            value={form.missionDefaults.defaultEndTime ?? ''}
            onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultEndTime: event.target.value } }))}
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Pause (minutes)"
            type="number"
            value={form.missionDefaults.defaultBreakMinutes ?? ''}
            onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, defaultBreakMinutes: Number(event.target.value) } }))}
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Délai paiement (jours)"
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
            label="Seuil repas (heures)"
            type="number"
            value={form.missionDefaults.mealThresholdHours ?? ''}
            onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mealThresholdHours: Number(event.target.value) } }))}
            slotProps={{ htmlInput: { min: 0, step: 0.5 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Montant repas (cents)"
            type="number"
            value={form.missionDefaults.mealDefaultCents ?? ''}
            onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mealDefaultCents: Number(event.target.value) } }))}
            slotProps={{ htmlInput: { min: 0, step: 100 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Taux kilométrage (cents)"
            type="number"
            value={form.missionDefaults.mileageRateCents ?? ''}
            onChange={(event) => setForm(prev => ({ ...prev, missionDefaults: { ...prev.missionDefaults, mileageRateCents: Number(event.target.value) } }))}
            slotProps={{ htmlInput: { min: 0, step: 100 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
        </Stack>
      </SettingsModal>

      {/* Invoicing Settings Panel */}
      <SettingsModal
        
        open={activeCategory === 'invoicing'}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        title="Facturation & PDF"
        description="Paramètres de facture, conditions de paiement et génération PDF."
        icon={<AddBusinessRoundedIcon color="primary" />}
      >
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
            label="Titre événement calendrier"
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
            <InputLabel id="calendar-reminder-label">Rappel calendrier</InputLabel>
            <Select
              labelId="calendar-reminder-label"
              value={form.pdfCalendar.calendarReminder ?? 'NONE'}
              label="Rappel calendrier"
              onChange={(event) => setForm(prev => ({ ...prev, pdfCalendar: { ...prev.pdfCalendar, calendarReminder: event.target.value as 'NONE' | 'ONE_HOUR' | 'DAY_BEFORE' } }))}
            >
              <MenuItem value="NONE">Aucun</MenuItem>
              <MenuItem value="ONE_HOUR">1 heure avant</MenuItem>
              <MenuItem value="DAY_BEFORE">La veille</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </SettingsModal>

      {/* Financial Settings Panel */}
      <SettingsModal
        
        open={activeCategory === 'financial'}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        title="Financier & fiscalité"
        description="Réserve fiscale, acomptes provisionnels, seuils et suivi des dépenses."
        icon={<SettingsRoundedIcon color="primary" />}
      >
        <Stack spacing={2}>
          <TextField
            label="Taux de réserve fiscale (%)"
            type="number"
            value={fiscalSettings.reserveRate * 100}
            onChange={(event) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, reserveRate: Number(event.target.value) / 100 } }))}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Seuil petit fournisseur ($)"
            type="number"
            value={fiscalSettings.smallSupplierThresholdCents / 100}
            onChange={(event) => updateAppState(current => ({ ...current, fiscalSettings: { ...current.fiscalSettings, smallSupplierThresholdCents: Number(event.target.value) * 100 } }))}
            slotProps={{ htmlInput: { min: 0, step: 1000 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Seuil alerte petit fournisseur (%)"
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
            label="Inclure frais déductibles missions"
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
            label="Suivi acomptes provisionnels"
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
            label="Suivi dépenses manuelles"
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
            label="Suivre justificatifs"
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
                  <ToggleButton value={true}>Oui</ToggleButton>
                  <ToggleButton value={false}>Non</ToggleButton>
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
                  <ToggleButton value={true}>Oui</ToggleButton>
                  <ToggleButton value={false}>Non</ToggleButton>
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
                  <ToggleButton value={true}>Oui</ToggleButton>
                  <ToggleButton value={false}>Non</ToggleButton>
                </ToggleButtonGroup>
              }
              label="Annuelle"
            />
          </Stack>
        </Stack>
      </SettingsModal>

      {/* Appearance Settings Panel */}
      <SettingsModal
        
        open={activeCategory === 'appearance'}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        title="Apparence"
        description="Thème et couleurs de l'application."
        icon={<SettingsRoundedIcon color="primary" />}
      >
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
      </SettingsModal>

      {/* Data Settings Panel */}
      <SettingsModal
        
        open={activeCategory === 'data'}
        onClose={handleCloseDrawer}
        onSave={handleSave}
        title="Données locales"
        description="Sauvegarde automatique et gestion des données."
        icon={<SettingsRoundedIcon color="primary" />}
      >
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
            Gestion avancée
          </Button>
        </Stack>
      </SettingsModal>

      {/* References Modal */}
      <Dialog
        open={activeCategory === 'references'}
        onClose={() => setActiveCategory(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <LocalPharmacyRoundedIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
              Pharmaciens & Pharmacies
            </Typography>
            <IconButton onClick={() => setActiveCategory(null)} sx={{ p: 0.5 }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 1, overflowY: 'auto' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Gérez vos profils et lieux de mission.</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={2}>
            {/* Pharmacies Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Pharmacies ({state.pharmacies.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddBusinessRoundedIcon />}
              onClick={() => navigate('/pharmacy/add')}
              sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
            >
              Ajouter une pharmacie
            </Button>
            {state.pharmacies.length > 0 ? (
              <Stack spacing={1}>
                {state.pharmacies.map((pharmacie) => (
                  <Card key={pharmacie.id} variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body1">{pharmacie.nom}</Typography>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => navigate(`/pharmacy/add?id=${pharmacie.id}`)}
                          startIcon={<LocalPharmacyRoundedIcon />}
                        >
                          Modifier
                        </Button>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {pharmacie.adresse}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucune pharmacie enregistrée
              </Typography>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            {/* Pharmaciens Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Pharmaciens ({state.pharmaciens.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PersonAddAltRoundedIcon />}
              onClick={() => navigate('/pharmacien/new')}
              sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
            >
              Ajouter un pharmacien
            </Button>
            {state.pharmaciens.length > 0 ? (
              <Stack spacing={1}>
                {state.pharmaciens.map((pharmacien) => (
                  <Card key={pharmacien.id} variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body1">{pharmacien.nom}</Typography>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() => navigate(`/pharmacien/new?id=${pharmacien.id}`)}
                          startIcon={<PersonAddAltRoundedIcon />}
                        >
                          Modifier
                        </Button>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {pharmacien.adresse}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucun pharmacien enregistré
              </Typography>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </>
  );
}

// Reusable modal component
function SettingsModal({
  open,
  onClose,
  onSave,
  title,
  description,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            {title}
          </Typography>
          <IconButton onClick={onClose} sx={{ p: 0.5 }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 1, overflowY: 'auto' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
        <Divider sx={{ my: 1 }} />
        <Stack spacing={2}>
          {children}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 999, flex: 1 }}>
          Annuler
        </Button>
        <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={onSave} sx={{ borderRadius: 999, flex: 1 }}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

