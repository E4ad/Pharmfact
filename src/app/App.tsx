import { Alert, Box, Button, CircularProgress, CssBaseline, Stack, Typography, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import React, { Component, useEffect, useMemo, type ErrorInfo, type ReactNode } from 'react';
import { router } from './router';
import { getTheme } from './theme';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '../contexts/ThemeContext';
import { retryStorageBootstrap, startWithEmptyState, useAppState, useStorageBootstrapState } from '../storage/localStore';
import { useAutoBackup } from '../hooks/useAutoBackup';
import { NotificationProvider } from '../components/NotificationSystem';
import { ThemeToolbar } from '../components/ThemeToolbar';

/**
 * Composant wrapper qui combine notre ThemeContext avec le ThemeProvider de MUI
 */
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { effectiveMode, runtimeTokens } = useThemeContext();
  const theme = useMemo(() => getTheme(effectiveMode, runtimeTokens), [effectiveMode, runtimeTokens]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--pf-radius-surface', `${theme.runtimeTokens.surfaceRadius}px`);
    root.style.setProperty('--pf-radius-control', `${theme.runtimeTokens.controlRadius}px`);
    root.style.setProperty('--pf-radius-icon', `${theme.runtimeTokens.iconRadius}px`);
    root.style.setProperty('--pf-border-width', `${theme.runtimeTokens.borderWidth}px`);
    root.style.setProperty('--pf-primary-main', theme.runtimeTokens.primary[theme.palette.mode].main);
    root.style.setProperty('--pf-shadow-surface', theme.runtimeTokens.shadows.card[theme.palette.mode === 'dark' ? 'dark' : 'light']);
    root.style.setProperty('--pf-shadow-modal', theme.runtimeTokens.shadows.modal[theme.palette.mode === 'dark' ? 'dark' : 'light']);
  }, [theme]);

  return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <a className="skip-link" href="#main-content">Aller au contenu principal</a>
        <NotificationProvider>
          {children}
          {import.meta.env.DEV ? <ThemeToolbar /> : null}
        </NotificationProvider>
      </MuiThemeProvider>
  );
}

function StorageBootstrapScreen() {
  return (
    <Box
      component="main"
      id="main-content"
      data-testid="storage-bootstrap-screen"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 3,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 480 }}>
        <CircularProgress size={36} thickness={4} />
        <Stack spacing={0.5}>
          <Typography variant="h4">Chargement des données</Typography>
          <Typography color="text.secondary">
            L’application initialise votre espace local avant d’afficher l’interface.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function StorageBootstrapErrorScreen({ message }: { message?: string }) {
  return (
    <Box
      component="main"
      id="main-content"
      data-testid="storage-bootstrap-error-screen"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 3,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={2.5} sx={{ maxWidth: 560, width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h3">Données locales indisponibles</Typography>
          <Typography color="text.secondary">
            L’application n’a pas pu lire l’espace de stockage local de Tauri.
          </Typography>
        </Stack>
        <Alert severity="error">{message ?? 'Le chargement des données locales a échoué.'}</Alert>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button variant="contained" onClick={retryStorageBootstrap}>
            Réessayer
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => { void startWithEmptyState(); }}>
            Démarrer avec un état vide
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

function AppRenderErrorScreen({ message }: { message?: string }) {
  return (
    <Box
      component="main"
      id="main-content"
      data-testid="app-render-error-screen"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 3,
        py: 4,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={2.5} sx={{ maxWidth: 560, width: '100%' }}>
        <Stack spacing={1}>
          <Typography variant="h3">Interface indisponible</Typography>
          <Typography color="text.secondary">
            L’application a rencontré une erreur pendant l’affichage.
          </Typography>
        </Stack>
        <Alert severity="error">{message ?? 'Erreur de rendu inattendue.'}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ alignSelf: 'flex-start' }}>
          Réessayer
        </Button>
      </Stack>
    </Box>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App] Erreur de rendu React:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return <AppRenderErrorScreen message={this.state.error.message} />;
    }

    return this.props.children;
  }
}

export default function App() {
  const state = useAppState();
  const bootstrapState = useStorageBootstrapState();
  const autoBackupEnabled = state.localDataSettings?.autoBackupEnabled ?? true;
  const isBootstrapping = bootstrapState.status === 'loading';
  const hasBootstrapError = bootstrapState.status === 'error';

  // Initialisation de la sauvegarde automatique
  useAutoBackup(bootstrapState.status === 'ready' && autoBackupEnabled);

  return (
    <AppThemeProvider>
      <ThemeWrapper>
        <AppErrorBoundary>
          {isBootstrapping ? <StorageBootstrapScreen /> : null}
          {hasBootstrapError ? <StorageBootstrapErrorScreen message={bootstrapState.errorMessage} /> : null}
          {bootstrapState.status === 'ready' ? <RouterProvider router={router} /> : null}
        </AppErrorBoundary>
      </ThemeWrapper>
    </AppThemeProvider>
  );
}
