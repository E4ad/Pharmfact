import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { router } from './router';
import { getTheme, type ThemeMode } from './theme';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '../contexts/ThemeContext';
import { useAppState } from '../storage/localStore';
import { useAutoBackup } from '../hooks/useAutoBackup';

/**
 * Composant wrapper qui combine notre ThemeContext avec le ThemeProvider de MUI
 */
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { effectiveMode } = useThemeContext();
  const theme = useMemo(() => getTheme(effectiveMode), [effectiveMode]);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <a className="skip-link" href="#main-content">Aller au contenu principal</a>
      {children}
    </MuiThemeProvider>
  );
}

export default function App() {
  const state = useAppState();
  const autoBackupEnabled = state.localDataSettings?.autoBackupEnabled ?? true;

  // Initialisation de la sauvegarde automatique
  useAutoBackup(autoBackupEnabled);

  return (
    <AppThemeProvider>
      <ThemeWrapper>
        <RouterProvider router={router} />
      </ThemeWrapper>
    </AppThemeProvider>
  );
}
