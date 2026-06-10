import { 
  FormControl, 
  FormControlLabel, 
  InputLabel, 
  MenuItem, 
  Select, 
  Stack, 
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Divider 
} from '@mui/material';
import type { AppOptions } from '../../../storage/schema';

interface PdfCalendarDrawerProps {
  settings: AppOptions;
  onChange: (settings: AppOptions) => void;
}

const calendarReminderOptions = [
  { value: 'NONE' as const, label: 'Aucun' },
  { value: 'ONE_HOUR' as const, label: '1 heure avant' },
  { value: 'DAY_BEFORE' as const, label: 'La veille' },
];

/**
 * Drawer pour la configuration PDF & calendrier
 */
export function PdfCalendarDrawer({ settings, onChange }: PdfCalendarDrawerProps) {
  const updatePdfCalendar = (key: keyof AppOptions['pdfCalendar'], value: AppOptions['pdfCalendar'][typeof key]) => {
    onChange({ 
      ...settings, 
      pdfCalendar: { 
        ...settings.pdfCalendar, 
        [key]: value 
      } 
    });
  };

  return (
    <Stack spacing={3}>
      {/* Section : Génération PDF */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Génération PDF
        </Typography>
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.pdfCalendar?.pdfFooterEnabled ?? true}
              exclusive
              onChange={(_, value) => updatePdfCalendar('pdfFooterEnabled', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Pied de page PDF"
        />
        
        <TextField
          label="Titre de l'événement de calendrier"
          value={settings.pdfCalendar?.calendarEventTitle ?? 'Mission pharmacie'}
          onChange={(event) => updatePdfCalendar('calendarEventTitle', event.target.value)}
          helperText="Titre utilisé pour les événements de calendrier"
          fullWidth
        />
      </Stack>

      <Divider />

      {/* Section : Calendrier ICS */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Calendrier ICS
        </Typography>
        
        <FormControlLabel
          control={
            <ToggleButtonGroup
              value={settings.pdfCalendar?.calendarIcsEnabled ?? true}
              exclusive
              onChange={(_, value) => updatePdfCalendar('calendarIcsEnabled', Boolean(value))}
              size="small"
            >
              <ToggleButton value={true}>Activé</ToggleButton>
              <ToggleButton value={false}>Désactivé</ToggleButton>
            </ToggleButtonGroup>
          }
          label="Générer fichier ICS"
        />
        
        <TextField
          label="Minutes avant le rappel"
          type="number"
          value={settings.pdfCalendar?.calendarReminderMinutes ?? ''}
          onChange={(event) => updatePdfCalendar('calendarReminderMinutes', event.target.value ? Number(event.target.value) : null)}
          inputProps={{ min: 0, step: 5 }}
          helperText="Durée du rappel avant l'événement (laisser vide pour aucun)"
          fullWidth
        />
        
        <FormControl fullWidth>
          <InputLabel id="calendar-reminder-label">Type de rappel</InputLabel>
          <Select
            labelId="calendar-reminder-label"
            label="Type de rappel"
            value={settings.pdfCalendar?.calendarReminder ?? 'NONE'}
            onChange={(event) => updatePdfCalendar('calendarReminder', event.target.value as AppOptions['pdfCalendar']['calendarReminder'])}
          >
            {calendarReminderOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Divider />

      {/* Section : Facturation */}
      <Stack spacing={2}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Facturation
        </Typography>
        
        <TextField
          label="Délai de paiement (jours)"
          type="number"
          value={settings.invoiceDefaults?.invoiceDueDays ?? 30}
          onChange={(event) => onChange({ 
            ...settings, 
            invoiceDefaults: { 
              ...settings.invoiceDefaults, 
              invoiceDueDays: Number(event.target.value) 
            } 
          })}
          inputProps={{ min: 0, max: 365, step: 1 }}
          fullWidth
        />
        
        <TextField
          label="Conditions de paiement"
          value={settings.invoiceDefaults?.paymentTerms ?? 'Paiement par virement dans les 30 jours.'}
          onChange={(event) => onChange({ 
            ...settings, 
            invoiceDefaults: { 
              ...settings.invoiceDefaults, 
              paymentTerms: event.target.value 
            } 
          })}
          multiline
          minRows={2}
          helperText="Texte affiché sur les factures"
          fullWidth
        />
      </Stack>
    </Stack>
  );
}
