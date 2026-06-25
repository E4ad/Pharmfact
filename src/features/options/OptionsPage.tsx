import React, { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import LocalPharmacyRoundedIcon from '@mui/icons-material/LocalPharmacyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { OptionActionCard } from '../../components/OptionActionCard';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { resetAppState, useAppState, updateAppState } from '../../storage/localStore';
import {
  activePharmacien,
  selectAppOptions,
  selectFinancialOptions,
  selectUiOptions,
  selectLocalDataOptions,
} from '../../storage/selectors';
import type {
  AppOptions,
  TaxStatus,
  UiSettings,
  LocalDataSettings,
  Pharmacie,
  Pharmacien,
} from '../../storage/schema';
import { PharmacieFormModal } from '../pharmacies/PharmacieFormModal';
import { PharmacienFormModal } from '../pharmaciens/PharmacienFormModal';
import { getPlatformAsync } from '../../services/platformService';
import {
  createBackup,
  downloadBackup,
  importBackup,
  loadBackupFromFile,
  type BackupResult,
} from '../../services/backupService';
import { formatBytes } from '../../services/formatting';
import { useNotifications } from '../../components/NotificationSystem';
import { buildDataHealthSummary } from '../../services/dataHealth';
import { formatAuditDate } from '../../services/auditTrail';
import { formatPharmacyWeeklySchedule, getPharmacyFranchiseLabel } from '../../services/pharmacyMetadata';
import {
  defaultRuntimeDesignTokenOverrides,
  normalizeRuntimeDesignTokenOverrides,
  type RuntimeDesignTokenOverrides,
  type RuntimeShadowIntensity,
} from '../../design-system/runtimeTokens';
import { spacingScale, spacingFractional } from '../../design-system/tokens';

const missionTypes = [
  ['REMPLACEMENT_OFFICINE', 'Remplacement officine'],
  ['GARDE', 'Garde'],
  ['CLINIQUE', 'Clinique'],
];

function RuntimeRadiusSlider({
  label,
  value,
  min,
  max,
  helperText,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  helperText: string;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={spacingScale.xs}>
      <Stack
        direction="row"
        spacing={spacingScale.xs}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {value}px
        </Typography>
      </Stack>
      <Slider
        value={value}
        min={min}
        max={max}
        step={1}
        valueLabelDisplay="auto"
        onChange={(_, nextValue) =>
          onChange(Number(Array.isArray(nextValue) ? nextValue[0] : nextValue))
        }
      />
      <Typography variant="caption" color="text.secondary">
        {helperText}
      </Typography>
    </Stack>
  );
}

function RuntimeBorderWidthSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();

  return (
    <Stack spacing={spacingScale.xs}>
      <Stack
        direction="row"
        spacing={spacingScale.xs}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Épaisseur des bordures
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {value}px
        </Typography>
      </Stack>
      <Slider
        value={value}
        min={0}
        max={2}
        step={0.5}
        valueLabelDisplay="auto"
        onChange={(_, nextValue) =>
          onChange(Number(Array.isArray(nextValue) ? nextValue[0] : nextValue))
        }
        sx={{
          '& .MuiSlider-thumb': {
            width: 18,
            height: 18,
            border: `${theme.runtimeTokens.borderWidth}px solid ${theme.palette.background.paper}`,
          },
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Inputs, boutons, cartes et tiroirs. Limité de 0 à 2px.
      </Typography>
    </Stack>
  );
}

function RuntimePrimaryHueSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={spacingScale.xs}>
      <Stack
        direction="row"
        spacing={spacingScale.xs}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Teinte de la couleur primaire
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {value}°
        </Typography>
      </Stack>
      <Slider
        value={value}
        min={0}
        max={359}
        step={1}
        valueLabelDisplay="auto"
        valueLabelFormat={(nextValue) => `${nextValue}°`}
        onChange={(_, nextValue) =>
          onChange(Number(Array.isArray(nextValue) ? nextValue[0] : nextValue))
        }
      />
      <Typography variant="caption" color="text.secondary">
        Change l’accent de l’application sans toucher aux factures ou au PDF.
      </Typography>
    </Stack>
  );
}

type SettingsCategory =
  | 'general'
  | 'missions'
  | 'invoicing'
  | 'financial'
  | 'appearance'
  | 'data'
  | 'references';

export function OptionsPage() {
  const [searchParams] = useSearchParams();
  const state = useAppState();
  const { notify } = useNotifications();
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentActive = activePharmacien(state);

  const appOptions = selectAppOptions(state);
  const fiscalSettings = selectFinancialOptions(state);
  const uiSettings = selectUiOptions(state);
  const localDataSettings = selectLocalDataOptions(state);
  const dataHealth = buildDataHealthSummary(state);
  const auditTrail = (state.ui.auditTrail ?? []).slice(0, 5);
  const [dataHealthFocus, setDataHealthFocus] = useState<'all' | 'duplicates' | 'orphans' | 'warnings' | 'errors'>('all');

  const [form, setForm] = useState<AppOptions>(() => appOptions);
  const [taxStatus, setTaxStatus] = useState<TaxStatus>(() => fiscalSettings.defaultTaxStatus);
  const [uiSettingsForm, setUiSettingsForm] = useState<UiSettings>(() => uiSettings);
  const [tokenOverridesForm, setTokenOverridesForm] = useState<RuntimeDesignTokenOverrides>(() =>
    normalizeRuntimeDesignTokenOverrides(uiSettings.designTokenOverrides),
  );
  const [localDataSettingsForm, setLocalDataSettingsForm] = useState<LocalDataSettings>(
    () => localDataSettings,
  );
  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(null);

  // Sync tokenOverridesForm with global state changes (e.g., from ThemeToolbar)
  useEffect(() => {
    setTokenOverridesForm(normalizeRuntimeDesignTokenOverrides(uiSettings.designTokenOverrides));
  }, [uiSettings.designTokenOverrides]);

  // States pour les modals de pharmacie et pharmacien
  const [pharmacieModalOpen, setPharmacieModalOpen] = useState(false);
  const [pharmacieModalId, setPharmacieModalId] = useState<string | undefined>();
  const [pharmacienModalOpen, setPharmacienModalOpen] = useState(false);
  const [pharmacienModalId, setPharmacienModalId] = useState<string | undefined>();
  const [resetOpen, setResetOpen] = useState(false);
  const [opqSyncing, setOpqSyncing] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [importResult, setImportResult] = useState<BackupResult | null>(null);

  useEffect(() => {
    setForm(appOptions);
    setTaxStatus(fiscalSettings.defaultTaxStatus);
    setUiSettingsForm(uiSettings);
    setTokenOverridesForm(normalizeRuntimeDesignTokenOverrides(uiSettings.designTokenOverrides));
    setLocalDataSettingsForm(localDataSettings);
  }, [state]);

  useEffect(() => {
    const panel = searchParams.get('panel');
    if (panel === 'data') setActiveCategory('data');
    if (panel === 'references') setActiveCategory('references');
    if (panel === 'missions') setActiveCategory('missions');
    if (panel === 'invoicing') setActiveCategory('invoicing');
    if (panel === 'financial') setActiveCategory('financial');
  }, [searchParams]);

  const visibleDataHealthIssues = dataHealth.issues.filter((issue) => {
    if (dataHealthFocus === 'all') return true;
    if (dataHealthFocus === 'duplicates') return issue.id.startsWith('duplicate');
    if (dataHealthFocus === 'orphans') return issue.id.startsWith('orphan');
    if (dataHealthFocus === 'warnings') return issue.severity === 'warning';
    return issue.severity === 'error';
  });

  const showToast = (toast: { severity: 'success' | 'error'; message: string }) => {
    notify({
      severity: toast.severity,
      message: toast.message,
      persist: toast.severity === 'error',
    });
  };

  const updateRuntimeRadius = (
    key: 'surfaceRadius' | 'controlRadius' | 'iconRadius',
    value: string,
  ) => {
    const parsed = Number(value);
    setTokenOverridesForm((current) =>
      normalizeRuntimeDesignTokenOverrides({
        ...current,
        [key]: Number.isFinite(parsed) ? parsed : current[key],
      }),
    );
  };

  const updateRuntimeBorderWidth = (value: string) => {
    const parsed = Number(value);
    setTokenOverridesForm((current) =>
      normalizeRuntimeDesignTokenOverrides({
        ...current,
        borderWidth: Number.isFinite(parsed)
          ? Math.min(Math.max(parsed, 0), 2)
          : current.borderWidth,
      }),
    );
  };

  const updateRuntimePrimaryHue = (value: string) => {
    const parsed = Number(value);
    setTokenOverridesForm((current) =>
      normalizeRuntimeDesignTokenOverrides({
        ...current,
        primaryHue: Number.isFinite(parsed) ? ((parsed % 360) + 360) % 360 : current.primaryHue,
      }),
    );
  };

  const updateRuntimeShadowIntensity = (value: RuntimeShadowIntensity | null) => {
    setTokenOverridesForm((current) =>
      normalizeRuntimeDesignTokenOverrides({
        ...current,
        shadowIntensity: value ?? current.shadowIntensity,
      }),
    );
  };

  const getRuntimeShadowIntensity = (): RuntimeShadowIntensity => {
    const value = tokenOverridesForm.shadowIntensity;
    if (value === 'none' || value === 'soft' || value === 'elevated') return value;
    return normalizeRuntimeDesignTokenOverrides().shadowIntensity;
  };

  const resetRuntimeTokens = () => {
    setTokenOverridesForm(defaultRuntimeDesignTokenOverrides);
  };

  const validateForm = (): boolean => {
    if (
      form.missionDefaults.defaultBreakMinutes < 0 ||
      form.missionDefaults.defaultBreakMinutes > 1440
    ) {
      showToast({ severity: 'error', message: 'La pause doit être entre 0 et 1440 minutes.' });
      return false;
    }
    if (
      form.missionDefaults.mealThresholdHours < 0 ||
      form.missionDefaults.mealThresholdHours > 24
    ) {
      showToast({
        severity: 'error',
        message: 'Le seuil de repas doit être entre 0 et 24 heures.',
      });
      return false;
    }
    if (form.missionDefaults.mealDefaultCents < 0) {
      showToast({ severity: 'error', message: 'Le montant de repas doit être positif.' });
      return false;
    }
    if (form.missionDefaults.mileageRateCents < 0) {
      showToast({ severity: 'error', message: 'Le taux de kilométrage doit être positif.' });
      return false;
    }
    if (form.invoiceDefaults.invoiceDueDays < 0 || form.invoiceDefaults.invoiceDueDays > 365) {
      showToast({
        severity: 'error',
        message: 'Le délai de paiement doit être entre 0 et 365 jours.',
      });
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
        uiSettings: {
          ...uiSettingsForm,
          designTokenOverrides: tokenOverridesForm,
        },
        localDataSettings: localDataSettingsForm,
      }));
      showToast({ severity: 'success', message: 'Paramètres enregistrés avec succès.' });
      setActiveCategory(null);
    } catch (error) {
      showToast({ severity: 'error', message: `Erreur lors de l'enregistrement.` });
    }
  };

  async function downloadExport() {
    setBackupBusy(true);
    setImportResult(null);
    try {
      const backup = createBackup(state);
      const saved = await downloadBackup(backup);
      if (saved) {
        showToast({
          severity: 'success',
          message: `Sauvegarde exportée (${formatBytes(backup.size)}).`,
        });
      }
    } catch {
      showToast({ severity: 'error', message: 'Export impossible. Veuillez réessayer.' });
    } finally {
      setBackupBusy(false);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = await loadBackupFromFile(file);
      setImportResult(parsed);
      if (!parsed.success) {
        showToast({ severity: 'error', message: 'Import impossible. Vérifiez le fichier JSON.' });
        return;
      }

      const platform = await getPlatformAsync();
      const confirmed = await platform.system.showConfirm(
        'Restaurer cette sauvegarde remplacera les données actuelles. Une sauvegarde de sécurité locale sera créée avant la restauration. Continuer ?',
      );
      if (!confirmed) return;

      setBackupBusy(true);
      const restored = await importBackup(parsed);
      setImportResult(restored);
      if (!restored.success) {
        showToast({ severity: 'error', message: restored.errors[0] || 'Restauration annulée.' });
        return;
      }

      showToast({ severity: 'success', message: 'Données restaurées avec succès.' });
      setActiveCategory(null);
      window.location.reload();
    } catch {
      showToast({
        severity: 'error',
        message: 'Import impossible. Vérifiez que le fichier JSON provient de cette application.',
      });
    } finally {
      setBackupBusy(false);
    }
  }

  function confirmReset() {
    resetAppState();
    setResetOpen(false);
    setActiveCategory(null);
    showToast({
      severity: 'success',
      message: 'Données réinitialisées avec les données de démonstration.',
    });
  }

  function exportAuditTrail() {
    const trail = state.ui.auditTrail ?? [];
    const blob = new Blob([JSON.stringify(trail, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({
      severity: 'success',
      message: `Journal exporté (${trail.length} événement${trail.length > 1 ? 's' : ''}).`,
    });
  }

  async function syncOpqRegistry() {
    setOpqSyncing(true);
    try {
      const platform = await getPlatformAsync();
      const entries = await platform.api.fetchOpqPharmacistRegistry();
      if (!entries.length) {
        showToast({ severity: 'error', message: 'Référentiel indisponible pour le moment.' });
        return;
      }

      updateAppState((current) => ({
        ...current,
        opqPharmacistRegistry: {
          entries,
          updatedAt: new Date().toISOString(),
          sourceUrl: 'https://www.opq.org/trouver-un-pharmacien/',
        },
      }));
      showToast({
        severity: 'success',
        message: `${entries.length} pharmaciens ajoutés au référentiel local.`,
      });
    } catch {
      showToast({ severity: 'error', message: 'Mise à jour du référentiel impossible.' });
    } finally {
      setOpqSyncing(false);
    }
  }

  return (
    <>
      {/* Page Shell - Common layout wrapper */}
      <Stack
        spacing={spacingScale.lg}
        sx={{
          width: 'min(1120px, 100%)',
          mx: 'auto',
          px: { xs: spacingScale.md, md: spacingScale.xl },
          py: { xs: spacingScale.md, md: spacingScale.xl },
        }}
      >
        {/* Hero Header - Options page */}
      <PageHeader
          eyebrow="Options"
          title="Options"
          description="Configurez vos préférences, référentiels et données locales."
          data-testid="options-page-header"
        />

        {/* Categories Section */}
        <PageSection title="Catégories de paramètres" spacing={'1.5'}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: spacingScale.md,
            }}
          >
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
              title="Factures & PDF"
              description="Paramètres de facture et PDF."
              icon={<AddBusinessRoundedIcon />}
              iconTone="purple"
              onClick={() => setActiveCategory('invoicing')}
              data-testid="options-card-invoicing"
            />

            <OptionActionCard
              title="Pilotage fiscal"
              description="Réserve fiscale, acomptes, seuils et exports."
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
              title="Référentiels"
              description="Gérer les profils pharmaciens et les pharmacies."
              icon={<LocalPharmacyRoundedIcon />}
              iconTone="purple"
              onClick={() => setActiveCategory('references')}
              data-testid="options-card-references"
            />
          </Box>
        </PageSection>
      </Stack>

      {/* General Settings Panel */}
      <SettingsModal
        open={activeCategory === 'general'}
        onClose={() => setActiveCategory(null)}
        onSave={handleSave}
        title="Informations générales"
        description="Profil actif et statut fiscal par défaut."
        icon={<SettingsRoundedIcon color="primary" />}
        testId="settings-modal-general"
      >
        <Stack spacing={spacingScale.md}>
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
        onClose={() => setActiveCategory(null)}
        onSave={handleSave}
        title="Missions"
        description="Paramètres par défaut pour la création de missions."
        icon={<PersonAddAltRoundedIcon color="primary" />}
        testId="settings-modal-missions"
      >
        <Stack spacing={spacingScale.md}>
          <FormControl>
            <InputLabel id="mission-type-label">Type de mission</InputLabel>
            <Select
              labelId="mission-type-label"
              value={form.missionDefaults.defaultMissionType ?? 'REMPLACEMENT_OFFICINE'}
              label="Type de mission"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  missionDefaults: {
                    ...prev.missionDefaults,
                    defaultMissionType: event.target.value,
                  },
                }))
              }
            >
              {missionTypes.map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Heure de début"
            type="time"
            value={form.missionDefaults.defaultStartTime ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                missionDefaults: { ...prev.missionDefaults, defaultStartTime: event.target.value },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Heure de fin"
            type="time"
            value={form.missionDefaults.defaultEndTime ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                missionDefaults: { ...prev.missionDefaults, defaultEndTime: event.target.value },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Pause (minutes)"
            type="number"
            value={form.missionDefaults.defaultBreakMinutes ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                missionDefaults: {
                  ...prev.missionDefaults,
                  defaultBreakMinutes: Number(event.target.value),
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Délai paiement (jours)"
            type="number"
            value={form.invoiceDefaults.invoiceDueDays ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                invoiceDefaults: {
                  ...prev.invoiceDefaults,
                  invoiceDueDays: Number(event.target.value),
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={form.missionDefaults.mealAutoEnabled ?? false}
                exclusive
                onChange={(event, value) =>
                  setForm((prev) => ({
                    ...prev,
                    missionDefaults: { ...prev.missionDefaults, mealAutoEnabled: value },
                  }))
                }
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
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                missionDefaults: {
                  ...prev.missionDefaults,
                  mealThresholdHours: Number(event.target.value),
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 0.5 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Montant repas (cents)"
            type="number"
            value={form.missionDefaults.mealDefaultCents ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                missionDefaults: {
                  ...prev.missionDefaults,
                  mealDefaultCents: Number(event.target.value),
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 100 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Taux kilométrage (cents)"
            type="number"
            value={form.missionDefaults.mileageRateCents ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                missionDefaults: {
                  ...prev.missionDefaults,
                  mileageRateCents: Number(event.target.value),
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 100 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
        </Stack>
      </SettingsModal>

      {/* Invoicing Settings Panel */}
      <SettingsModal
        open={activeCategory === 'invoicing'}
        onClose={() => setActiveCategory(null)}
        onSave={handleSave}
        title="Factures & PDF"
        description="Paramètres de facture, conditions de paiement et génération PDF."
        icon={<AddBusinessRoundedIcon color="primary" />}
        testId="settings-modal-invoicing"
      >
        <Stack spacing={spacingScale.md}>
          <TextField
            label="Mode de paiement"
            value={form.invoiceDefaults.paymentTerms ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                invoiceDefaults: { ...prev.invoiceDefaults, paymentTerms: event.target.value },
              }))
            }
            variant="outlined"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Conditions de paiement"
            value={form.invoiceDefaults.paymentTerms ?? ''}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                invoiceDefaults: { ...prev.invoiceDefaults, paymentTerms: event.target.value },
              }))
            }
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
                onChange={(event, value) =>
                  setForm((prev) => ({
                    ...prev,
                    pdfCalendar: { ...prev.pdfCalendar, pdfFooterEnabled: value },
                  }))
                }
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
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                pdfCalendar: { ...prev.pdfCalendar, calendarEventTitle: event.target.value },
              }))
            }
            variant="outlined"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={form.pdfCalendar.calendarIcsEnabled ?? false}
                exclusive
                onChange={(event, value) =>
                  setForm((prev) => ({
                    ...prev,
                    pdfCalendar: { ...prev.pdfCalendar, calendarIcsEnabled: value },
                  }))
                }
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
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pdfCalendar: {
                    ...prev.pdfCalendar,
                    calendarReminder: event.target.value as 'NONE' | 'ONE_HOUR' | 'DAY_BEFORE',
                  },
                }))
              }
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
        onClose={() => setActiveCategory(null)}
        onSave={handleSave}
        title="Pilotage fiscal"
        description="Réserve fiscale, acomptes provisionnels, seuils et suivi des dépenses."
        icon={<SettingsRoundedIcon color="primary" />}
        testId="settings-modal-financial"
      >
        <Stack spacing={spacingScale.md}>
          <TextField
            label="Taux de réserve fiscale (%)"
            type="number"
            value={fiscalSettings.reserveRate * 100}
            onChange={(event) =>
              updateAppState((current) => ({
                ...current,
                fiscalSettings: {
                  ...current.fiscalSettings,
                  reserveRate: Number(event.target.value) / 100,
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Seuil petit fournisseur ($)"
            type="number"
            value={fiscalSettings.smallSupplierThresholdCents / 100}
            onChange={(event) =>
              updateAppState((current) => ({
                ...current,
                fiscalSettings: {
                  ...current.fiscalSettings,
                  smallSupplierThresholdCents: Number(event.target.value) * 100,
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, step: 1000 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <TextField
            label="Seuil alerte petit fournisseur (%)"
            type="number"
            value={fiscalSettings.smallSupplierWarningRate * 100}
            onChange={(event) =>
              updateAppState((current) => ({
                ...current,
                fiscalSettings: {
                  ...current.fiscalSettings,
                  smallSupplierWarningRate: Number(event.target.value) / 100,
                },
              }))
            }
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 }, inputLabel: { shrink: true } }}
            variant="outlined"
          />
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={fiscalSettings.includeMissionDeductibleExpenses}
                exclusive
                onChange={(event, value) =>
                  updateAppState((current) => ({
                    ...current,
                    fiscalSettings: {
                      ...current.fiscalSettings,
                      includeMissionDeductibleExpenses: value,
                    },
                  }))
                }
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
                onChange={(event, value) =>
                  updateAppState((current) => ({
                    ...current,
                    fiscalSettings: { ...current.fiscalSettings, enableInstalmentTracking: value },
                  }))
                }
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
                onChange={(event, value) =>
                  updateAppState((current) => ({
                    ...current,
                    fiscalSettings: { ...current.fiscalSettings, enableExpenseTracking: value },
                  }))
                }
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
                onChange={(event, value) =>
                  updateAppState((current) => ({
                    ...current,
                    fiscalSettings: { ...current.fiscalSettings, trackExpenseReceipts: value },
                  }))
                }
              >
                <ToggleButton value={true}>Activé</ToggleButton>
                <ToggleButton value={false}>Désactivé</ToggleButton>
              </ToggleButtonGroup>
            }
            label="Suivre justificatifs"
          />
          <Typography variant="subtitle2" sx={{ mt: spacingScale.md, mb: spacingScale.sm }}>
            Vues financières
          </Typography>
          <Stack direction="row" spacing={spacingScale.md}>
            <FormControlLabel
              control={
                <ToggleButtonGroup
                  value={fiscalSettings.showMonthlyView}
                  exclusive
                  onChange={(event, value) =>
                    updateAppState((current) => ({
                      ...current,
                      fiscalSettings: { ...current.fiscalSettings, showMonthlyView: value },
                    }))
                  }
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
                  onChange={(event, value) =>
                    updateAppState((current) => ({
                      ...current,
                      fiscalSettings: { ...current.fiscalSettings, showQuarterlyView: value },
                    }))
                  }
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
                  onChange={(event, value) =>
                    updateAppState((current) => ({
                      ...current,
                      fiscalSettings: { ...current.fiscalSettings, showAnnualView: value },
                    }))
                  }
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
        onClose={() => setActiveCategory(null)}
        onSave={handleSave}
        title="Apparence"
        description="Thème et couleurs de l'application."
        icon={<SettingsRoundedIcon color="primary" />}
        testId="settings-modal-appearance"
      >
        <Stack spacing={spacingScale.md}>
          <FormControl>
            <InputLabel id="theme-mode-label">Mode d'affichage</InputLabel>
            <Select
              labelId="theme-mode-label"
              value={uiSettingsForm.themeMode}
              label="Mode d'affichage"
              onChange={(event) =>
                setUiSettingsForm((prev) => ({
                  ...prev,
                  themeMode: event.target.value as 'light' | 'dark' | 'system',
                }))
              }
            >
              <MenuItem value="light">Clair</MenuItem>
              <MenuItem value="dark">Sombre</MenuItem>
              <MenuItem value="system">Système</MenuItem>
            </Select>
          </FormControl>

          <Divider />

          <Stack spacing={spacingScale.md}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Laboratoire design tokens
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ajustez quelques tokens visuels et observez le changement immédiatement dans
              l'interface.
            </Typography>

            <Stack spacing={spacingScale.md}>
              <RuntimeRadiusSlider
                label="Rayon des surfaces"
                value={
                  tokenOverridesForm.surfaceRadius ??
                  normalizeRuntimeDesignTokenOverrides().surfaceRadius
                }
                min={0}
                max={24}
                helperText="Cartes, panels, dialogues, drawers et hero. Limité de 0 à 24px."
                onChange={(value) => updateRuntimeRadius('surfaceRadius', String(value))}
              />
              <RuntimeRadiusSlider
                label="Rayon des contrôles"
                value={
                  tokenOverridesForm.controlRadius ??
                  normalizeRuntimeDesignTokenOverrides().controlRadius
                }
                min={0}
                max={12}
                helperText="Boutons, inputs, selects, chips et statuts. Limité de 0 à 12px."
                onChange={(value) => updateRuntimeRadius('controlRadius', String(value))}
              />
              <RuntimeRadiusSlider
                label="Rayon des icônes"
                value={
                  tokenOverridesForm.iconRadius ?? normalizeRuntimeDesignTokenOverrides().iconRadius
                }
                min={0}
                max={12}
                helperText="Avatars et conteneurs d'icônes. Limité de 0 à 12px."
                onChange={(value) => updateRuntimeRadius('iconRadius', String(value))}
              />
              <RuntimeBorderWidthSlider
                value={
                  tokenOverridesForm.borderWidth ??
                  normalizeRuntimeDesignTokenOverrides().borderWidth
                }
                onChange={(value) => updateRuntimeBorderWidth(String(value))}
              />
              <RuntimePrimaryHueSlider
                value={
                  tokenOverridesForm.primaryHue ?? normalizeRuntimeDesignTokenOverrides().primaryHue
                }
                onChange={(value) => updateRuntimePrimaryHue(String(value))}
              />
              <FormControl>
                <Typography variant="body2" sx={{ mb: spacingScale.xs, fontWeight: 700 }}>
                  Intensité des ombres
                </Typography>
                <ToggleButtonGroup
                  value={getRuntimeShadowIntensity()}
                  exclusive
                  onChange={(_, value) => updateRuntimeShadowIntensity(value)}
                  fullWidth
                >
                  <ToggleButton value="none">Aucune</ToggleButton>
                  <ToggleButton value="soft">Douce</ToggleButton>
                  <ToggleButton value="elevated">Élevée</ToggleButton>
                </ToggleButtonGroup>
              </FormControl>
            </Stack>

            <SurfaceCard radius="settingsCard" contentSx={{ p: spacingScale.md }}>
              <Stack spacing={spacingScale.md}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Aperçu live
                </Typography>
                <Stack direction="row" spacing={spacingScale.xs} sx={{ flexWrap: 'wrap' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      borderRadius: theme.runtimeTokens.controlRadius,
                      bgcolor: 'action.hover',
                      px: spacingScale.xs,
                      py: spacingScale.xs,
                      fontWeight: 700,
                    }}
                  >
                    surface{' '}
                    {tokenOverridesForm.surfaceRadius ??
                      normalizeRuntimeDesignTokenOverrides().surfaceRadius}
                    px
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      borderRadius: theme.runtimeTokens.controlRadius,
                      bgcolor: 'action.hover',
                      px: spacingScale.xs,
                      py: spacingScale.xs,
                      fontWeight: 700,
                    }}
                  >
                    contrôle{' '}
                    {tokenOverridesForm.controlRadius ??
                      normalizeRuntimeDesignTokenOverrides().controlRadius}
                    px
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      borderRadius: theme.runtimeTokens.controlRadius,
                      bgcolor: 'action.hover',
                      px: spacingScale.xs,
                      py: spacingScale.xs,
                      fontWeight: 700,
                    }}
                  >
                    icône{' '}
                    {tokenOverridesForm.iconRadius ??
                      normalizeRuntimeDesignTokenOverrides().iconRadius}
                    px
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      borderRadius: theme.runtimeTokens.controlRadius,
                      bgcolor: 'action.hover',
                      px: spacingScale.xs,
                      py: spacingScale.xs,
                      fontWeight: 700,
                    }}
                  >
                    bordure{' '}
                    {tokenOverridesForm.borderWidth ??
                      normalizeRuntimeDesignTokenOverrides().borderWidth}
                    px
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      borderRadius: theme.runtimeTokens.controlRadius,
                      bgcolor: 'action.hover',
                      px: spacingScale.xs,
                      py: spacingScale.xs,
                      fontWeight: 700,
                    }}
                  >
                    teinte{' '}
                    {tokenOverridesForm.primaryHue ??
                      normalizeRuntimeDesignTokenOverrides().primaryHue}
                    °
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      borderRadius: theme.runtimeTokens.controlRadius,
                      bgcolor: 'action.hover',
                      px: spacingScale.xs,
                      py: spacingScale.xs,
                      fontWeight: 700,
                    }}
                  >
                    ombre {getRuntimeShadowIntensity()}
                  </Typography>
                </Stack>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={spacingScale.md}
                  sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: theme.runtimeTokens.iconRadius,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SettingsRoundedIcon />
                  </Box>
                  <Stack spacing={spacingScale.xs} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Surface + contrôle + icône
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Les valeurs sont appliquées au thème MUI et aux variables CSS.
                    </Typography>
                  </Stack>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={spacingScale.xs}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    <Button variant="contained" size="small">
                      Bouton
                    </Button>
                    <Button variant="outlined" size="small">
                      Secondaire
                    </Button>
                    <Box component="span" sx={{ alignSelf: 'center' }}>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{
                          borderRadius: theme.runtimeTokens.controlRadius,
                          bgcolor: 'success.light',
                          color: 'success.contrastText',
                          px: spacingScale.xs,
                          py: spacingScale.xs,
                          fontWeight: 700,
                        }}
                      >
                        Chip
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Stack>
            </SurfaceCard>

            <Button
              variant="outlined"
              onClick={resetRuntimeTokens}
              startIcon={<RestartAltRoundedIcon />}
            >
              Réinitialiser les tokens
            </Button>
          </Stack>
        </Stack>
      </SettingsModal>

      {/* Data Settings Panel */}
      <SettingsModal
        open={activeCategory === 'data'}
        onClose={() => setActiveCategory(null)}
        onSave={handleSave}
        title="Données locales"
        description="Sauvegarde automatique et gestion des données."
        icon={<SettingsRoundedIcon color="primary" />}
        testId="settings-modal-data"
      >
        <Stack spacing={spacingScale.md}>
          <SurfaceCard radius="settingsCard" contentSx={{ p: spacingScale.md }}>
            <Stack spacing={spacingScale.sm}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={spacingScale.md}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Santé des données
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dataHealth.overallStatus === 'critical'
                      ? 'Des incohérences bloquent la fiabilité des exports et des corrections.'
                      : dataHealth.overallStatus === 'watch'
                        ? 'Quelques points de vigilance sont détectés.'
                        : 'Aucune anomalie structurante détectée.'}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 750 }}>
                  {dataHealth.issues.length} alerte{dataHealth.issues.length > 1 ? 's' : ''}
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: spacingScale.xs,
                }}
              >
                <DataCount
                  label="Doublons"
                  value={
                    dataHealth.duplicatePharmacies +
                    dataHealth.duplicatePharmaciens +
                    dataHealth.duplicateInvoiceNumbers
                  }
                  onClick={
                    dataHealth.duplicatePharmacies +
                      dataHealth.duplicatePharmaciens +
                      dataHealth.duplicateInvoiceNumbers >
                    0
                      ? () => setDataHealthFocus('duplicates')
                      : undefined
                  }
                />
                <DataCount
                  label="Orphelins"
                  value={dataHealth.orphanMissions + dataHealth.orphanInvoices}
                  onClick={
                    dataHealth.orphanMissions + dataHealth.orphanInvoices > 0
                      ? () => setDataHealthFocus('orphans')
                      : undefined
                  }
                />
                <DataCount
                  label="Avertis."
                  value={dataHealth.validationWarnings}
                  onClick={dataHealth.validationWarnings > 0 ? () => setDataHealthFocus('warnings') : undefined}
                />
                <DataCount
                  label="Erreurs"
                  value={dataHealth.validationErrors}
                  onClick={dataHealth.validationErrors > 0 ? () => setDataHealthFocus('errors') : undefined}
                />
              </Box>
              {visibleDataHealthIssues.length ? (
                <Stack spacing={spacingScale.xs}>
                  {visibleDataHealthIssues.slice(0, 3).map((issue) => (
                    <Typography
                      key={issue.id}
                      variant="body2"
                      color={issue.severity === 'error' ? 'error.main' : 'text.secondary'}
                    >
                      {issue.title}: {issue.detail}
                    </Typography>
                  ))}
                </Stack>
              ) : null}
              <Divider />
              <Stack spacing={spacingScale.xs}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Historique récent
                </Typography>
                {auditTrail.length ? (
                  <Stack spacing={spacingScale.xs}>
                    {auditTrail.map((entry) => (
                      <Stack
                        key={entry.id}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 750 }}>
                            {entry.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {entry.detail}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatAuditDate(entry.eventDate)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucun événement enregistré.
                  </Typography>
                )}
              </Stack>
            </Stack>
          </SurfaceCard>
          <FormControlLabel
            control={
              <ToggleButtonGroup
                value={localDataSettingsForm.autoBackupEnabled}
                exclusive
                onChange={(event, value) =>
                  setLocalDataSettingsForm((prev) => ({ ...prev, autoBackupEnabled: value }))
                }
              >
                <ToggleButton value={true}>Activé</ToggleButton>
                <ToggleButton value={false}>Désactivé</ToggleButton>
              </ToggleButtonGroup>
            }
            label="Sauvegarde automatique"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button
              variant="outlined"
              startIcon={<SaveRoundedIcon />}
              onClick={exportAuditTrail}
              disabled={(state.ui.auditTrail?.length ?? 0) === 0}
            >
              Exporter le journal
            </Button>
          </Box>
          <Divider />
          {importResult ? (
            <Alert
              severity={importResult.success ? 'success' : 'error'}
              onClose={() => setImportResult(null)}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {importResult.success ? 'Sauvegarde compatible' : 'Sauvegarde refusée'}
              </Typography>
              <Typography variant="caption" component="div">
                Version {importResult.fromVersion} → {importResult.toVersion}
              </Typography>
              {importResult.warnings.length ? (
                <Typography variant="caption" component="div" color="warning.main">
                  {importResult.warnings.length} avertissement(s) détecté(s).
                </Typography>
              ) : null}
              {importResult.errors.length ? (
                <Typography variant="caption" component="div">
                  {importResult.errors[0]}
                </Typography>
              ) : null}
            </Alert>
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: spacingScale.md,
            }}
          >
            <DataAction
              title="Exporter"
              description="Télécharger une sauvegarde JSON complète."
              icon={<DownloadRoundedIcon />}
              action={
                <Button
                  variant="contained"
                  startIcon={
                    backupBusy ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : (
                      <DownloadRoundedIcon />
                    )
                  }
                  onClick={downloadExport}
                  disabled={backupBusy}
                >
                  Exporter
                </Button>
              }
            />
            <DataAction
              title="Importer"
              description="Restaurer une sauvegarde compatible après validation."
              icon={<UploadRoundedIcon />}
              action={
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={importFile}
                  />
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={
                      backupBusy ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : (
                        <UploadRoundedIcon />
                      )
                    }
                    onClick={() => fileInputRef.current?.click()}
                    disabled={backupBusy}
                  >
                    Importer
                  </Button>
                </>
              }
            />
            <DataAction
              title="Réinitialiser"
              description="Recharger les données de démonstration."
              icon={<RestartAltRoundedIcon />}
              action={
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RestartAltRoundedIcon />}
                  onClick={() => setResetOpen(true)}
                >
                  Réinitialiser
                </Button>
              }
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
              gap: spacingScale.md,
            }}
          >
            <DataCount label="Pharmaciens" value={state.pharmaciens.length} />
            <DataCount label="Pharmacies" value={state.pharmacies.length} />
            <DataCount label="Missions" value={state.missions.length} />
            <DataCount label="Factures" value={state.invoices.length} />
            <DataCount label="Acomptes" value={state.taxPayments.length} />
          </Box>
          <DataAction
            title="Référentiel OPQ"
            description={
              state.opqPharmacistRegistry.updatedAt
                ? `${state.opqPharmacistRegistry.entries.length} pharmaciens · Mis à jour le ${state.opqPharmacistRegistry.updatedAt.slice(0, 10)}`
                : 'Permet de vérifier localement l’existence d’un pharmacien par numéro de permis.'
            }
            icon={<SettingsRoundedIcon />}
            action={
              <Button
                variant="outlined"
                startIcon={
                  opqSyncing ? (
                    <CircularProgress color="inherit" size={18} />
                  ) : (
                    <RestartAltRoundedIcon />
                  )
                }
                onClick={() => syncOpqRegistry().catch(() => {})}
                disabled={opqSyncing}
              >
                {opqSyncing ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            }
          />
        </Stack>
      </SettingsModal>

      {/* References Modal */}
      <Dialog
        open={activeCategory === 'references'}
        onClose={() => setActiveCategory(null)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="references-dialog-title"
        aria-describedby="references-dialog-description"
        data-testid="settings-modal-references"
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
        <DialogTitle sx={{ p: spacingScale.lg, pb: 0 }}>
          <Stack direction="row" spacing={spacingScale.sm} sx={{ alignItems: 'center' }}>
            <LocalPharmacyRoundedIcon color="primary" />
            <Typography
              id="references-dialog-title"
              variant="h6"
              sx={{ fontWeight: 600, flexGrow: 1 }}
            >
              Référentiels
            </Typography>
            <IconButton
              aria-label="Fermer"
              onClick={() => setActiveCategory(null)}
              sx={{ p: spacingFractional['0.5'] }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: spacingScale.lg, pt: spacingScale.sm, overflowY: 'auto' }}>
          <Typography
            id="references-dialog-description"
            variant="body2"
            color="text.secondary"
            sx={{ mb: spacingScale.md }}
          >
            Gérez vos profils et lieux de mission.
          </Typography>
          <Divider sx={{ my: spacingScale.sm }} />
          <Stack spacing={spacingScale.md}>
            {/* Pharmacies Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Pharmacies ({state.pharmacies.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddBusinessRoundedIcon />}
              onClick={() => {
                setPharmacieModalId(undefined);
                setPharmacieModalOpen(true);
              }}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="options-add-pharmacy-button"
            >
              Ajouter une pharmacie
            </Button>
            {state.pharmacies.length > 0 ? (
              <Stack spacing={spacingScale.xs}>
                {state.pharmacies.map((pharmacie) => (
                  <SurfaceCard key={pharmacie.id} contentSx={{ p: spacingScale.md }}>
                    <Stack
                      direction="row"
                      spacing={spacingScale.xs}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Typography variant="body1">{pharmacie.nom}</Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => {
                          setPharmacieModalId(pharmacie.id);
                          setPharmacieModalOpen(true);
                        }}
                        startIcon={<LocalPharmacyRoundedIcon />}
                        data-testid={`options-edit-pharmacy-${pharmacie.id}`}
                      >
                        Modifier
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {pharmacie.adresse}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getPharmacyFranchiseLabel(pharmacie)}
                      {formatPharmacyWeeklySchedule(pharmacie.weeklySchedule) ? ` · ${formatPharmacyWeeklySchedule(pharmacie.weeklySchedule)}` : ''}
                    </Typography>
                  </SurfaceCard>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucune pharmacie enregistrée
              </Typography>
            )}

            <Divider sx={{ my: spacingScale.md }} />

            {/* Pharmaciens Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Pharmaciens ({state.pharmaciens.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<PersonAddAltRoundedIcon />}
              onClick={() => {
                setPharmacienModalId(undefined);
                setPharmacienModalOpen(true);
              }}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="options-add-pharmacien-button"
            >
              Ajouter un pharmacien
            </Button>
            {state.pharmaciens.length > 0 ? (
              <Stack spacing={spacingScale.xs}>
                {state.pharmaciens.map((pharmacien) => (
                  <SurfaceCard key={pharmacien.id} contentSx={{ p: spacingScale.md }}>
                    <Stack
                      direction="row"
                      spacing={spacingScale.xs}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Typography variant="body1">{pharmacien.nom}</Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => {
                          setPharmacienModalId(pharmacien.id);
                          setPharmacienModalOpen(true);
                        }}
                        startIcon={<PersonAddAltRoundedIcon />}
                        data-testid={`options-edit-pharmacien-${pharmacien.id}`}
                      >
                        Modifier
                      </Button>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {pharmacien.adresse}
                    </Typography>
                  </SurfaceCard>
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

      {/* Pharmacie Form Modal */}
      <PharmacieFormModal
        open={pharmacieModalOpen}
        onClose={() => setPharmacieModalOpen(false)}
        pharmacieId={pharmacieModalId}
      />

      {/* Pharmacien Form Modal */}
      <PharmacienFormModal
        open={pharmacienModalOpen}
        onClose={() => setPharmacienModalOpen(false)}
        pharmacienId={pharmacienModalId}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Réinitialiser les données ?"
        description="Toutes vos données locales seront remplacées par les données de démonstration."
        confirmLabel="Réinitialiser"
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
      />
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
  testId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  const theme = useTheme();
  const titleId = `settings-modal-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-title`;
  const descriptionId = `${titleId}-description`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-testid={testId}
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
        backdrop: {
          sx: { pointerEvents: 'none' },
        },
      }}
    >
      <DialogTitle sx={{ p: spacingScale.lg, pb: 0 }}>
        <Stack direction="row" spacing={spacingScale.sm} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography id={titleId} variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
            {title}
          </Typography>
          <IconButton aria-label="Fermer" onClick={onClose} sx={{ p: spacingFractional['0.5'] }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: spacingScale.lg, pt: spacingScale.sm, overflowY: 'auto' }}>
        <Typography
          id={descriptionId}
          variant="body2"
          color="text.secondary"
          sx={{ mb: spacingScale.md }}
        >
          {description}
        </Typography>
        <Divider sx={{ my: spacingScale.sm }} />
        <Stack spacing={spacingScale.sm}>{children}</Stack>
      </DialogContent>
      <DialogActions sx={{ p: spacingScale.lg, pt: 0 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ borderRadius: theme.runtimeTokens.controlRadius, flex: 1 }}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          onClick={onSave}
          sx={{ borderRadius: theme.runtimeTokens.controlRadius, flex: 1 }}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DataAction({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <SurfaceCard radius="settingsCard" contentSx={{ p: spacingScale.md }}>
      <Stack spacing={spacingScale.md} sx={{ minHeight: 140, justifyContent: 'space-between' }}>
        <Stack spacing={spacingFractional['0.5']}>
          {icon && (
            <Box
              sx={{
                width: 24,
                height: 24,
                color: 'primary.main',
                mb: spacingFractional['0.5'],
              }}
            >
              {icon}
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Stack>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>{action}</Box>
      </Stack>
    </SurfaceCard>
  );
}

function DataCount({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const content = (
    <Stack spacing={spacingFractional['0.5']}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  );

  return (
    <SurfaceCard
      radius="settingsCard"
      contentSx={{ p: spacingFractional['1.5'], textAlign: 'center' }}
    >
      {onClick ? (
        <ButtonBase
          onClick={onClick}
          sx={{
            width: '100%',
            borderRadius: 1.5,
            py: 0.5,
            textAlign: 'inherit',
            justifyContent: 'center',
          }}
        >
          {content}
        </ButtonBase>
      ) : (
        content
      )}
    </SurfaceCard>
  );
}
