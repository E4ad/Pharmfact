import { Box, CircularProgress, List, ListItemButton, Paper, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { type GeocodeSuggestion, useAddressAutocomplete } from '../hooks/useAddressAutocomplete';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: GeocodeSuggestion) => void;
};

export function AddressAutocompleteInput({ label, value, onChange, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { suggestions, loading, error } = useAddressAutocomplete(value);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <Box ref={rootRef} sx={{ position: 'relative' }}>
      <TextField
        label={label}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        fullWidth
        helperText="Saisie manuelle possible. Suggestions après 3 caractères."
        slotProps={{ input: { endAdornment: loading ? <CircularProgress size={18} /> : null } }}
      />
      {open && value.trim().length >= 3 ? (
        <Paper elevation={6} sx={{ position: 'absolute', zIndex: 20, left: 0, right: 0, mt: 1, overflow: 'hidden' }}>
          {suggestions.length ? (
            <List dense disablePadding>
              {suggestions.map((suggestion) => (
                <ListItemButton
                  key={`${suggestion.displayName}-${suggestion.lat}-${suggestion.lng}`}
                  onClick={() => {
                    onSelect(suggestion);
                    setOpen(false);
                  }}
                >
                  {suggestion.displayName}
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              {loading ? 'Recherche...' : error ?? 'Aucune suggestion.'}
            </Typography>
          )}
        </Paper>
      ) : null}
    </Box>
  );
}
