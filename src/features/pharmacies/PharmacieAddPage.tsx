import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Alert, IconButton, Tooltip } from '@mui/material';
import { FormEvent, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createId } from '../../services/ids';
import { PharmacyRegistryAutocompleteInput } from '../../components/PharmacyRegistryAutocompleteInput';
import { BackHomeButton } from '../../components/BackHomeButton';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacie } from '../../storage/schema';
import { getPlatform } from '../../services/platformService';
import { buildSantePharmacyNotes, getSantePharmacyAddressParts, type SantePharmacyRegistryEntry } from '../../services/santePharmacyRegistry';
import { findDuplicatePharmacy } from '../../services/entityDuplicates';

export function PharmacieAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const state = useAppState();
  const existingPharmacie = state.pharmacies.find(p => p.id === id);
  
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
    telephone: '', 
    email: '', 
    defaultBreakMinutes: '60', 
    notes: ''
  });
  
  // Charger les données existantes si on est en mode édition
  useEffect(() => {
    if (existingPharmacie) {
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
        telephone: existingPharmacie.telephone || '',
        email: existingPharmacie.email || '',
        defaultBreakMinutes: String(existingPharmacie.defaultBreakMinutes || '60'),
        notes: existingPharmacie.notes || ''
      });
    }
  }, [id, existingPharmacie]);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectRegistryPharmacy(pharmacy: SantePharmacyRegistryEntry) {
    const address = getSantePharmacyAddressParts(pharmacy);
    const registryNotes = buildSantePharmacyNotes(pharmacy);
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
      navigate('/activity');
    }
  }, [existingPharmacie, navigate]);

  const duplicatePharmacy = findDuplicatePharmacy(state.pharmacies, {
    nom: form.nom,
    displayLabel: form.displayLabel,
    adresse: form.adresse,
    ville: form.ville,
    codePostal: form.codePostal,
  }, existingPharmacie?.id);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) return;
    if (duplicatePharmacy) return;
    
    const pharmacie: Pharmacie = {
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
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      defaultBreakMinutes: Math.max(Number(form.defaultBreakMinutes) || 0, 0),
      notes: form.notes.trim(),
    };
    
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
      navigate('/activity');
    }
  }

  return (
    <Stack spacing={4} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <BackHomeButton to="/activity" label="Accueil" data-testid="pharmacy-back-button" />
          <Typography variant="h2">{existingPharmacie ? 'Modifier la pharmacie' : 'Ajouter une pharmacie'}</Typography>
        </Stack>
        {existingPharmacie && (
          <Tooltip title="Supprimer cette pharmacie">
            <IconButton aria-label="Supprimer cette pharmacie" onClick={() => handleDelete().catch(() => {})} color="error" data-testid="pharmacy-delete-button">
              <DeleteRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {existingPharmacie && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Modification de : {existingPharmacie.nom}
        </Alert>
      )}
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
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
              <TextField label="Pause non payée par défaut (minutes)" type="number" value={form.defaultBreakMinutes} onChange={(e) => update('defaultBreakMinutes', e.target.value)} helperText="Cette valeur sera utilisée par défaut lors de la création de missions" />
              <TextField label="Notes" value={form.notes} onChange={(e) => update('notes', e.target.value)} multiline minRows={4} sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }} />
            </Stack>
            <Stack direction="row" sx={{ gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="inherit" onClick={() => navigate('/activity')} data-testid="pharmacie-cancel-button">Annuler</Button>
              <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim() || Boolean(duplicatePharmacy)} data-testid="pharmacie-save-button">
                {existingPharmacie ? 'Enregistrer les modifications' : 'Enregistrer'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
