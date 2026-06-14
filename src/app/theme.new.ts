// Nouveau Thème Principal
// Phase 3 - Thème basé sur le Design System

import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import {
  brandColors,
  componentBorderRadius,
  componentShadows,
  lightThemeColors,
  darkThemeColors,
  neutralColors,
  spacingScalePx,
  typographyScale,
  typographyTokens,
  fontFamilies,
  fontWeights,
  animationTokens,
} from '../design-system';

import {
  createLightTheme as createDSLightTheme,
  createDarkTheme as createDSDarkTheme,
  createDesignSystemTheme,
  mergeThemes,
} from '../design-system/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

// ============================================================================
// Base Theme - Communes à light et dark
// ============================================================================

const baseTheme = {
  typography: {
    fontFamily: fontFamilies.sans,
    fontSize: typographyScale.base,
    h1: {
      ...typographyTokens.h1,
    },
    h2: {
      ...typographyTokens.h2,
    },
    h3: {
      ...typographyTokens.h3,
    },
    h4: {
      ...typographyTokens.h4,
    },
    h5: {
      ...typographyTokens.h5,
    },
    h6: {
      ...typographyTokens.h6,
    },
    body1: {
      ...typographyTokens.body1,
    },
    body2: {
      ...typographyTokens.body2,
    },
    button: {
      ...typographyTokens.button,
    },
    caption: {
      ...typographyTokens.caption,
    },
    overline: {
      ...typographyTokens.overline,
    },
  },
  shape: {
    borderRadius: componentBorderRadius.container,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.button.default,
          minHeight: 36,
          paddingInline: spacingScalePx.lg,
          transition: `background-color ${animationTokens.transition.fast}, border-color ${animationTokens.transition.fast}, box-shadow ${animationTokens.transition.fast}, transform ${animationTokens.transition.fast}`,
          '&:hover': {
            boxShadow: componentShadows.button.light,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: componentShadows.button.pressed,
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            cursor: 'not-allowed',
            opacity: 0.52,
          },
          '&.Mui-focusVisible': {
            outline: `3px solid ${brandColors.primary[600]}`,
            outlineOffset: 3,
          },
        },
        sizeSmall: {
          minHeight: 32,
          paddingInline: spacingScalePx.md,
          fontSize: `${typographyScale.sm / 16}rem`,
        },
        sizeLarge: {
          minHeight: 44,
          paddingInline: spacingScalePx.xl,
          fontSize: `${typographyScale.base / 16}rem`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.card,
          border: `1px solid ${lightThemeColors.border.light}`,
          boxShadow: componentShadows.card.light,
          transition: `box-shadow ${animationTokens.transition.normal}`,
          '&:hover': {
            boxShadow: componentShadows.card.elevatedLight,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.avatar,
          transition: `background-color ${animationTokens.transition.fast}, color ${animationTokens.transition.fast}`,
          '&.Mui-focusVisible': {
            outline: `3px solid ${brandColors.primary[600]}`,
            outlineOffset: 3,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.button.default,
          '&.Mui-focusVisible': {
            outline: `3px solid ${brandColors.primary[600]}`,
            outlineOffset: 3,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.input,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
            borderColor: brandColors.primary[600],
          },
        },
        notchedOutline: {
          borderColor: lightThemeColors.border.default,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.chip,
          fontWeight: fontWeights.medium,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.alert,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: componentBorderRadius.dialog,
          boxShadow: componentShadows.modal.light,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: componentBorderRadius.paper,
          boxShadow: componentShadows.dropdown.light,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: componentBorderRadius.tooltip,
          boxShadow: componentShadows.tooltip.light,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: `${spacingScalePx.sm} ${spacingScalePx.md}`,
        },
        head: {
          fontWeight: fontWeights.semibold,
          fontSize: `${typographyScale.sm / 16}rem`,
        },
      },
    },
  },
};

// ============================================================================
// Light Theme Palette
// ============================================================================

const lightThemePalette = {
  mode: 'light' as const,
  background: {
    default: lightThemeColors.background.default,
    paper: lightThemeColors.background.paper,
  },
  primary: {
    main: brandColors.primary[600],
    light: brandColors.primary[500],
    dark: brandColors.primary[700],
    contrastText: neutralColors.white,
  },
  success: {
    main: '#059669',
    light: brandColors.success[500],
    dark: '#047857',
  },
  warning: {
    main: brandColors.warning[600],
    light: brandColors.warning[500],
    dark: brandColors.warning[700],
  },
  error: {
    main: brandColors.error[600],
    light: brandColors.error[500],
    dark: brandColors.error[700],
  },
  text: {
    primary: lightThemeColors.text.primary,
    secondary: lightThemeColors.text.secondary,
  },
  divider: lightThemeColors.divider,
};

// ============================================================================
// Dark Theme Palette & Overrides
// ============================================================================

const darkThemePalette = {
  mode: 'dark' as const,
  background: {
    default: darkThemeColors.background.default,
    paper: darkThemeColors.background.paper,
  },
  primary: {
    main: '#90caf9',
    light: '#c7d8f0',
    dark: '#639ddb',
    contrastText: neutralColors.black,
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#000000',
  },
  warning: {
    main: '#ff9800',
    light: '#ffc947',
    dark: '#c66900',
    contrastText: '#000000',
  },
  error: {
    main: '#f44336',
    light: '#ff7961',
    dark: '#ba000d',
    contrastText: '#000000',
  },
  text: {
    primary: darkThemeColors.text.primary,
    secondary: darkThemeColors.text.secondary,
  },
  divider: darkThemeColors.divider,
};

const darkThemeOverrides = {
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
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          paddingInline: 20,
        },
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

// ============================================================================
// Créer les thèmes
// ============================================================================

const lightTheme = createTheme(deepmerge(baseTheme, { palette: lightThemePalette }));
const darkTheme = createTheme(deepmerge(deepmerge(baseTheme, { palette: darkThemePalette }), darkThemeOverrides));

// ============================================================================
// Utilitaires
// ============================================================================

// Détecter le mode système
export function getSystemMode(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Retourner le thème approprié en fonction du mode
export function getTheme(mode: ThemeMode): Theme {
  if (mode === 'dark') return darkTheme;
  if (mode === 'light') return lightTheme;
  // system
  return getSystemMode() === 'dark' ? darkTheme : lightTheme;
}

// Thème par défaut (pour la compatibilité descendante)
export const theme = lightTheme;

// Exporter les thèmes pour les tests
export { lightTheme, darkTheme };

// ============================================================================
// Fonctions de création basées sur le Design System
// ============================================================================

/**
 * Crée un thème basé sur le Design System
 * Utilise les nouveaux tokens de la Phase 3
 */
export function createThemeFromDesignSystem(mode: ThemeMode): Theme {
  return createDesignSystemTheme(mode === 'dark' ? 'dark' : 'light');
}

/**
 * Obtient un thème avec les améliorations de la Phase 3
 * Combine l'ancien système avec le nouveau Design System
 */
export function getEnhancedTheme(mode: ThemeMode): Theme {
  return getTheme(mode);
}

// Exporter les créateurs de thèmes du Design System
export { createDSLightTheme, createDSDarkTheme, createDesignSystemTheme, mergeThemes } from '../design-system/theme';
