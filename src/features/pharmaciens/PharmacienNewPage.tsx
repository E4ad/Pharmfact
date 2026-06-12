import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { Box, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography, Alert, IconButton, Tooltip } from '@mui/material';
import { FormEvent, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createId } from '../../services/ids';
import { AddressAutocompleteInput } from '../../components/AddressAutocompleteInput';
import { BackHomeButton } from '../../components/BackHomeButton';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import { eurosToCents } from '../../services/money';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacien, TaxStatus } from '../../storage/schema';
import { getPlatform } from '../../services/platformService';

export function PharmacienNewPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') || '';
  const fromOnboarding = searchParams.get('from') === 'onboarding';
  const existingPharmacien = state.pharmaciens.find(p => p.id === id);
  
  const [form, setForm] = useState({ nom: '', adresse: '', ville: '', codePostal: '', rue: '', numero: '', lat: undefined as number | undefined, lng: undefined as number | undefined, telephone: '', email: '', hourlyRate: '80', distanceKmDomicile: '0', taxStatus: 'SMALL_SUPPLIER' as TaxStatus, gstNumber: '', qstNumber: '', favoritePharmacieId: '' });
  
  // Charger les données existantes si on est en mode édition
  useEffect(() => {
    if (existingPharmacien) {
      setForm({
        nom: existingPharmacien.nom || '',
        adresse: existingPharmacien.adresse || '',
        ville: existingPharmacien.ville || '',
        codePostal: existingPharmacien.codePostal || '',
        rue: existingPharmacien.rue || '',
        numero: existingPharmacien.numero || '',
        lat: existingPharmacien.lat,
        lng: existingPharmacien.lng,
        telephone: existingPharmacien.telephone || '',
        email: existingPharmacien.email || '',
        hourlyRate: String((existingPharmacien.hourlyRateCents || 0) / 100),
        distanceKmDomicile: String(existingPharmacien.distanceKmDomicile || 0),
        taxStatus: existingPharmacien.taxStatus,
        gstNumber: existingPharmacien.gstNumber || '',
        qstNumber: existingPharmacien.qstNumber || '',
        favoritePharmacieId: existingPharmacien.favoritePharmacieId || ''
      });
    }
  }, [id, existingPharmacien]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
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
    if (!existingPharmacien) return;
    const confirmed = await getPlatform().system.showConfirm(`Voulez-vous vraiment supprimer le pharmacien "${existingPharmacien.nom}" ?`);
    if (confirmed) {
      updateAppState((state) => ({
        ...state,
        pharmaciens: state.pharmaciens.filter(p => p.id !== existingPharmacien.id),
        activePharmacienId: state.activePharmacienId === existingPharmacien.id ? '' : state.activePharmacienId
      }));
      navigate('/settings');
    }
  }, [existingPharmacien, navigate]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) return;
    const pharmacien: Pharmacien = {
      id: existingPharmacien?.id || createId('ph'),
      nom: form.nom.trim(),
      adresse: form.adresse.trim(),
      rue: form.rue.trim() || undefined,
      numero: form.numero.trim() || undefined,
      ville: form.ville.trim(),
      codePostal: form.codePostal.trim(),
      lat: form.lat,
      lng: form.lng,
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      hourlyRateCents: eurosToCents(form.hourlyRate),
      distanceKmDomicile: Number(form.distanceKmDomicile) || 0,
      taxStatus: form.taxStatus,
      gstNumber: form.gstNumber.trim() || undefined,
      qstNumber: form.qstNumber.trim() || undefined,
      favoritePharmacieId: form.favoritePharmacieId || undefined,
    };
    updateAppState((state) => {
      const updatedPharmaciens = existingPharmacien
        ? state.pharmaciens.map(p => p.id === existingPharmacien.id ? pharmacien : p)
        : [...state.pharmaciens, pharmacien];
      return { 
        ...state, 
        pharmaciens: updatedPharmaciens,
        activePharmacienId: existingPharmacien ? state.activePharmacienId : pharmacien.id
      };
    });
    
    // Si on vient de l'onboarding, retourner vers l'onboarding
    if (fromOnboarding) {
      navigate('/welcome');
    } else {
      navigate('/settings');
    }
  }

  return (
    <Stack spacing={4} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <BackHomeButton to="/settings" label="Paramètres" data-testid="pharmacien-back-button" />
          <Typography variant="h2">{existingPharmacien ? 'Modifier le pharmacien' : 'Nouveau pharmacien'}</Typography>
        </Stack>
        {existingPharmacien && (
          <Tooltip title="Supprimer ce pharmacien">
            <IconButton onClick={() => handleDelete().catch(() => {})} color="error" data-testid="pharmacien-delete-button">
              <DeleteRoundedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {existingPharmacien && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Modification de : {existingPharmacien.nom}
        </Alert>
      )}
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack component="form" onSubmit={submit} spacing={4}>
            <Typography variant="h4">Profil professionnel</Typography>
            <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              <TextField label="Nom complet *" value={form.nom} onChange={(e) => update('nom', e.target.value)} required />
              <Box sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}>
                <AddressAutocompleteInput label="Adresse" value={form.adresse} onChange={(value) => update('adresse', value)} onSelect={selectAddress} />
              </Box>
              <TextField label="Ville" value={form.ville} onChange={(e) => update('ville', e.target.value)} />
              <TextField label="Code postal" value={form.codePostal} onChange={(e) => update('codePostal', e.target.value)} />
              <TextField label="Téléphone" value={form.telephone} onChange={(e) => update('telephone', e.target.value)} />
              <TextField label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
              <TextField label="Taux horaire" type="number" value={form.hourlyRate} onChange={(e) => update('hourlyRate', e.target.value)} />
              <TextField label="Distance domicile (km)" type="number" value={form.distanceKmDomicile} onChange={(e) => update('distanceKmDomicile', e.target.value)} />
              <FormControl>
                <InputLabel>Statut fiscal</InputLabel>
                <Select label="Statut fiscal" value={form.taxStatus} onChange={(e) => update('taxStatus', e.target.value as TaxStatus)}>
                  <MenuItem value="SMALL_SUPPLIER">Petit fournisseur</MenuItem>
                  <MenuItem value="REGISTERED">Inscrit TPS/TVQ</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Numéro TPS" value={form.gstNumber} onChange={(e) => update('gstNumber', e.target.value)} />
              <TextField label="Numéro TVQ" value={form.qstNumber} onChange={(e) => update('qstNumber', e.target.value)} />
              <FormControl>
                <InputLabel>Pharmacie favorite</InputLabel>
                <Select label="Pharmacie favorite" value={form.favoritePharmacieId} onChange={(e) => update('favoritePharmacieId', e.target.value)}>
                  <MenuItem value="">Aucune</MenuItem>
                  {state.pharmacies.map((pharmacie) => <MenuItem key={pharmacie.id} value={pharmacie.id}>{pharmacie.nom}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" sx={{ gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="inherit" onClick={() => navigate('/settings')} data-testid="pharmacien-cancel-button">Annuler</Button>
              <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim()} data-testid="pharmacien-save-button">
                {existingPharmacien ? 'Enregistrer les modifications' : 'Enregistrer'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
