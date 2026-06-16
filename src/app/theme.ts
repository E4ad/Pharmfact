import { createTheme, type Theme } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import {
  animationTokens,
  brandColors,
  borderWidth,
  componentBorderRadius,
  componentBorderRadiusMap,
  componentHeight,
  componentShadows,
  darkThemeColors,
  fontFamilies,
  fontWeights,
  lightThemeColors,
  neutralColors,
  spacingScale,
  typographyScale,
  typographyTokens,
} from '../design-system';
import {
  createDarkTheme as createDSDarkTheme,
  createDesignSystemTheme,
  createLightTheme as createDSLightTheme,
  mergeThemes,
} from '../design-system/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

// Thème de base commun à light et dark
const baseTheme = {
  typography: {
    fontFamily: fontFamilies.sans,
    fontSize: typographyTokens.fontSize,
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
          minHeight: componentHeight.md,
          paddingInline: spacingScale.lg,
          transition: `background-color ${animationTokens.transition.fast}, border-color ${animationTokens.transition.fast}, box-shadow ${animationTokens.transition.fast}`,
          '&:hover': {
            boxShadow: componentShadows.button.light,
          },
          '&:active': {
            boxShadow: componentShadows.button.pressed,
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
          minHeight: componentHeight.sm,
          paddingInline: spacingScale.md,
          fontSize: `${typographyScale.sm / 16}rem`,
        },
        sizeLarge: {
          minHeight: componentHeight.lg,
          paddingInline: spacingScale.xl,
          fontSize: `${typographyScale.base / 16}rem`,
        },
      },
    },
    // Button pill variant - uses full border radius
    MuiButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.button.pill,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.card,
          // Border and box-shadow are now handled by SurfaceCard component
          // to avoid double borders when using SurfaceCard
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
          padding: `${spacingScale.sm} ${spacingScale.md}`,
        },
        head: {
          fontWeight: fontWeights.semibold,
          fontSize: `${typographyScale.sm / 16}rem`,
        },
      },
    },
  },
};

// Thème clair
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

// Thème sombre
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

// Overrides spécifiques pour le dark mode
const darkThemeOverrides = {
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          // Border and box-shadow are now handled by SurfaceCard component
          // to avoid double borders when using SurfaceCard
          boxShadow: componentShadows.card.dark,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.background.paper,
          backgroundImage: 'none',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          '&:hover': {
            backgroundColor: darkThemeColors.action.hover,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
        },
        head: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          color: darkThemeColors.text.primary,
        },
        body: {
          color: darkThemeColors.text.primary,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: darkThemeColors.background.default,
          borderRight: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.background.paper,
          borderBottom: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: darkThemeColors.background.paper,
          color: darkThemeColors.text.primary,
          border: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.background.paper,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          color: darkThemeColors.text.primary,
          border: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
        },
        standardSuccess: {
          backgroundColor: darkThemeColors.action.selected,
          color: brandColors.success[600],
        },
        standardWarning: {
          backgroundColor: darkThemeColors.action.selected,
          color: brandColors.warning[600],
        },
        standardError: {
          backgroundColor: darkThemeColors.action.selected,
          color: brandColors.error[600],
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: componentBorderRadius.button.default,
          paddingInline: spacingScale.lg,
        },
        containedPrimary: {
          color: neutralColors.black,
        },
        outlined: {
          borderColor: darkThemeColors.border.default,
          color: darkThemeColors.text.primary,
          '&:hover': {
            borderColor: darkThemeColors.border.strong,
            backgroundColor: darkThemeColors.action.hover,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: darkThemeColors.border.default,
          color: darkThemeColors.text.primary,
          '&:hover': {
            backgroundColor: darkThemeColors.action.hover,
          },
          '&.Mui-selected': {
            backgroundColor: darkThemeColors.action.selected,
            borderColor: darkThemeColors.border.strong,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.primary,
        },
        select: {
          backgroundColor: darkThemeColors.action.disabledBackground,
        },
        icon: {
          color: darkThemeColors.text.secondary,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          color: darkThemeColors.text.primary,
        },
        title: {
          color: darkThemeColors.text.primary,
        },
        subheader: {
          color: darkThemeColors.text.secondary,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.primary,
          '&:last-child': {
            paddingBottom: spacingScale.md,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: darkThemeColors.background.paper,
          border: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: darkThemeColors.background.paper,
          border: `${borderWidth.thin}px solid ${darkThemeColors.border.light}`,
          color: darkThemeColors.text.primary,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.primary,
          '&:hover': {
            backgroundColor: darkThemeColors.action.hover,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
          '&.Mui-checked': {
            color: darkThemePalette.primary.main,
          },
          '&.Mui-disabled': {
            color: darkThemeColors.text.disabled,
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
          '&.Mui-checked': {
            color: darkThemePalette.primary.main,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        track: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          '.Mui-checked + &': {
            backgroundColor: darkThemeColors.action.selected,
          },
        },
        thumb: {
          backgroundColor: darkThemeColors.text.secondary,
          '.Mui-checked &': {
            backgroundColor: darkThemePalette.primary.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
        },
        indicator: {
          backgroundColor: darkThemePalette.primary.main,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
          '&.Mui-selected': {
            color: darkThemeColors.text.primary,
          },
          '&.Mui-disabled': {
            color: darkThemeColors.text.disabled,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          color: darkThemeColors.text.primary,
          border: `${borderWidth.thin}px solid ${darkThemeColors.border.default}`,
        },
        deleteIcon: {
          color: darkThemeColors.text.secondary,
          '&:hover': {
            color: darkThemeColors.text.primary,
          },
        },
        label: {
          color: darkThemeColors.text.primary,
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: darkThemePalette.primary.main,
          color: neutralColors.black,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          color: darkThemeColors.text.primary,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
          '&:hover': {
            backgroundColor: darkThemeColors.action.hover,
            color: darkThemeColors.text.primary,
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
          '&.Mui-focused': {
            color: darkThemePalette.primary.main,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.secondary,
          '&.Mui-focused': {
            color: darkThemePalette.primary.main,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: darkThemeColors.text.primary,
        },
        notchedOutline: {
          borderColor: darkThemeColors.border.default,
          '&:hover': {
            borderColor: darkThemeColors.border.strong,
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: darkThemeColors.action.disabledBackground,
          color: darkThemeColors.text.primary,
          '&:hover': {
            backgroundColor: darkThemeColors.action.hover,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: darkThemeColors.action.disabledBackground,
          },
          '&:hover': {
            backgroundColor: darkThemeColors.action.hover,
          },
        },
      },
    },
  },
};

// Créer les thèmes
const lightTheme = createTheme(deepmerge(baseTheme, { palette: lightThemePalette }));
const darkTheme = createTheme(deepmerge(deepmerge(baseTheme, { palette: darkThemePalette }), darkThemeOverrides));

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

export function createThemeFromDesignSystem(mode: ThemeMode): Theme {
  return createDesignSystemTheme(mode === 'dark' ? 'dark' : 'light');
}

export function getEnhancedTheme(mode: ThemeMode): Theme {
  return getTheme(mode);
}

export { createDSLightTheme, createDSDarkTheme, createDesignSystemTheme, mergeThemes };
