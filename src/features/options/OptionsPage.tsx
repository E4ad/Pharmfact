import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Alert, 
  Box, 
  Button, 
  Grid, 
  Snackbar, 
  Stack, 
  Typography 
} from '@mui/material';
import { 
  AccountCircleRounded as AccountCircleRoundedIcon,
  AccountBalanceRounded as AccountBalanceRoundedIcon,
  AddBusinessRounded as AddBusinessRoundedIcon,
  DarkModeRounded as DarkModeRoundedIcon,
  DescriptionRounded as DescriptionRoundedIcon,
  LocalPharmacyRounded as LocalPharmacyRoundedIcon,
  PersonAddAltRounded as PersonAddAltRoundedIcon,
  SettingsRounded as SettingsRoundedIcon,
} from '@mui/icons-material';

import { BackHomeButton } from '../../components/BackHomeButton';
import { OptionsTile } from '../../components/OptionsTile';
import { OptionsDrawer } from '../../components/OptionsDrawer';
import { useAppState, setAppState } from '../../storage/localStore';
import { activePharmacien, selectAppOptions, selectFinancialOptions, selectUiOptions, selectLocalDataOptions } from '../../storage/selectors';
import type { AppOptions, FiscalSettings, UiSettings, LocalDataSettings, AppState } from '../../storage/schema';

// Import des drawers
import { AppearanceDrawer } from './drawers/AppearanceDrawer';
import { FinancialDrawer } from './drawers/FinancialDrawer';
import { MissionSettingsDrawer } from './drawers/MissionSettingsDrawer';
import { PdfCalendarDrawer } from './drawers/PdfCalendarDrawer';
import { MissionRefDrawer } from './drawers/MissionRefDrawer';
import { LocalDataDrawer } from './drawers/LocalDataDrawer';
import { ProfileDrawer } from './drawers/ProfileDrawer';
import { PharmaciesDrawer } from './drawers/PharmaciesDrawer';

export function OptionsPage() {
  const navigate = useNavigate();
  const state = useAppState();
  const currentActive = activePharmacien(state);

  // States pour les formulaires
  const [appOptions, setAppOptions] = useState<AppOptions>(selectAppOptions(state));
  const [fiscalSettings, setFiscalSettings] = useState<FiscalSettings>(selectFinancialOptions(state));
  const [uiSettings, setUiSettings] = useState<UiSettings>(selectUiOptions(state));
  const [localDataSettings, setLocalDataSettings] = useState<LocalDataSettings>(selectLocalDataOptions(state));

  // State pour les toast notifications
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  // State pour le drawer actif
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);

  // Synchroniser avec le state global
  useEffect(() => {
    setAppOptions(selectAppOptions(state));
    setFiscalSettings(selectFinancialOptions(state));
    setUiSettings(selectUiOptions(state));
    setLocalDataSettings(selectLocalDataOptions(state));
  }, [state]);

  // Gestion du clavier pour fermer le drawer avec Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeDrawer) {
        setActiveDrawer(null);
        // Réinitialiser les states locaux depuis le state global
        setAppOptions(selectAppOptions(state));
        setFiscalSettings(selectFinancialOptions(state));
        setUiSettings(selectUiOptions(state));
        setLocalDataSettings(selectLocalDataOptions(state));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawer, state]);

  // Fonction pour sauvegarder toutes les modifications
  const handleSave = useCallback(() => {
    try {
      setAppState({
        ...state,
        appOptions,
        fiscalSettings,
        uiSettings,
        localDataSettings,
        ui: {
          ...state.ui,
          lastVisitedAt: new Date().toISOString(),
        },
      });
      setToast({ severity: 'success', message: 'Paramètres enregistrés avec succès.' });
    } catch (error) {
      setToast({ severity: 'error', message: 'Erreur lors de l\'enregistrement.' });
    }
  }, [state, appOptions, fiscalSettings, uiSettings, localDataSettings]);

  // Fonction pour annuler les modifications d'un drawer
  const handleDrawerCancel = useCallback(() => {
    setActiveDrawer(null);
    // Réinitialiser les states locaux depuis le state global
    setAppOptions(selectAppOptions(state));
    setFiscalSettings(selectFinancialOptions(state));
    setUiSettings(selectUiOptions(state));
    setLocalDataSettings(selectLocalDataOptions(state));
  }, [state]);

  // Définition des tuiles
  const tiles = [
    {
      id: 'profile',
      icon: <AccountCircleRoundedIcon fontSize="small" />,
      title: 'Profil actif',
      description: 'Pharmacien et pharmacie par défaut.',
      value: currentActive?.nom,
      onClick: () => setActiveDrawer('profile'),
      testId: 'options-tile-profile',
    },
    {
      id: 'pharmaciens',
      icon: <PersonAddAltRoundedIcon fontSize="small" />,
      title: 'Pharmaciens',
      description: `Gérer les profils pharmacien (${state.pharmaciens.length}).`,
      onClick: () => navigate('/pharmacien/new'),
      testId: 'options-tile-pharmaciens',
    },
    {
      id: 'pharmacies',
      icon: <LocalPharmacyRoundedIcon fontSize="small" />,
      title: 'Pharmacies',
      description: `Gérer les pharmacies (${state.pharmacies.length}).`,
      onClick: () => setActiveDrawer('pharmacies'),
      testId: 'options-tile-pharmacies',
    },
    {
      id: 'mission-settings',
      icon: <SettingsRoundedIcon fontSize="small" />,
      title: 'Paramètres mission',
      description: 'Horaires, pause, repas et kilométrage par défaut.',
      onClick: () => setActiveDrawer('mission-settings'),
      testId: 'options-tile-mission-settings',
    },
    {
      id: 'financial',
      icon: <AccountBalanceRoundedIcon fontSize="small" />,
      title: 'Financier & fiscalité',
      description: 'Réserve fiscale, acomptes et seuils.',
      onClick: () => setActiveDrawer('financial'),
      testId: 'options-tile-financial',
    },
    {
      id: 'pdf-calendar',
      icon: <DescriptionRoundedIcon fontSize="small" />,
      title: 'PDF & calendrier',
      description: 'Facturation, conditions de paiement et calendrier.',
      onClick: () => setActiveDrawer('pdf-calendar'),
      testId: 'options-tile-pdf-calendar',
    },
    {
      id: 'mission-ref',
      icon: <AddBusinessRoundedIcon fontSize="small" />,
      title: 'Référentiel des missions',
      description: 'Types de mission, frais, statuts et règles.',
      onClick: () => setActiveDrawer('mission-ref'),
      testId: 'options-tile-mission-ref',
    },
    {
      id: 'local-data',
      icon: <SettingsRoundedIcon fontSize="small" />,
      title: 'Données locales',
      description: 'Sauvegarde automatique et gestion des données.',
      onClick: () => setActiveDrawer('local-data'),
      testId: 'options-tile-local-data',
    },
    {
      id: 'appearance',
      icon: <DarkModeRoundedIcon fontSize="small" />,
      title: 'Apparence',
      description: 'Thème clair, sombre ou système.',
      value: uiSettings.themeMode === 'light' ? 'Clair' : 
             uiSettings.themeMode === 'dark' ? 'Sombre' : 'Système',
      onClick: () => setActiveDrawer('appearance'),
      testId: 'options-tile-appearance',
    },
  ];

  return (
    <Stack spacing={3} sx={{ width: 'min(980px, 100%)', mx: 'auto', py: 4 }}>
      {/* En-tête */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
        <BackHomeButton to="/activity" data-testid="options-back-button" />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Options
        </Typography>
      </Stack>

      {/* Description */}
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Centre de configuration de l'application
      </Typography>

      {/* Grille de tuiles */}
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid item xs={12} sm={6} md={4} key={tile.id}>
            <OptionsTile
              icon={tile.icon}
              title={tile.title}
              description={tile.description}
              value={tile.value}
              onClick={tile.onClick}
              data-testid={tile.testId}
            />
          </Grid>
        ))}
      </Grid>

      {/* Info: sauvegarde se fait par drawer */}
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        Cliquez sur une tuile pour configurer. Les modifications sont enregistrées par section.
      </Typography>

      {/* Drawers */}
      
      {/* Drawer: Profil actif */}
      <OptionsDrawer
        open={activeDrawer === 'profile'}
        onClose={() => setActiveDrawer(null)}
        title="Profil actif"
        actions={
          <Button variant="outlined" onClick={() => setActiveDrawer(null)} data-testid="profile-drawer-close">
            Fermer
          </Button>
        }
        data-testid="profile-drawer"
      >
        <ProfileDrawer state={state} />
      </OptionsDrawer>

      {/* Drawer: Pharmacies */}
      <OptionsDrawer
        open={activeDrawer === 'pharmacies'}
        onClose={() => setActiveDrawer(null)}
        title="Pharmacies"
        actions={
          <Button variant="outlined" onClick={() => setActiveDrawer(null)} data-testid="pharmacies-drawer-close">
            Fermer
          </Button>
        }
        data-testid="pharmacies-drawer"
      >
        <PharmaciesDrawer state={state} />
      </OptionsDrawer>

      {/* Drawer: Paramètres mission */}
      <OptionsDrawer
        open={activeDrawer === 'mission-settings'}
        onClose={() => setActiveDrawer(null)}
        title="Paramètres mission"
        actions={
          <>
            <Button variant="outlined" onClick={handleDrawerCancel} data-testid="mission-settings-drawer-cancel">
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setActiveDrawer(null);
                handleSave();
              }}
              data-testid="mission-settings-drawer-save"
            >
              Enregistrer
            </Button>
          </>
        }
        data-testid="mission-settings-drawer"
      >
        <MissionSettingsDrawer 
          settings={appOptions} 
          onChange={setAppOptions} 
        />
      </OptionsDrawer>

      {/* Drawer: Financier & fiscalité */}
      <OptionsDrawer
        open={activeDrawer === 'financial'}
        onClose={() => setActiveDrawer(null)}
        title="Financier & fiscalité"
        actions={
          <>
            <Button variant="outlined" onClick={handleDrawerCancel} data-testid="financial-drawer-cancel">
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setActiveDrawer(null);
                handleSave();
              }}
              data-testid="financial-drawer-save"
            >
              Enregistrer
            </Button>
          </>
        }
        data-testid="financial-drawer"
      >
        <FinancialDrawer 
          settings={fiscalSettings} 
          onChange={setFiscalSettings} 
        />
      </OptionsDrawer>

      {/* Drawer: PDF & calendrier */}
      <OptionsDrawer
        open={activeDrawer === 'pdf-calendar'}
        onClose={() => setActiveDrawer(null)}
        title="PDF & calendrier"
        actions={
          <>
            <Button variant="outlined" onClick={handleDrawerCancel} data-testid="pdf-calendar-drawer-cancel">
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setActiveDrawer(null);
                handleSave();
              }}
              data-testid="pdf-calendar-drawer-save"
            >
              Enregistrer
            </Button>
          </>
        }
        data-testid="pdf-calendar-drawer"
      >
        <PdfCalendarDrawer 
          settings={appOptions} 
          onChange={setAppOptions} 
        />
      </OptionsDrawer>

      {/* Drawer: Référentiel des missions */}
      <OptionsDrawer
        open={activeDrawer === 'mission-ref'}
        onClose={() => setActiveDrawer(null)}
        title="Référentiel des missions"
        actions={
          <Button variant="outlined" onClick={() => setActiveDrawer(null)} data-testid="mission-ref-drawer-close">
            Fermer
          </Button>
        }
        data-testid="mission-ref-drawer"
      >
        <MissionRefDrawer />
      </OptionsDrawer>

      {/* Drawer: Données locales */}
      <OptionsDrawer
        open={activeDrawer === 'local-data'}
        onClose={() => setActiveDrawer(null)}
        title="Données locales"
        actions={
          <>
            <Button variant="outlined" onClick={handleDrawerCancel} data-testid="local-data-drawer-cancel">
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setActiveDrawer(null);
                handleSave();
              }}
              data-testid="local-data-drawer-save"
            >
              Enregistrer
            </Button>
          </>
        }
        data-testid="local-data-drawer"
      >
        <LocalDataDrawer 
          settings={localDataSettings} 
          onChange={setLocalDataSettings} 
        />
      </OptionsDrawer>

      {/* Drawer: Apparence */}
      <OptionsDrawer
        open={activeDrawer === 'appearance'}
        onClose={() => setActiveDrawer(null)}
        title="Apparence"
        actions={
          <>
            <Button variant="outlined" onClick={handleDrawerCancel} data-testid="appearance-drawer-cancel">
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={() => {
                setActiveDrawer(null);
                handleSave();
              }}
              data-testid="appearance-drawer-save"
            >
              Enregistrer
            </Button>
          </>
        }
        data-testid="appearance-drawer"
      >
        <AppearanceDrawer 
          settings={uiSettings} 
          onChange={setUiSettings} 
        />
      </OptionsDrawer>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3200}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
