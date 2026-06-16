import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { FormEvent, useState, useEffect } from 'react';
import { PharmacyRegistryAutocompleteInput } from '../../components/PharmacyRegistryAutocompleteInput';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacie } from '../../storage/schema';
import { createId } from '../../services/ids';
import { getPlatform } from '../../services/platformService';
import { buildSantePharmacyNotes, getSantePharmacyAddressParts, type SantePharmacyRegistryEntry } from '../../services/santePharmacyRegistry';
import { findDuplicatePharmacy } from '../../services/entityDuplicates';
import { borderRadiusScale } from '../../design-system/tokens';

interface PharmacieFormModalProps {
  open: boolean;
  onClose: () => void;
  pharmacieId?: string;
}

export function PharmacieFormModal({ open, onClose, pharmacieId }: PharmacieFormModalProps) {
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
      <DialogContent sx={{ p: 3, pt: 0, overflowY: 'auto' }}>
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
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: borderRadiusScale.full }}>
          Annuler
        </Button>
        <Button variant="contained" type="submit" form={formId} startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim() || Boolean(duplicatePharmacy)} sx={{ borderRadius: borderRadiusScale.full }}>
          {existingPharmacie ? 'Enregistrer les modifications' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
