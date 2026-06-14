// Theme Factory
// Phase 3 - Création et gestion des thèmes MUI

import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import {
  paletteTokens,
  typographyTokensForMUI,
  spacingForMUI,
  shapeTokens,
  shadowTokens,
  zIndexTokensForMUI,
  animationTokensForMUI,
} from './tokens';

// ============================================================================
// Theme Factory Base
// ============================================================================

/**
 * Crée un thème de base avec les tokens du Design System
 */
function createBaseTheme(mode: 'light' | 'dark'): ThemeOptions {
  const palette = paletteTokens[mode];
  const shadows = shadowTokens[mode];

  return {
    palette: {
      ...palette,
    },
    typography: {
      ...typographyTokensForMUI,
    },
    shape: {
      borderRadius: shapeTokens.borderRadius,
    },
    shadows: [
      shadows.none,
      shadows.xs,
      shadows.sm,
      shadows.md,
      shadows.lg,
      shadows.xl,
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
      shadows['2xl'],
    ],
    spacing: spacingForMUI.muiSpacing,
    transitions: animationTokensForMUI.transitions,
    zIndex: zIndexTokensForMUI.muiZIndex,
  };
}

// ============================================================================
// Thèmes Principaux
// ============================================================================

/**
 * Crée un thème clair basé sur le Design System
 */
export function createDesignSystemLightTheme(overrides: ThemeOptions = {}): Theme {
  return createTheme(deepmerge(createBaseTheme('light'), overrides));
}

/**
 * Crée un thème sombre basé sur le Design System
 */
export function createDesignSystemDarkTheme(overrides: ThemeOptions = {}): Theme {
  const base = createBaseTheme('dark');
  
  // Overrides spécifiques pour le dark mode
  const darkOverrides: ThemeOptions = {
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 26px rgba(0, 0, 0, 0.2)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#171a21',
            backgroundImage: 'none',
          },
        },
      },
    },
  };

  return createTheme(deepmerge(deepmerge(base, darkOverrides), overrides));
}

/**
 * Crée un thème personnalisé avec les tokens du Design System
 */
export function createDesignSystemTheme(
  mode: 'light' | 'dark',
  overrides: ThemeOptions = {}
): Theme {
  const theme = mode === 'light' 
    ? createDesignSystemLightTheme(overrides) 
    : createDesignSystemDarkTheme(overrides);
  return theme;
}

/**
 * Fusionne plusieurs thèmes
 */
export function mergeThemes(base: Theme, ...overrides: ThemeOptions[]): Theme {
  return createTheme(deepmerge(base, ...overrides));
}

// ============================================================================
// Types étendus
// ============================================================================

declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
    };
  }
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}
