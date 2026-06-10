import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAppState, setAppState } from '../storage/localStore';
import { selectUiOptions } from '../storage/selectors';
import type { ThemeMode } from '../types/common';

/**
 * Contexte pour la gestion du thème (clair/sombre/système)
 */
interface ThemeContextType {
  /** Mode de thème actuel (light/dark/system) */
  mode: ThemeMode;
  /** Mode effectif (light ou dark, résolu depuis system si nécessaire) */
  effectiveMode: 'light' | 'dark';
  /** Fonction pour changer le mode de thème */
  setMode: (mode: ThemeMode) => void;
  /** Vrai si le thème sombre est actif */
  isDark: boolean;
  /** Vrai si le thème clair est actif */
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Fournisseur de contexte pour le thème
 * Gère la persistance dans le localStorage via le state global
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  const uiSettings = selectUiOptions(state);
  
  // État local pour suivre le mode système
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Récupérer le mode depuis les settings, avec fallback
  const mode = uiSettings.themeMode ?? 'system';
  
  // Mode effectif (résout 'system' vers light/dark)
  const effectiveMode = mode === 'system' ? systemMode : mode;
  
  // Mettre à jour l'attribut data-theme quand effectiveMode change
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', effectiveMode);
    return () => {
      html.removeAttribute('data-theme');
    };
  }, [effectiveMode]);
  
  // Mémoïser les booléens
  const isDark = effectiveMode === 'dark';
  const isLight = effectiveMode === 'light';

  // Synchroniser avec les changements de préférences système
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? 'dark' : 'light');
    };

    // Écouter les changements
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Fonction pour changer le mode de thème (persiste dans le state global)
  const setMode = useCallback((newMode: ThemeMode) => {
    setAppState({
      ...state,
      uiSettings: {
        ...uiSettings,
        themeMode: newMode,
      },
      ui: {
        ...state.ui,
        lastVisitedAt: new Date().toISOString(),
      },
    });
  }, [state, uiSettings]);

  const value: ThemeContextType = {
    mode,
    effectiveMode,
    setMode,
    isDark,
    isLight,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook pour accéder au contexte du thème
 * Doit être utilisé dans un composant enfant de ThemeProvider
 */
export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

// Export du contexte pour les tests
export { ThemeContext };
