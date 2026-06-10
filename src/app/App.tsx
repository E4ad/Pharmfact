import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { useMemo } from 'react';
import { router } from './router';
import { theme } from './theme';
import { useAppState } from '../storage/localStore';
import { useAutoBackup } from '../hooks/useAutoBackup';

export default function App() {
  const state = useAppState();
  const autoBackupEnabled = state.localDataSettings?.autoBackupEnabled ?? true;
  
  // Initialisation de la sauvegarde automatique
  useAutoBackup(autoBackupEnabled);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
