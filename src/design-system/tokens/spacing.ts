const BASE_UNIT = 4;

function pxToRem(px: number): string {
  return `${px / 16}rem`;
}

export const spacingScalePx = {
  '2xs': BASE_UNIT,
  xs: BASE_UNIT * 2,
  sm: BASE_UNIT * 3,
  md: BASE_UNIT * 4,
  lg: BASE_UNIT * 6,
  xl: BASE_UNIT * 8,
  '2xl': BASE_UNIT * 10,
  '3xl': BASE_UNIT * 12,
  '4xl': BASE_UNIT * 16,
  '5xl': BASE_UNIT * 20,
  '6xl': BASE_UNIT * 24,
} as const;

export const spacingScale = {
  '2xs': pxToRem(spacingScalePx['2xs']),
  xs: pxToRem(spacingScalePx.xs),
  sm: pxToRem(spacingScalePx.sm),
  md: pxToRem(spacingScalePx.md),
  lg: pxToRem(spacingScalePx.lg),
  xl: pxToRem(spacingScalePx.xl),
  '2xl': pxToRem(spacingScalePx['2xl']),
  '3xl': pxToRem(spacingScalePx['3xl']),
  '4xl': pxToRem(spacingScalePx['4xl']),
  '5xl': pxToRem(spacingScalePx['5xl']),
  '6xl': pxToRem(spacingScalePx['6xl']),
} as const;

export const contextSpacing = {
  card: {
    padding: spacingScale.lg,
    paddingCompact: spacingScale.md,
    gap: spacingScale.md,
  },
  table: {
    cellPaddingY: spacingScale.sm,
    cellPaddingX: spacingScale.md,
    headerHeight: spacingScale['3xl'],
  },
  form: {
    fieldGap: spacingScale.lg,
    labelGap: spacingScale.xs,
    helperGap: spacingScale.xs,
  },
  list: {
    itemGap: spacingScale.sm,
    sectionGap: spacingScale.xl,
  },
  modal: {
    padding: spacingScale.xl,
    gap: spacingScale.lg,
  },
  section: {
    gap: spacingScale['3xl'],
    gapCompact: spacingScale.xl,
  },
} as const;
