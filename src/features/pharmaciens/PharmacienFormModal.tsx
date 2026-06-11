import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { FormEvent, useState, useEffect } from 'react';
import { AddressAutocompleteInput } from '../../components/AddressAutocompleteInput';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import { eurosToCents } from '../../services/money';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacien, TaxStatus } from '../../storage/schema';
import { createId } from '../../services/ids';
import { getPlatform } from '../../services/platformService';

interface PharmacienFormModalProps {
  open: boolean;
  onClose: () => void;
  pharmacienId?: string;
}

export function PharmacienFormModal({ open, onClose, pharmacienId }: PharmacienFormModalProps) {
  const state = useAppState();
  const existingPharmacien = pharmacienId ? state.pharmaciens.find(p => p.id === pharmacienId) : undefined;

  const [form, setForm] = useState({
    nom: '',
    adresse: '',
    ville: '',
    codePostal: '',
    rue: '',
    numero: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    telephone: '',
    email: '',
    hourlyRate: '80',
    distanceKmDomicile: '0',
    taxStatus: 'SMALL_SUPPLIER' as TaxStatus,
    gstNumber: '',
    qstNumber: '',
    favoritePharmacieId: ''
  });

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
    } else {
      // Réinitialiser le formulaire si on ajoute un nouveau pharmacien
      setForm({
        nom: '',
        adresse: '',
        ville: '',
        codePostal: '',
        rue: '',
        numero: '',
        lat: undefined,
        lng: undefined,
        telephone: '',
        email: '',
        hourlyRate: '80',
        distanceKmDomicile: '0',
        taxStatus: 'SMALL_SUPPLIER',
        gstNumber: '',
        qstNumber: '',
        favoritePharmacieId: ''
      });
    }
  }, [pharmacienId, existingPharmacien]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
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

  async function handleDelete() {
    if (!existingPharmacien) return;
    const confirmed = await getPlatform().system.showConfirm(`Voulez-vous vraiment supprimer le pharmacien "${existingPharmacien.nom}" ?`);
    if (confirmed) {
      updateAppState((state) => ({
        ...state,
        pharmaciens: state.pharmaciens.filter(p => p.id !== existingPharmacien.id),
        activePharmacienId: state.activePharmacienId === existingPharmacien.id ? '' : state.activePharmacienId
      }));
      onClose();
    }
  }

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
          {existingPharmacien ? 'Modifier le pharmacien' : 'Nouveau pharmacien'}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, p: 0.5 }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 3, pt: 0, overflowY: 'auto' }}>
        {existingPharmacien && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Modification de : {existingPharmacien.nom}
          </Alert>
        )}
        <Stack component="form" onSubmit={submit} spacing={3}>
          <Typography variant="h4" sx={{ mt: 1 }}>Profil professionnel</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
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
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        {existingPharmacien && (
          <IconButton onClick={() => handleDelete().catch(() => {})} color="error" title="Supprimer ce pharmacien">
            <DeleteRoundedIcon />
          </IconButton>
        )}
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 999 }}>
          Annuler
        </Button>
        <Button variant="contained" type="submit" startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim()} sx={{ borderRadius: 999 }}>
          {existingPharmacien ? 'Enregistrer les modifications' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
