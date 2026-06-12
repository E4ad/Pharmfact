import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Alert, IconButton, Tooltip } from '@mui/material';
import { FormEvent, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createId } from '../../services/ids';
import { AddressAutocompleteInput } from '../../components/AddressAutocompleteInput';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import { BackHomeButton } from '../../components/BackHomeButton';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacie } from '../../storage/schema';
import { getPlatform } from '../../services/platformService';

export function PharmacieAddPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const state = useAppState();
  const existingPharmacie = state.pharmacies.find(p => p.id === id);
  
  const [form, setForm] = useState({
    nom: '', 
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

  function selectAddress(suggestion: GeocodeSuggestion) {
    setForm((current) => ({
      ...current,
      adresse: suggestion.addressLine || suggestion.displayName,
      ville: suggestion.city || current.ville,
      codePostal: suggestion.postcode || current.codePostal,
      rue: suggestion.road || current.rue,
      numero: suggestion.houseNumber || current.numero,
      lat: suggestion.lat,
      lng: suggestion.lng,
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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) return;
    
    const pharmacie: Pharmacie = {
      id: existingPharmacie?.id || createId('pha'),
      nom: form.nom.trim(),
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
            <IconButton onClick={() => handleDelete().catch(() => {})} color="error" data-testid="pharmacy-delete-button">
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
              <TextField label="Nom de la pharmacie *" value={form.nom} onChange={(e) => update('nom', e.target.value)} required />
              <Box sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}>
                <AddressAutocompleteInput label="Adresse" value={form.adresse} onChange={(value) => update('adresse', value)} onSelect={selectAddress} />
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
              <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim()} data-testid="pharmacie-save-button">
                {existingPharmacie ? 'Enregistrer les modifications' : 'Enregistrer'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
