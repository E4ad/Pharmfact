export const typographyScale = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 20,
  xl: 25,
  '2xl': 31,
  '3xl': 39,
  '4xl': 49,
  '5xl': 61,
  '6xl': 76,
} as const;

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 650,
  bold: 700,
  extrabold: 800,
} as const;

export const lineHeights = {
  none: 1,
  tight: 1.15,
  snug: 1.25,
  normal: 1.35,
  relaxed: 1.5,
  loose: 1.75,
} as const;

export const letterSpacings = {
  tighter: '-0.055em',
  tight: '-0.035em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
} as const;

export const fontFamilies = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"Fira Code", "JetBrains Mono", Monaco, Menlo, Consolas, monospace',
} as const;

export function pxToRem(px: number): string {
  return `${px / 16}rem`;
}

export const typographyTokens = {
  fontFamily: fontFamilies.sans,
  fontFamilyMono: fontFamilies.mono,
  fontSize: typographyScale.base,
  scale: typographyScale,
  weights: fontWeights,
  lineHeights,
  letterSpacings,
  h1: {
    fontSize: `clamp(${pxToRem(typographyScale['3xl'])}, 6vw, ${pxToRem(typographyScale['5xl'])})`,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.tighter,
    lineHeight: lineHeights.tight,
  },
  h2: {
    fontSize: `clamp(${pxToRem(typographyScale['2xl'])}, 4vw, ${pxToRem(typographyScale['4xl'])})`,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacings.tighter,
    lineHeight: lineHeights.tight,
  },
  h3: {
    fontSize: pxToRem(typographyScale['2xl']),
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
    lineHeight: lineHeights.snug,
  },
  h4: {
    fontSize: pxToRem(typographyScale.xl),
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.tight,
    lineHeight: lineHeights.snug,
  },
  h5: {
    fontSize: pxToRem(typographyScale.lg),
    fontWeight: fontWeights.semibold,
    letterSpacing: '-0.025em',
    lineHeight: lineHeights.snug,
  },
  h6: {
    fontSize: pxToRem(typographyScale.base),
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.normal,
  },
  body1: {
    fontSize: pxToRem(typographyScale.base),
    lineHeight: lineHeights.normal,
  },
  body2: {
    fontSize: pxToRem(typographyScale.sm),
    lineHeight: lineHeights.normal,
  },
  button: {
    fontSize: pxToRem(typographyScale.sm),
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.normal,
    textTransform: 'none' as const,
  },
  caption: {
    fontSize: pxToRem(typographyScale.xs),
    lineHeight: lineHeights.normal,
  },
  overline: {
    fontSize: pxToRem(typographyScale.xs),
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacings.wider,
    lineHeight: lineHeights.snug,
    textTransform: 'uppercase' as const,
  },
} as const;
