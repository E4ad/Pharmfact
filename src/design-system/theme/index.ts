// Theme Factory
// Phase 3 - Création et gestion des thèmes MUI

import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import {
  paletteTokens,
  typographyTokens,
  spacingTokensForMUI,
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
      ...typographyTokens,
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
    spacing: spacingTokensForMUI.muiSpacing,
    transitions: animationTokensForMUI.transitions,
    zIndex: zIndexTokensForMUI.muiZIndex,
  };
}

// ============================================================================
// Thèmes Principaux
// ============================================================================

/**
 * Thème clair
 */
export function createLightTheme(overrides: ThemeOptions = {}): Theme {
  return createTheme(deepmerge(createBaseTheme('light'), overrides));
}

/**
 * Thème sombre
 */
export function createDarkTheme(overrides: ThemeOptions = {}): Theme {
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
      MuiInputBase: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
          head: {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: '#f5f5f5',
          },
          body: {
            color: '#f5f5f5',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#0f1115',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#171a21',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#171a21',
            color: '#f5f5f5',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            backgroundColor: '#171a21',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          containedPrimary: {
            color: '#000000',
          },
          outlined: {
            borderColor: 'rgba(255, 255, 255, 0.23)',
            color: '#f5f5f5',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderColor: 'rgba(255, 255, 255, 0.23)',
            color: '#f5f5f5',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            color: '#f5f5f5',
          },
          select: {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
          icon: {
            color: '#a0aec0',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: '#171a21',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#f5f5f5',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#f5f5f5',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          },
          deleteIcon: {
            color: '#a0aec0',
            '&:hover': {
              color: '#f5f5f5',
            },
          },
          label: {
            color: '#f5f5f5',
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
            '&.Mui-checked': {
              color: '#90caf9',
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
            },
          },
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
            '&.Mui-checked': {
              color: '#90caf9',
            },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          track: {
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            '.Mui-checked + &': {
              backgroundColor: 'rgba(144, 202, 249, 0.3)',
            },
          },
          thumb: {
            backgroundColor: '#a0aec0',
            '.Mui-checked &': {
              backgroundColor: '#90caf9',
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
          },
          indicator: {
            backgroundColor: '#90caf9',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
            '&.Mui-selected': {
              color: '#f5f5f5',
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: '#f5f5f5',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
          standardSuccess: {
            backgroundColor: 'rgba(72, 187, 120, 0.14)',
            color: '#4caf50',
          },
          standardWarning: {
            backgroundColor: 'rgba(245, 158, 11, 0.14)',
            color: '#ff9800',
          },
          standardError: {
            backgroundColor: 'rgba(244, 67, 54, 0.14)',
            color: '#f44336',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            color: '#f5f5f5',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
            '&.Mui-focused': {
              color: '#90caf9',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
            '&.Mui-focused': {
              color: '#90caf9',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            color: '#f5f5f5',
          },
          notchedOutline: {
            borderColor: 'rgba(255, 255, 255, 0.23)',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: '#171a21',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            backgroundColor: '#90caf9',
            color: '#000000',
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: '#f5f5f5',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: '#a0aec0',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#f5f5f5',
            },
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:nth-of-type(odd)': {
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
            },
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
            },
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
  const theme = mode === 'light' ? createLightTheme(overrides) : createDarkTheme(overrides);
  return theme;
}

/**
 * Fusionne plusieurs thèmes
 */
export function mergeThemes(base: Theme, ...overrides: ThemeOptions[]): Theme {
  return createTheme(deepmerge(base, ...overrides));
}

/**
 * Thèmes par défaut
 */
export const lightTheme = createLightTheme();
export const darkTheme = createDarkTheme();

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
