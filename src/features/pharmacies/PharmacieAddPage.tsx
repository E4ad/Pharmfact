import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { Box, Button, Stack, TextField, Typography, Alert, IconButton, Tooltip, FormControl, InputLabel, MenuItem, Select, Checkbox } from '@mui/material';
import { FormEvent, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createId } from '../../services/ids';
import { PharmacyRegistryAutocompleteInput } from '../../components/PharmacyRegistryAutocompleteInput';
import { PageHeader } from '../../components/PageHeader';
import { NotFoundState } from '../../components/NotFoundState';
import { SurfaceCard } from '../../components/SurfaceCard';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacie, PharmacyFranchise, Weekday } from '../../storage/schema';
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

export function PharmacieAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const state = useAppState();
  const existingPharmacie = state.pharmacies.find(p => p.id === id);
  const missingPharmacie = Boolean(id && !existingPharmacie);
  
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
    }
  }, [id, existingPharmacie]);

  if (missingPharmacie) {
    return (
      <NotFoundState
        title="Pharmacie introuvable"
        description="La pharmacie demandée n’existe plus dans les données locales."
        actionLabel="Retour aux référentiels"
        actionTo="/options?panel=references"
      />
    );
  }

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

  const handleDelete = useCallback(async () => {
    if (!existingPharmacie) return;
    const confirmed = await getPlatform().system.showConfirm(`Voulez-vous vraiment supprimer la pharmacie "${existingPharmacie.nom}" ?`);
    if (confirmed) {
      updateAppState((state) => ({
        ...state,
        pharmacies: state.pharmacies.filter(p => p.id !== existingPharmacie.id)
      }));
      navigate('/pharmacies');
    }
  }, [existingPharmacie, navigate]);

  const duplicatePharmacy = findDuplicatePharmacy(state.pharmacies, {
    nom: form.nom,
    displayLabel: form.displayLabel,
    adresse: form.adresse,
    ville: form.ville,
    codePostal: form.codePostal,
  }, existingPharmacie?.id);

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
      notes: form.notes.trim(),
    }, existingPharmacie);
    
    updateAppState((state) => {
      const updatedPharmacies = existingPharmacie
        ? state.pharmacies.map(p => p.id === existingPharmacie.id ? pharmacie : p)
        : [...state.pharmacies, pharmacie];
      return { ...state, pharmacies: updatedPharmacies };
    });
    
    // Si on vient de l'onboarding, retourner vers l'onboarding
    if (fromOnboarding) {
      navigate('/welcome');
    } else {
      navigate('/pharmacies');
    }
  }

  return (
    <Stack spacing={4} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <PageHeader
        eyebrow="Référentiels"
        title={existingPharmacie ? 'Modifier la pharmacie' : 'Ajouter une pharmacie'}
        backTo="/options?panel=references"
        backLabel="Référentiels"
        actions={existingPharmacie ? (
          <Tooltip title="Supprimer cette pharmacie">
            <IconButton aria-label="Supprimer cette pharmacie" onClick={() => handleDelete().catch(() => {})} color="error" data-testid="pharmacy-delete-button">
              <DeleteRoundedIcon />
            </IconButton>
          </Tooltip>
        ) : undefined}
        data-testid="pharmacy-back-button"
      />
      {existingPharmacie && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Modification de : {existingPharmacie.nom}
        </Alert>
      )}
      <SurfaceCard contentSx={{ p: { xs: 3, md: 4 } }}>
        <Stack component="form" onSubmit={submit} spacing={4}>
            <Typography variant="h4">Informations générales</Typography>
            <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
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
                <InputLabel id="pharmacy-page-franchise-label">Bannière</InputLabel>
                <Select
                  labelId="pharmacy-page-franchise-label"
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
            <Stack direction="row" sx={{ gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="inherit" onClick={() => navigate('/pharmacies')} data-testid="pharmacie-cancel-button">Annuler</Button>
              <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim() || Boolean(duplicatePharmacy)} data-testid="pharmacie-save-button">
                {existingPharmacie ? 'Enregistrer les modifications' : 'Enregistrer'}
              </Button>
            </Stack>
          </Stack>
        </SurfaceCard>
    </Stack>
  );
}
