import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, InputLabel, IconButton, MenuItem, Select, Stack, TextField, Typography, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { FormEvent, useState, useEffect } from 'react';
import { PharmacyRegistryAutocompleteInput } from '../../components/PharmacyRegistryAutocompleteInput';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacie, PharmacyFranchise, Weekday } from '../../storage/schema';
import { createId } from '../../services/ids';
import { getPlatform } from '../../services/platformService';
import { buildSantePharmacyNotes, getSantePharmacyAddressParts, type SantePharmacyRegistryEntry } from '../../services/santePharmacyRegistry';
import { findDuplicatePharmacy } from '../../services/entityDuplicates';
import { geocodeEntityAddressIfNeeded } from '../../services/distanceService';
import {
  createClosedWeeklySchedule,
  detectPharmacyFranchise,
  extractSanteQuebecWeeklyScheduleFromNotes,
  extractWeeklyScheduleFromNotes,
  normalizePharmacyWeeklySchedule,
  pharmacyFranchiseLabels,
  pharmacyWeekdayLabels,
  pharmacyWeekdays,
} from '../../services/pharmacyMetadata';

interface PharmacieFormModalProps {
  open: boolean;
  onClose: () => void;
  pharmacieId?: string;
  onSaved?: (pharmacie: Pharmacie) => void;
}

export function PharmacieFormModal({ open, onClose, pharmacieId, onSaved }: PharmacieFormModalProps) {
  const theme = useTheme();
  const state = useAppState();
  const existingPharmacie = pharmacieId ? state.pharmacies.find(p => p.id === pharmacieId) : undefined;
  const formId = 'pharmacie-modal-form';

  const [form, setForm] = useState({
    nom: '',
    displayLabel: '',
    adresse: '',
    codePostal: '',
    ville: '',
    rue: '',
    numero: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    geocodedAt: undefined as string | undefined,
    geocodedAddressHash: undefined as string | undefined,
    telephone: '',
    email: '',
    billingContactName: '',
    billingEmail: '',
    billingPhone: '',
    usualHourlyRate: '',
    paymentTerms: '',
    distanceKm: '',
    defaultBreakMinutes: '60',
    franchise: 'unknown' as PharmacyFranchise,
    franchiseLabel: '',
    weeklySchedule: createClosedWeeklySchedule({ source: 'manual' }),
    notes: ''
  });

  // Charger les données existantes si on est en mode édition
  useEffect(() => {
    if (existingPharmacie) {
      const detected = detectPharmacyFranchise(existingPharmacie.displayLabel || existingPharmacie.nom);
      setForm({
        nom: existingPharmacie.nom || '',
        displayLabel: existingPharmacie.displayLabel || existingPharmacie.nom || '',
        adresse: existingPharmacie.adresse || '',
        codePostal: existingPharmacie.codePostal || '',
        ville: existingPharmacie.ville || '',
        rue: existingPharmacie.rue || '',
        numero: existingPharmacie.numero || '',
        lat: existingPharmacie.lat,
        lng: existingPharmacie.lng,
        geocodedAt: existingPharmacie.geocodedAt,
        geocodedAddressHash: existingPharmacie.geocodedAddressHash,
        telephone: existingPharmacie.telephone || '',
        email: existingPharmacie.email || '',
        billingContactName: existingPharmacie.billingContactName || '',
        billingEmail: existingPharmacie.billingEmail || '',
        billingPhone: existingPharmacie.billingPhone || '',
        usualHourlyRate: existingPharmacie.usualHourlyRateCents ? String(existingPharmacie.usualHourlyRateCents / 100) : '',
        paymentTerms: existingPharmacie.paymentTerms || '',
        distanceKm: existingPharmacie.distanceKm ? String(existingPharmacie.distanceKm) : '',
        defaultBreakMinutes: String(existingPharmacie.defaultBreakMinutes || '60'),
        franchise: existingPharmacie.franchise || detected.franchise,
        franchiseLabel: existingPharmacie.franchiseLabel || detected.label,
        weeklySchedule: existingPharmacie.weeklySchedule || createClosedWeeklySchedule({ source: 'manual' }),
        notes: existingPharmacie.notes || ''
      });
    } else {
      // Réinitialiser le formulaire si on ajoute une nouvelle pharmacie
      setForm({
        nom: '',
        displayLabel: '',
        adresse: '',
        codePostal: '',
        ville: '',
        rue: '',
        numero: '',
        lat: undefined,
        lng: undefined,
        geocodedAt: undefined,
        geocodedAddressHash: undefined,
        telephone: '',
        email: '',
        billingContactName: '',
        billingEmail: '',
        billingPhone: '',
        usualHourlyRate: '',
        paymentTerms: '',
        distanceKm: '',
        defaultBreakMinutes: '60',
        franchise: 'unknown',
        franchiseLabel: '',
        weeklySchedule: createClosedWeeklySchedule({ source: 'manual' }),
        notes: ''
      });
    }
  }, [pharmacieId, existingPharmacie]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...((field === 'nom' || field === 'displayLabel') && (current.franchise === 'unknown' || !current.franchise)
        ? (() => {
            const detected = detectPharmacyFranchise(value || current.displayLabel || current.nom);
            return { franchise: detected.franchise, franchiseLabel: detected.label };
          })()
        : {}),
      ...(field === 'adresse' || field === 'ville' || field === 'codePostal'
        ? { lat: undefined, lng: undefined, geocodedAt: undefined, geocodedAddressHash: undefined }
        : {}),
    }));
  }

  function updateWeeklyDay(day: Weekday, patch: Partial<{ enabled: boolean; startTime: string; endTime: string }>) {
    setForm((current) => ({
      ...current,
      weeklySchedule: {
        ...current.weeklySchedule,
        [day]: {
          ...current.weeklySchedule[day],
          ...patch,
          startTime: patch.enabled === false ? undefined : patch.startTime ?? current.weeklySchedule[day].startTime,
          endTime: patch.enabled === false ? undefined : patch.endTime ?? current.weeklySchedule[day].endTime,
        },
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function selectRegistryPharmacy(pharmacy: SantePharmacyRegistryEntry) {
    const address = getSantePharmacyAddressParts(pharmacy);
    const registryNotes = buildSantePharmacyNotes(pharmacy);
    const detected = detectPharmacyFranchise(pharmacy.name);
    const detectedSchedule = extractSanteQuebecWeeklyScheduleFromNotes(registryNotes) ?? extractWeeklyScheduleFromNotes(registryNotes);
    setForm((current) => ({
      ...current,
      nom: pharmacy.name,
      displayLabel: pharmacy.name,
      adresse: address.adresse,
      ville: address.ville,
      codePostal: address.codePostal,
      rue: address.rue || '',
      numero: address.numero || '',
      telephone: address.telephone || current.telephone,
      lat: address.lat,
      lng: address.lng,
      geocodedAt: address.lat && address.lng ? new Date().toISOString() : undefined,
      geocodedAddressHash: undefined,
      franchise: current.franchise === 'unknown' ? detected.franchise : current.franchise,
      franchiseLabel: current.franchise === 'unknown' ? detected.label : current.franchiseLabel,
      weeklySchedule: detectedSchedule || current.weeklySchedule,
      notes: registryNotes || current.notes,
    }));
  }

  const duplicatePharmacy = findDuplicatePharmacy(state.pharmacies, {
    nom: form.nom,
    displayLabel: form.displayLabel,
    adresse: form.adresse,
    ville: form.ville,
    codePostal: form.codePostal,
  }, existingPharmacie?.id);

  async function handleDelete() {
    if (!existingPharmacie) return;
    const confirmed = await getPlatform().system.showConfirm(`Voulez-vous vraiment supprimer la pharmacie "${existingPharmacie.nom}" ?`);
    if (confirmed) {
      updateAppState((state) => ({
        ...state,
        pharmacies: state.pharmacies.filter(p => p.id !== existingPharmacie.id)
      }));
      onClose();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) return;
    if (duplicatePharmacy) return;

    const weeklySchedule = normalizePharmacyWeeklySchedule(form.weeklySchedule);
    const franchiseLabel = form.franchise === 'other'
      ? form.franchiseLabel.trim() || pharmacyFranchiseLabels.other
      : pharmacyFranchiseLabels[form.franchise];

    const pharmacie: Pharmacie = await geocodeEntityAddressIfNeeded({
      id: existingPharmacie?.id || createId('pha'),
      nom: form.nom.trim(),
      displayLabel: form.displayLabel.trim() || form.nom.trim(),
      adresse: form.adresse.trim(),
      rue: form.rue.trim() || undefined,
      numero: form.numero.trim() || undefined,
      codePostal: form.codePostal.trim(),
      ville: form.ville.trim(),
      lat: form.lat,
      lng: form.lng,
      geocodedAt: form.geocodedAt,
      geocodedAddressHash: form.geocodedAddressHash,
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      billingContactName: form.billingContactName.trim() || undefined,
      billingEmail: form.billingEmail.trim() || undefined,
      billingPhone: form.billingPhone.trim() || undefined,
      usualHourlyRateCents: form.usualHourlyRate ? Math.round(Number(form.usualHourlyRate.replace(',', '.')) * 100) : undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      distanceKm: form.distanceKm ? Number(form.distanceKm.replace(',', '.')) : undefined,
      defaultBreakMinutes: Math.max(Number(form.defaultBreakMinutes) || 0, 0),
      franchise: form.franchise,
      franchiseLabel,
      weeklySchedule,
      isFavorite: existingPharmacie?.isFavorite ?? false,
      favoriteRank: existingPharmacie?.favoriteRank,
      lastUsedAt: existingPharmacie?.lastUsedAt,
      notes: form.notes.trim(),
    }, existingPharmacie);

    updateAppState((state) => {
      const updatedPharmacies = existingPharmacie
        ? state.pharmacies.map(p => p.id === existingPharmacie.id ? pharmacie : p)
        : [...state.pharmacies, pharmacie];
      return { ...state, pharmacies: updatedPharmacies };
    });
    onSaved?.(pharmacie);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="pharmacy-form-title"
      aria-describedby="pharmacy-form-description"
      data-testid="pharmacie-form-modal"
      slotProps={{
        paper: {
          sx: {
            maxHeight: '90vh',
            width: { xs: '100%', sm: 620, md: 720 },
            zIndex: 1400,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0, position: 'relative' }}>
        <Typography id="pharmacy-form-title" variant="h6" sx={{ fontWeight: 600 }}>
          {existingPharmacie ? 'Modifier la pharmacie' : 'Ajouter une pharmacie'}
        </Typography>
        <IconButton
          aria-label="Fermer"
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, p: 0.5 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 0, overflowY: 'auto', flex: 1 }}>
        <Typography id="pharmacy-form-description" variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Complétez les informations utilisées pour les missions et les factures.
        </Typography>
        {existingPharmacie && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Modification de : {existingPharmacie.nom}
          </Alert>
        )}
        <Stack id={formId} component="form" onSubmit={submit} spacing={3}>
          <Typography variant="h4" sx={{ mt: 1 }}>Informations générales</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <PharmacyRegistryAutocompleteInput
              label="Nom officiel ou adresse de la pharmacie *"
              value={form.nom}
              onChange={(value) => update('nom', value)}
              onSelect={selectRegistryPharmacy}
              required
            />
            <TextField
              label="Dénomination affichée *"
              value={form.displayLabel}
              onChange={(event) => update('displayLabel', event.target.value)}
              helperText="Nom court utilisé dans l’app et sur les factures."
              required
            />
            {duplicatePharmacy ? (
              <Alert severity="warning" sx={{ gridColumn: '1 / -1' }}>
                Cette pharmacie semble déjà exister : {duplicatePharmacy.displayLabel || duplicatePharmacy.nom}.
              </Alert>
            ) : null}
            <Box sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}>
              <PharmacyRegistryAutocompleteInput
                label="Adresse"
                value={form.adresse}
                onChange={(value) => update('adresse', value)}
                onSelect={selectRegistryPharmacy}
              />
            </Box>
            <TextField label="Code postal" value={form.codePostal} onChange={(e) => update('codePostal', e.target.value)} />
            <TextField label="Ville" value={form.ville} onChange={(e) => update('ville', e.target.value)} />
            <TextField label="Téléphone" value={form.telephone} onChange={(e) => update('telephone', e.target.value)} />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            <TextField label="Contact facturation" value={form.billingContactName} onChange={(e) => update('billingContactName', e.target.value)} />
            <TextField label="Email facturation" type="email" value={form.billingEmail} onChange={(e) => update('billingEmail', e.target.value)} />
            <TextField label="Téléphone facturation" value={form.billingPhone} onChange={(e) => update('billingPhone', e.target.value)} />
            <FormControl>
              <InputLabel id="pharmacy-franchise-label">Bannière</InputLabel>
              <Select
                labelId="pharmacy-franchise-label"
                label="Bannière"
                value={form.franchise}
                onChange={(event) => update('franchise', event.target.value)}
              >
                {Object.entries(pharmacyFranchiseLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {form.franchise === 'other' ? (
              <TextField label="Bannière personnalisée" value={form.franchiseLabel} onChange={(e) => update('franchiseLabel', e.target.value)} />
            ) : null}
            <TextField label="Taux horaire habituel" type="number" value={form.usualHourlyRate} onChange={(e) => update('usualHourlyRate', e.target.value)} />
            <TextField label="Distance habituelle (km)" type="number" value={form.distanceKm} onChange={(e) => update('distanceKm', e.target.value)} />
            <Typography variant="subtitle2" sx={{ gridColumn: '1 / -1', mt: 1, fontWeight: 800 }}>
              Horaires habituels
            </Typography>
            <Box sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.1fr 0.7fr 1fr 1fr' }, gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Jour</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Ouvert</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Début</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Fin</Typography>
              {pharmacyWeekdays.map((day) => (
                <Box key={day} sx={{ display: 'contents' }}>
                  <Typography variant="body2" sx={{ alignSelf: 'center' }}>{pharmacyWeekdayLabels[day]}</Typography>
                  <Checkbox
                    checked={form.weeklySchedule[day].enabled}
                    onChange={(event) => updateWeeklyDay(day, { enabled: event.target.checked })}
                    slotProps={{ input: { 'aria-label': `${pharmacyWeekdayLabels[day]} ouvert` } }}
                    sx={{ justifySelf: 'flex-start' }}
                  />
                  <TextField size="small" type="time" value={form.weeklySchedule[day].startTime || ''} disabled={!form.weeklySchedule[day].enabled} onChange={(event) => updateWeeklyDay(day, { startTime: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField size="small" type="time" value={form.weeklySchedule[day].endTime || ''} disabled={!form.weeklySchedule[day].enabled} onChange={(event) => updateWeeklyDay(day, { endTime: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
                </Box>
              ))}
            </Box>
            {form.weeklySchedule.sourceLabel === 'Horaire Santé Québec' ? (
              <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
                Horaire importé depuis les notes Santé Québec. À vérifier.
              </Typography>
            ) : null}
            <TextField label="Conditions de paiement" value={form.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} multiline minRows={2} sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }} />
            <TextField label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} multiline minRows={4} sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        {existingPharmacie && (
          <Button variant="outlined" color="error" onClick={() => handleDelete().catch(() => {})} startIcon={<CloseRoundedIcon />}>
            Supprimer
          </Button>
        )}
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
          Annuler
        </Button>
        <Button variant="contained" type="submit" form={formId} startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim() || Boolean(duplicatePharmacy)} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
          {existingPharmacie ? 'Enregistrer les modifications' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
