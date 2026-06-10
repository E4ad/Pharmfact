import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createId } from '../../services/ids';
import { AddressAutocompleteInput } from '../../components/AddressAutocompleteInput';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import { PageBackButton } from '../../components/PageBackButton';
import { updateAppState } from '../../storage/localStore';
import type { Pharmacie } from '../../storage/schema';

export function PharmacieAddPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', adresse: '', codePostal: '', ville: '', rue: '', numero: '', lat: undefined as number | undefined, lng: undefined as number | undefined, telephone: '', email: '', defaultBreakMinutes: '60', notes: '' });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectAddress(suggestion: GeocodeSuggestion) {
    setForm((current) => ({
      ...current,
      adresse: suggestion.displayName,
      ville: suggestion.city || current.ville,
      codePostal: suggestion.postcode || current.codePostal,
      rue: suggestion.road || current.rue,
      numero: suggestion.houseNumber || current.numero,
      lat: suggestion.lat,
      lng: suggestion.lng,
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) return;
    const pharmacie: Pharmacie = {
      id: createId('pha'),
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
    updateAppState((state) => ({ ...state, pharmacies: [...state.pharmacies, pharmacie] }));
    navigate('/activity');
  }

  return (
    <Stack spacing={4} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
        <PageBackButton to="/activity" label="Accueil" data-testid="pharmacy-back-button" />
        <Typography variant="h2">Ajouter une pharmacie</Typography>
      </Stack>
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
              <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim()} data-testid="pharmacie-save-button">Enregistrer</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
