import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { ChangeEvent, useRef, useState } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { BackHomeButton } from '../../components/BackHomeButton';
import { exportAppState, importAppState, resetAppState, useAppState } from '../../storage/localStore';

export function SettingsPage() {
  const state = useAppState();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function downloadExport() {
    const blob = new Blob([exportAppState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mission-app-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Export JSON téléchargé.' });
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      importAppState(await file.text());
      setMessage({ type: 'success', text: 'Données importées avec succès.' });
    } catch {
      setMessage({ type: 'error', text: 'Import impossible. Vérifiez que le fichier JSON provient de cette application.' });
    }
  }

  function confirmReset() {
    resetAppState();
    setResetOpen(false);
    setMessage({ type: 'success', text: 'Données réinitialisées avec les données de démonstration.' });
  }

  return (
    <Stack spacing={4} sx={{ width: 'min(980px, 100%)', mx: 'auto' }}>
      <Stack spacing={2}>
        <BackHomeButton to="/activity" data-testid="settings-back-button" />
        <Stack spacing={1}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>Réglages</Typography>
          <Typography variant="h2">Données locales</Typography>
          <Typography color="text.secondary">Exportez, restaurez ou réinitialisez vos données locales.</Typography>
        </Stack>
      </Stack>

      {message ? <Alert severity={message.type} onClose={() => setMessage(null)}>{message.text}</Alert> : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="h5">Exporter</Typography>
                <Typography color="text.secondary">Télécharge une sauvegarde JSON complète du localStorage.</Typography>
              </Stack>
              <Button variant="contained" startIcon={<DownloadRoundedIcon />} onClick={downloadExport}>Exporter JSON</Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="h5">Importer</Typography>
                <Typography color="text.secondary">Remplace l’état actuel par un export JSON compatible.</Typography>
              </Stack>
              <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
              <Button variant="outlined" color="inherit" startIcon={<UploadRoundedIcon />} onClick={() => fileInputRef.current?.click()}>Importer JSON</Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Stack spacing={1}>
                <Typography variant="h5">Réinitialiser</Typography>
                <Typography color="text.secondary">Recharge les données de démonstration et efface les modifications locales.</Typography>
              </Stack>
              <Button variant="outlined" color="error" startIcon={<RestartAltRoundedIcon />} onClick={() => setResetOpen(true)}>Réinitialiser</Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h4">Contenu actuel</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' }, gap: 2 }}>
              <SummaryValue label="Pharmaciens" value={state.pharmaciens.length} />
              <SummaryValue label="Pharmacies" value={state.pharmacies.length} />
              <SummaryValue label="Missions" value={state.missions.length} />
              <SummaryValue label="Factures" value={state.invoices.length} />
              <SummaryValue label="Acomptes" value={state.taxPayments.length} />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        title="Réinitialiser les données ?"
        description="Toutes vos données locales seront remplacées par les données de démonstration."
        confirmLabel="Réinitialiser"
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
      />
    </Stack>
  );
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <Stack spacing={0.5}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography variant="h4">{value}</Typography>
    </Stack>
  );
}
