import React from 'react';
import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useAppState, setAppState } from '../storage/localStore';
import { selectUiOptions } from '../storage/selectors';
import type { ThemeMode } from '../types/common';
import { normalizeRuntimeDesignTokenOverrides, type RuntimeDesignTokenOverrides, type RuntimeDesignTokens } from '../design-system/runtimeTokens';

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
  /** Tokens UI runtime résolus et sécurisés */
  runtimeTokens: RuntimeDesignTokens;
  /** Overrides de prévisualisation non persistés */
  previewDesignTokenOverrides: RuntimeDesignTokenOverrides | null;
  /** Mode de prévisualisation non persisté */
  previewThemeMode: ThemeMode | null;
  /** Met à jour les overrides de tokens UX */
  setRuntimeDesignTokenOverrides: (overrides: RuntimeDesignTokenOverrides) => void;
  /** Met à jour les overrides de prévisualisation */
  setPreviewDesignTokenOverrides: (overrides: RuntimeDesignTokenOverrides | null) => void;
  /** Met à jour le mode de prévisualisation */
  setPreviewThemeMode: (mode: ThemeMode | null) => void;
  /** Annule la prévisualisation */
  clearPreviewTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Fournisseur de contexte pour le thème
 * Gère la persistance dans le localStorage via le state global
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  const uiSettings = selectUiOptions(state);
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() => {
    if (typeof globalThis.matchMedia === 'function') {
      return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [previewDesignTokenOverrides, setPreviewDesignTokenOverridesState] = useState<RuntimeDesignTokenOverrides | null>(null);
  const [previewThemeMode, setPreviewThemeModeState] = useState<ThemeMode | null>(null);

  const previewUiSettings = useMemo(
    () => ({
      themeMode: previewThemeMode ?? uiSettings.themeMode ?? 'system',
      designTokenOverrides: previewDesignTokenOverrides ?? uiSettings.designTokenOverrides,
    }),
    [previewDesignTokenOverrides, previewThemeMode, uiSettings.designTokenOverrides, uiSettings.themeMode],
  );
  const runtimeTokens = useMemo(
    () => normalizeRuntimeDesignTokenOverrides(previewUiSettings.designTokenOverrides),
    [previewUiSettings.designTokenOverrides],
  );

  // Récupérer le mode depuis les settings, avec fallback
  const mode = previewUiSettings.themeMode;
  
  // Mode effectif (résout 'system' vers light/dark)
  const effectiveMode = mode === 'system' ? systemMode : mode;
  
  // Mettre à jour l'attribut data-theme quand effectiveMode change
  useEffect(() => {
    if (typeof globalThis.document === 'undefined') return;
    const html = globalThis.document.documentElement;
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
    if (typeof globalThis.matchMedia !== 'function') return;
    
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
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

  const setRuntimeDesignTokenOverrides = useCallback((overrides: RuntimeDesignTokenOverrides) => {
    setAppState({
      ...state,
      uiSettings: {
        ...uiSettings,
        designTokenOverrides: overrides,
      },
      ui: {
        ...state.ui,
        lastVisitedAt: new Date().toISOString(),
      },
    });
  }, [state, uiSettings]);

  const setPreviewDesignTokenOverrides = useCallback((overrides: RuntimeDesignTokenOverrides | null) => {
    setPreviewDesignTokenOverridesState(overrides);
  }, []);

  const setPreviewThemeMode = useCallback((mode: ThemeMode | null) => {
    setPreviewThemeModeState(mode);
  }, []);

  const clearPreviewTheme = useCallback(() => {
    setPreviewDesignTokenOverridesState(null);
    setPreviewThemeModeState(null);
  }, []);

  const value: ThemeContextType = {
    mode,
    effectiveMode,
    setMode,
    isDark,
    isLight,
    runtimeTokens,
    previewDesignTokenOverrides,
    previewThemeMode,
    setRuntimeDesignTokenOverrides,
    setPreviewDesignTokenOverrides,
    setPreviewThemeMode,
    clearPreviewTheme,
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
