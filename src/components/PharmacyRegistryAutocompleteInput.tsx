import { Box, List, ListItemButton, Paper, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchSantePharmacies, type SantePharmacyRegistryEntry } from '../services/santePharmacyRegistry';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (entry: SantePharmacyRegistryEntry) => void;
  required?: boolean;
};

export function PharmacyRegistryAutocompleteInput({ label, value, onChange, onSelect, required }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const suggestions = useMemo(() => searchSantePharmacies(value, 8), [value]);

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
        required={required}
        fullWidth
        helperText="Recherche locale. Saisie manuelle possible."
      />
      {open && value.trim().length >= 2 ? (
        <Paper elevation={6} sx={{ position: 'absolute', zIndex: 30, left: 0, right: 0, mt: 1, overflow: 'hidden' }}>
          {suggestions.length ? (
            <List dense disablePadding>
              {suggestions.map((suggestion) => (
                <ListItemButton
                  key={suggestion.id}
                  onClick={() => {
                    onSelect(suggestion);
                    setOpen(false);
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {suggestion.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[suggestion.addressLine, suggestion.city, suggestion.postalCode].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              Aucune pharmacie trouvée. La saisie manuelle reste possible.
            </Typography>
          )}
        </Paper>
      ) : null}
    </Box>
  );
}
