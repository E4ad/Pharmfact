import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import { deepmerge } from '@mui/utils';
import {
  animationDurations,
  animationEasings,
  brandColors,
  componentBorderRadius,
  darkShadows,
  darkThemeColors,
  fontFamilies,
  fontWeights,
  lightShadows,
  lightThemeColors,
  neutralColors,
  typographyTokens,
  zIndexScale,
} from '../tokens';

export type DesignSystemThemeMode = 'light' | 'dark' | 'system';

function resolveMode(mode: DesignSystemThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function createMuiShadows(mode: 'light' | 'dark'): ThemeOptions['shadows'] {
  const shadows = mode === 'dark' ? darkShadows : lightShadows;
  const values = [
    shadows.none,
    shadows.xs,
    shadows.sm,
    shadows.md,
    shadows.lg,
    shadows.xl,
    shadows['2xl'],
  ];

  while (values.length < 25) {
    values.push(shadows['2xl']);
  }

  return values as ThemeOptions['shadows'];
}

function createDesignSystemOptions(mode: 'light' | 'dark'): ThemeOptions {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
      background: {
        default: isDark ? darkThemeColors.background.default : lightThemeColors.background.default,
        paper: isDark ? darkThemeColors.background.paper : lightThemeColors.background.paper,
      },
      primary: isDark
        ? {
            main: '#90caf9',
            light: '#c7d8f0',
            dark: '#639ddb',
            contrastText: neutralColors.black,
          }
        : {
            main: brandColors.primary[600],
            light: brandColors.primary[500],
            dark: brandColors.primary[700],
            contrastText: neutralColors.white,
          },
      secondary: {
        main: isDark ? neutralColors.slate[400] : neutralColors.slate[600],
        light: isDark ? neutralColors.slate[300] : neutralColors.slate[500],
        dark: isDark ? neutralColors.slate[500] : neutralColors.slate[700],
        contrastText: isDark ? neutralColors.black : neutralColors.white,
      },
      success: {
        main: isDark ? '#4caf50' : '#059669',
        light: isDark ? '#81c784' : brandColors.success[500],
        dark: isDark ? '#388e3c' : '#047857',
        contrastText: isDark ? neutralColors.black : neutralColors.white,
      },
      warning: {
        main: isDark ? '#ff9800' : brandColors.warning[600],
        light: isDark ? '#ffc947' : brandColors.warning[500],
        dark: isDark ? '#c66900' : brandColors.warning[700],
        contrastText: neutralColors.black,
      },
      error: {
        main: isDark ? '#f44336' : brandColors.error[600],
        light: isDark ? '#ff7961' : brandColors.error[500],
        dark: isDark ? '#ba000d' : brandColors.error[700],
        contrastText: isDark ? neutralColors.black : neutralColors.white,
      },
      text: {
        primary: isDark ? darkThemeColors.text.primary : lightThemeColors.text.primary,
        secondary: isDark ? darkThemeColors.text.secondary : lightThemeColors.text.secondary,
      },
      divider: isDark ? darkThemeColors.divider : lightThemeColors.divider,
    },
    typography: {
      fontFamily: fontFamilies.sans,
      fontSize: typographyTokens.fontSize,
      h1: { ...typographyTokens.h1 },
      h2: { ...typographyTokens.h2 },
      h3: { ...typographyTokens.h3 },
      h4: { ...typographyTokens.h4 },
      h5: { ...typographyTokens.h5 },
      h6: { ...typographyTokens.h6 },
      body1: { ...typographyTokens.body1 },
      body2: { ...typographyTokens.body2 },
      button: { ...typographyTokens.button },
      caption: { ...typographyTokens.caption },
      overline: { ...typographyTokens.overline },
    },
    shape: {
      borderRadius: componentBorderRadius.container,
    },
    shadows: createMuiShadows(mode),
    zIndex: {
      appBar: zIndexScale.appBar,
      drawer: zIndexScale.drawer,
      modal: zIndexScale.modal,
      snackbar: zIndexScale.notification,
      tooltip: zIndexScale.tooltip,
    },
    transitions: {
      duration: {
        shortest: Number.parseInt(animationDurations.fastest, 10),
        shorter: Number.parseInt(animationDurations.faster, 10),
        short: Number.parseInt(animationDurations.fast, 10),
        standard: Number.parseInt(animationDurations.normal, 10),
        complex: Number.parseInt(animationDurations.slow, 10),
        enteringScreen: Number.parseInt(animationDurations.slower, 10),
        leavingScreen: Number.parseInt(animationDurations.slower, 10),
      },
      easing: {
        easeInOut: animationEasings.standard,
        easeOut: animationEasings.enter,
        easeIn: animationEasings.exit,
        sharp: animationEasings.exit,
      },
    },
  };
}

export function createDesignSystemTheme(
  mode: DesignSystemThemeMode,
  overrides: ThemeOptions = {},
): Theme {
  return createTheme(deepmerge(createDesignSystemOptions(resolveMode(mode)), overrides));
}

export function createLightTheme(overrides: ThemeOptions = {}): Theme {
  return createDesignSystemTheme('light', overrides);
}

export function createDarkTheme(overrides: ThemeOptions = {}): Theme {
  return createDesignSystemTheme('dark', overrides);
}

export function mergeThemes(base: Theme, ...overrides: ThemeOptions[]): Theme {
  return createTheme(overrides.reduce((current, override) => deepmerge(current, override), base));
}

export const createDSLightTheme = createLightTheme;
export const createDSDarkTheme = createDarkTheme;
