import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography, useTheme } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { FormEvent, useState, useEffect } from 'react';
import { AddressAutocompleteInput } from '../../components/AddressAutocompleteInput';
import type { GeocodeSuggestion } from '../../hooks/useAddressAutocomplete';
import { eurosToCents } from '../../services/money';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { Pharmacien, TaxStatus } from '../../storage/schema';
import { createId } from '../../services/ids';
import { getPlatform } from '../../services/platformService';
import { findOpqPharmacistByLicense, normalizeOpqLicenseNumber } from '../../services/opqRegistry';
import { findDuplicatePharmacist } from '../../services/entityDuplicates';
import { geocodeEntityAddressIfNeeded } from '../../services/distanceService';

interface PharmacienFormModalProps {
  open: boolean;
  onClose: () => void;
  pharmacienId?: string;
}

export function PharmacienFormModal({ open, onClose, pharmacienId }: PharmacienFormModalProps) {
  const theme = useTheme();
  const state = useAppState();
  const existingPharmacien = pharmacienId ? state.pharmaciens.find(p => p.id === pharmacienId) : undefined;
  const formId = 'pharmacien-modal-form';

  const [form, setForm] = useState({
    nom: '',
    opqLicenseNumber: '',
    adresse: '',
    ville: '',
    codePostal: '',
    rue: '',
    numero: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    geocodedAt: undefined as string | undefined,
    geocodedAddressHash: undefined as string | undefined,
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
        opqLicenseNumber: existingPharmacien.opqLicenseNumber || '',
        adresse: existingPharmacien.adresse || '',
        ville: existingPharmacien.ville || '',
        codePostal: existingPharmacien.codePostal || '',
        rue: existingPharmacien.rue || '',
        numero: existingPharmacien.numero || '',
        lat: existingPharmacien.lat,
        lng: existingPharmacien.lng,
        geocodedAt: existingPharmacien.geocodedAt,
        geocodedAddressHash: existingPharmacien.geocodedAddressHash,
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
        opqLicenseNumber: '',
        adresse: '',
        ville: '',
        codePostal: '',
        rue: '',
        numero: '',
        lat: undefined,
        lng: undefined,
        geocodedAt: undefined,
        geocodedAddressHash: undefined,
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
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'adresse' || field === 'ville' || field === 'codePostal'
        ? { lat: undefined, lng: undefined, geocodedAt: undefined, geocodedAddressHash: undefined }
        : {}),
    }));
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
      geocodedAt: new Date().toISOString(),
      geocodedAddressHash: undefined,
    }));
  }

  const opqMatch = findOpqPharmacistByLicense(state.opqPharmacistRegistry.entries, form.opqLicenseNumber);
  const normalizedOpqLicenseNumber = normalizeOpqLicenseNumber(form.opqLicenseNumber);
  const duplicatePharmacien = findDuplicatePharmacist(state.pharmaciens, {
    nom: form.nom,
    opqLicenseNumber: form.opqLicenseNumber,
    email: form.email,
    codePostal: form.codePostal,
  }, existingPharmacien?.id);

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) return;
    if (duplicatePharmacien) return;

    const pharmacien: Pharmacien = await geocodeEntityAddressIfNeeded({
      id: existingPharmacien?.id || createId('ph'),
      nom: form.nom.trim(),
      opqLicenseNumber: normalizedOpqLicenseNumber || undefined,
      opqRegistryId: opqMatch?.id ?? existingPharmacien?.opqRegistryId,
      opqStatusLabel: opqMatch ? 'Inscrit au référentiel OPQ' : existingPharmacien?.opqStatusLabel,
      opqVerifiedAt: opqMatch ? new Date().toISOString() : existingPharmacien?.opqVerifiedAt,
      adresse: form.adresse.trim(),
      rue: form.rue.trim() || undefined,
      numero: form.numero.trim() || undefined,
      ville: form.ville.trim(),
      codePostal: form.codePostal.trim(),
      lat: form.lat,
      lng: form.lng,
      geocodedAt: form.geocodedAt,
      geocodedAddressHash: form.geocodedAddressHash,
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      hourlyRateCents: eurosToCents(form.hourlyRate),
      distanceKmDomicile: Number(form.distanceKmDomicile) || 0,
      taxStatus: form.taxStatus,
      gstNumber: form.gstNumber.trim() || undefined,
      qstNumber: form.qstNumber.trim() || undefined,
      favoritePharmacieId: form.favoritePharmacieId || undefined,
    }, existingPharmacien);

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
      aria-labelledby="pharmacist-form-title"
      aria-describedby="pharmacist-form-description"
      data-testid="pharmacien-form-modal"
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
        <Typography id="pharmacist-form-title" variant="h6" sx={{ fontWeight: 600 }}>
          {existingPharmacien ? 'Modifier le pharmacien' : 'Nouveau pharmacien'}
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
        <Typography id="pharmacist-form-description" variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
          Complétez le profil professionnel utilisé pour les missions et les factures.
        </Typography>
        {existingPharmacien && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Modification de : {existingPharmacien.nom}
          </Alert>
        )}
        <Stack id={formId} component="form" onSubmit={submit} spacing={3}>
          <Typography variant="h4" sx={{ mt: 1 }}>Profil professionnel</Typography>
          <Divider sx={{ my: 1 }} />
          <Stack sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            <TextField label="Nom complet *" value={form.nom} onChange={(e) => update('nom', e.target.value)} required />
            <TextField label="Numéro de permis OPQ" value={form.opqLicenseNumber} onChange={(e) => update('opqLicenseNumber', e.target.value)} />
            <Box sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }}>
              <AddressAutocompleteInput label="Adresse" value={form.adresse} onChange={(value) => update('adresse', value)} onSelect={selectAddress} />
            </Box>
            {normalizedOpqLicenseNumber ? (
              <Alert severity={opqMatch ? 'success' : 'warning'} sx={{ gridColumn: '1 / -1' }}>
                {opqMatch
                  ? `Pharmacien confirmé : ${opqMatch.fullName}${opqMatch.city ? ` · ${opqMatch.city}` : ''}`
                  : state.opqPharmacistRegistry.entries.length
                    ? 'Aucun pharmacien trouvé pour ce numéro dans le référentiel local.'
                    : 'Référentiel OPQ non synchronisé. Mise à jour disponible dans Options > Données locales.'}
              </Alert>
            ) : null}
            {duplicatePharmacien ? (
              <Alert severity="warning" sx={{ gridColumn: '1 / -1' }}>
                Ce pharmacien semble déjà exister : {duplicatePharmacien.nom}.
              </Alert>
            ) : null}
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
          <IconButton aria-label="Supprimer ce pharmacien" onClick={() => handleDelete().catch(() => {})} color="error" title="Supprimer ce pharmacien">
            <DeleteRoundedIcon />
          </IconButton>
        )}
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
          Annuler
        </Button>
        <Button variant="contained" type="submit" form={formId} startIcon={<SaveRoundedIcon />} disabled={!form.nom.trim() || Boolean(duplicatePharmacien)} sx={{ borderRadius: theme.runtimeTokens.controlRadius }}>
          {existingPharmacien ? 'Enregistrer les modifications' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
