import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { FormEvent, useState, useEffect } from 'react';
import { AddressAutocompleteInput } from '../../components/AddressAutocompleteInput';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacie } from '../../storage/schema';
import { createId } from '../../services/ids';
import { getPlatform } from '../../services/platformService';

interface PharmacieFormModalProps {
  open: boolean;
  onClose: () => void;
  pharmacieId?: string;
}

export function PharmacieFormModal({ open, onClose, pharmacieId }: PharmacieFormModalProps) {
  const state = useAppState();
  const existingPharmacie = pharmacieId ? state.pharmacies.find(p => p.id === pharmacieId) : undefined;

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
    } else {
      // Réinitialiser le formulaire si on ajoute une nouvelle pharmacie
      setForm({
        nom: '',
        adresse: '',
        codePostal: '',
        ville: '',
        rue: '',
        numero: '',
        lat: undefined,
        lng: undefined,
        telephone: '',
        email: '',
        defaultBreakMinutes: '60',
        notes: ''
      });
    }
  }, [pharmacieId, existingPharmacie]);

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
    onClose();
  }

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
            width: { xs: '100%', md: 'min(600px, 100%)' },
            zIndex: 1400,
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0, position: 'relative' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {existingPharmacie ? 'Modifier la pharmacie' : 'Ajouter une pharmacie'}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, p: 0.5 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 0, overflowY: 'auto' }}>
        {existingPharmacie && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Modification de : {existingPharmacie.nom}
          </Alert>
        )}
        <Stack component="form" onSubmit={submit} spacing={3}>
          <Typography variant="h4" sx={{ mt: 1 }}>Informations générales</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
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
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        {existingPharmacie && (
          <Button variant="outlined" color="error" onClick={() => handleDelete().catch(() => {})} startIcon={<CloseRoundedIcon />}>
            Supprimer
          </Button>
        )}
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 999 }}>
          Annuler
        </Button>
        <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim()} sx={{ borderRadius: 999 }}>
          {existingPharmacie ? 'Enregistrer les modifications' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
