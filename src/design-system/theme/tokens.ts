// Theme Tokens for MUI Integration
// Phase 3 - Adaptation des tokens pour Material-UI

import {
  brandColors,
  semanticColors,
  neutralColors,
  backgroundColors,
  textColors,
  fontSizes,
  fontSizesRem,
  fontWeights,
  lineHeights,
  spacing,
  spacingAliases,
  spacingRem,
  borderRadius,
  radiusAliases,
  shadows,
  shadowAliases,
  darkShadows,
  zIndex,
  zIndexAliases,
  easing,
  durationsMs,
  transitions,
} from '../tokens';

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
      default: backgroundColors.light.default,
      paper: backgroundColors.light.paper,
    },
    text: {
      primary: textColors.light.primary,
      secondary: textColors.light.secondary,
    },
    divider: '#e5e7eb',
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
      default: backgroundColors.dark.default,
      paper: backgroundColors.dark.paper,
    },
    text: {
      primary: textColors.dark.primary,
      secondary: textColors.dark.secondary,
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
} as const;

// ============================================================================
// Typography Tokens for MUI
// ============================================================================

export const typographyTokens = {
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
export const spacingTokensForMUI = {
  toMuiSpacing: (pxValue: number): number => pxValue / 8,
  muiSpacing: {
    0: 0,
    0.5: spacing[1] / 8,  // 4px -> 0.5
    1: spacing[2] / 8,   // 8px -> 1
    1.5: spacing[3] / 8, // 12px -> 1.5
    2: spacing[4] / 8,   // 16px -> 2
    3: spacing[6] / 8,   // 24px -> 3
    4: spacing[8] / 8,   // 32px -> 4
    6: spacing[12] / 8,  // 48px -> 6
    8: spacing[16] / 8,  // 64px -> 8
  },
  // Alias sémantiques en MUI spacing
  muiSpacingAliases: {
    xs: spacingTokensForMUI.toMuiSpacing(spacingAliases.xs),
    sm: spacingTokensForMUI.toMuiSpacing(spacingAliases.sm),
    md: spacingTokensForMUI.toMuiSpacing(spacingAliases.md),
    base: spacingTokensForMUI.toMuiSpacing(spacingAliases.base),
    lg: spacingTokensForMUI.toMuiSpacing(spacingAliases.lg),
    xl: spacingTokensForMUI.toMuiSpacing(spacingAliases.xl),
    '2xl': spacingTokensForMUI.toMuiSpacing(spacingAliases['2xl']),
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
  // Alias sémantiques
  aliases: shadowAliases,
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
  // Alias
  zIndexAliases: zIndexAliases,
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
  // Custom transitions pour les composants
  custom: {
    button: transitions.hover.button,
    card: `box-shadow ${durationsMs.normal} ${easing.easeOut}`,
    modal: `opacity ${durationsMs.normal} ${easing.easeOut}`,
    drawer: `transform ${durationsMs.normal} ${easing.easeOut}`,
    tooltip: `opacity ${durationsMs.fast} ${easing.easeOut}`,
  },
} as const;
