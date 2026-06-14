// Theme Tokens for MUI Integration
// Phase 3 - Adaptation des tokens pour Material-UI

import {
  brandColors,
  semanticColors,
  neutralColors,
  lightThemeColors,
  darkThemeColors,
  typographyScale,
  fontWeights,
  lineHeights,
  spacingScalePx,
  spacingScale,
  componentBorderRadius,
  lightShadows,
  darkShadows,
  componentShadows,
  zIndexScale,
  animationDurations,
  animationEasings,
  animationTokens,
} from '../tokens';

// Alias pour compatibilité avec les noms attendus
const fontSizes = typographyScale;
const fontSizesRem = Object.fromEntries(
  Object.entries(typographyScale).map(([key, pxValue]) => [key, `${pxValue / 16}rem`])
) as Record<keyof typeof typographyScale, string>;
const spacing = spacingScalePx;
const spacingAliases = spacingScale;
const spacingRem = Object.fromEntries(
  Object.entries(spacingScalePx).map(([key, pxValue]) => [key, `${pxValue / 16}rem`])
) as Record<keyof typeof spacingScalePx, string>;
const borderRadius = borderRadiusScale;
const radiusAliases = componentBorderRadius;
const shadows = lightShadows;
const shadowAliases = componentShadows;
const zIndex = zIndexScale;
const zIndexAliases = zIndexScale;
const easing = animationEasings;
const durationsMs = animationDurations;
const transitions = animationTokens;

// ============================================================================
// Palette Tokens for MUI
// ============================================================================

export const paletteTokens = {
  light: {
    mode: 'light' as const,
    primary: {
      main: brandColors.primary[600],
      light: brandColors.primary[500],
      dark: brandColors.primary[700],
      contrastText: neutralColors.white,
    },
    secondary: {
      main: brandColors.secondary[600],
      light: brandColors.secondary[500],
      dark: brandColors.secondary[700],
      contrastText: neutralColors.white,
    },
    success: {
      main: semanticColors.success.main,
      light: semanticColors.success.light,
      dark: semanticColors.success.dark,
      contrastText: neutralColors.white,
    },
    warning: {
      main: semanticColors.warning.main,
      light: semanticColors.warning.light,
      dark: semanticColors.warning.dark,
      contrastText: neutralColors.black,
    },
    error: {
      main: semanticColors.error.main,
      light: semanticColors.error.light,
      dark: semanticColors.error.dark,
      contrastText: neutralColors.white,
    },
    info: {
      main: semanticColors.info.main,
      light: semanticColors.info.light,
      dark: semanticColors.info.dark,
      contrastText: neutralColors.white,
    },
    background: {
      default: lightThemeColors.background.default,
      paper: lightThemeColors.background.paper,
    },
    text: {
      primary: lightThemeColors.text.primary,
      secondary: lightThemeColors.text.secondary,
    },
    divider: lightThemeColors.divider,
  },
  dark: {
    mode: 'dark' as const,
    primary: {
      main: '#90caf9',
      light: '#c7d8f0',
      dark: '#639ddb',
      contrastText: neutralColors.black,
    },
    secondary: {
      main: '#b39ddb',
      light: '#d1c4e9',
      dark: '#826aa8',
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
    info: {
      main: '#64b5f6',
      light: '#9be7ff',
      dark: '#2286c3',
      contrastText: neutralColors.black,
    },
    background: {
      default: darkThemeColors.background.default,
      paper: darkThemeColors.background.paper,
    },
    text: {
      primary: darkThemeColors.text.primary,
      secondary: darkThemeColors.text.secondary,
    },
    divider: darkThemeColors.divider,
  },
} as const;

// ============================================================================
// Typography Tokens for MUI
// ============================================================================

export const typographyTokensForMUI = {
  fontFamily: `'Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif`,
  fontSize: fontSizes.base,
  h1: {
    fontSize: fontSizesRem['4xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: fontSizesRem['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: '-0.025em',
  },
  h3: {
    fontSize: fontSizesRem['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.tight,
    letterSpacing: '-0.025em',
  },
  h4: {
    fontSize: fontSizesRem.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
  },
  h5: {
    fontSize: fontSizesRem.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
  },
  h6: {
    fontSize: fontSizesRem.base,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
  },
  body1: {
    fontSize: fontSizesRem.base,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
  },
  body2: {
    fontSize: fontSizesRem.sm,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
  },
  button: {
    fontSize: fontSizesRem.base,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: '0.00938em',
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontSize: fontSizesRem.xs,
    fontWeight: fontWeights.normal,
    lineHeight: lineHeights.relaxed,
  },
  overline: {
    fontSize: fontSizesRem.xs,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: '0.06667em',
    textTransform: 'uppercase' as const,
  },
} as const;

// ============================================================================
// Spacing Tokens for MUI
// ============================================================================

// Convert px spacing to MUI spacing (MUI spacing 1 = 8px)
export const spacingForMUI = {
  toMuiSpacing: (pxValue: number): number => pxValue / 8,
  muiSpacing: {
    0: 0,
    0.5: 0.5,   // 4px
    1: 1,       // 8px
    1.5: 1.5,   // 12px
    2: 2,       // 16px
    3: 3,       // 24px
    4: 4,       // 32px
    6: 6,       // 48px
    8: 8,       // 64px
  },
} as const;

// ============================================================================
// Shape Tokens for MUI
// ============================================================================

export const shapeTokens = {
  borderRadius: borderRadius.sm,
  radiusAliases: radiusAliases,
} as const;

// ============================================================================
// Shadow Tokens for MUI
// ============================================================================

export const shadowTokens = {
  light: {
    none: shadows.none,
    xs: shadows.xs,
    sm: shadows.sm,
    md: shadows.md,
    lg: shadows.lg,
    xl: shadows.xl,
    '2xl': shadows['2xl'],
  },
  dark: {
    none: darkShadows.none,
    xs: darkShadows.xs,
    sm: darkShadows.sm,
    md: darkShadows.md,
    lg: darkShadows.lg,
    xl: darkShadows.xl,
    '2xl': darkShadows['2xl'],
  },
} as const;

// ============================================================================
// Z-Index Tokens for MUI
// ============================================================================

export const zIndexTokensForMUI = {
  muiZIndex: {
    mobileStepper: zIndex.appBar,
    speedDial: zIndex.appBar,
    appBar: zIndex.appBar,
    drawer: zIndex.drawer,
    modal: zIndex.dialog,
    snackbar: zIndex.snackbar,
    tooltip: zIndex.tooltip,
  },
} as const;

// ============================================================================
// Animation Tokens for MUI
// ============================================================================

export const animationTokensForMUI = {
  transitions: {
    duration: {
      shortest: durationsMs.fastest,
      shorter: durationsMs.faster,
      short: durationsMs.fast,
      standard: durationsMs.normal,
      complex: durationsMs.slow,
      enteringScreen: durationsMs.slower,
      leavingScreen: durationsMs.slower,
    },
    easing: {
      easeInOut: easing.easeInOut,
      easeOut: easing.easeOut,
      easeIn: easing.easeIn,
      sharp: easing.easeIn,
    },
  },
} as const;
