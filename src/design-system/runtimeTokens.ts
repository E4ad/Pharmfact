import { brandColors, componentBorderRadius, componentShadows, darkShadows, lightShadows, type ThemeMode } from './tokens';
import { borderRadiusScale } from './tokens/borderRadius';

export type RuntimeShadowIntensity = 'none' | 'soft' | 'elevated';

export type RuntimeDesignTokenOverrides = {
  surfaceRadius?: number;
  controlRadius?: number;
  iconRadius?: number;
  borderWidth?: number;
  primaryHue?: number;
  shadowIntensity?: RuntimeShadowIntensity;
};

type RawRuntimeDesignTokenOverrides = {
  surfaceRadius?: unknown;
  controlRadius?: unknown;
  iconRadius?: unknown;
  borderWidth?: unknown;
  primaryHue?: unknown;
  shadowIntensity?: unknown;
};

type RuntimePrimaryPalette = {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
};

export type RuntimeDesignTokens = {
  surfaceRadius: number;
  controlRadius: number;
  iconRadius: number;
  borderWidth: number;
  primaryHue: number;
  primary: {
    light: RuntimePrimaryPalette;
    dark: RuntimePrimaryPalette;
  };
  shadowIntensity: RuntimeShadowIntensity;
  shadows: {
    card: {
      light: string;
      dark: string;
      elevatedLight: string;
      elevatedDark: string;
    };
    button: {
      light: string;
      dark: string;
      elevatedLight: string;
      elevatedDark: string;
      pressed: string;
    };
    modal: {
      light: string;
      dark: string;
    };
    dropdown: {
      light: string;
      dark: string;
    };
    tooltip: {
      light: string;
      dark: string;
    };
    pageHeader: {
      light: string;
      dark: string;
    };
  };
};

// Default values: surfaces and controls at 10px, borderWidth at 2px
export const defaultRuntimeDesignTokenOverrides: Required<RuntimeDesignTokenOverrides> = {
  surfaceRadius: 10,
  controlRadius: 10,
  iconRadius: 10,
  borderWidth: 2,
  primaryHue: 217,
  shadowIntensity: 'soft',
};

const runtimeDesignTokenLimits = {
  surfaceRadius: { min: 0, max: 24 },
  controlRadius: { min: 0, max: 12 },
  iconRadius: { min: 0, max: 12 },
  borderWidth: { min: 0, max: 2 },
  primaryHue: { min: 0, max: 359 },
};

const validShadowIntensities = new Set<RuntimeShadowIntensity>(['none', 'soft', 'elevated']);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readFiniteNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

function normalizePrimaryHue(value: unknown) {
  const hue = readFiniteNumber(value, defaultRuntimeDesignTokenOverrides.primaryHue, runtimeDesignTokenLimits.primaryHue.min, runtimeDesignTokenLimits.primaryHue.max);
  return hue === 360 ? 0 : hue;
}

function readShadowIntensity(value: unknown): RuntimeShadowIntensity {
  if (typeof value === 'string' && validShadowIntensities.has(value as RuntimeShadowIntensity)) {
    return value as RuntimeShadowIntensity;
  }
  return defaultRuntimeDesignTokenOverrides.shadowIntensity;
}

function toHexComponent(value: number) {
  const rounded = Math.round(value * 255);
  return clamp(rounded, 0, 255).toString(16).padStart(2, '0');
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = c;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = c;
  } else if (hue < 180) {
    green = c;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = c;
  } else if (hue < 300) {
    red = x;
    blue = c;
  } else {
    red = c;
    blue = x;
  }

  return `#${toHexComponent(red + m)}${toHexComponent(green + m)}${toHexComponent(blue + m)}`;
}

function resolvePrimary(hue: number): RuntimeDesignTokens['primary'] {
  if (hue === defaultRuntimeDesignTokenOverrides.primaryHue) {
    return {
      light: {
        main: brandColors.primary[600],
        light: brandColors.primary[500],
        dark: brandColors.primary[700],
        contrastText: '#ffffff',
      },
      dark: {
        main: '#90caf9',
        light: '#c7d8f0',
        dark: '#639ddb',
        contrastText: '#000000',
      },
    };
  }

  const saturation = 83;
  const baseLightness = 54;

  return {
    light: {
      main: hslToHex(hue, saturation, baseLightness),
      light: hslToHex(hue, saturation, 60),
      dark: hslToHex(hue, saturation, 36),
      contrastText: '#ffffff',
    },
    dark: {
      main: hslToHex(hue, saturation, 75),
      light: hslToHex(hue, saturation, 88),
      dark: hslToHex(hue, saturation, 57),
      contrastText: '#000000',
    },
  };
}

function resolveShadows(intensity: RuntimeShadowIntensity, mode: ThemeMode): RuntimeDesignTokens['shadows'] {
  const shadows = mode === 'dark' ? darkShadows : lightShadows;

  if (intensity === 'none') {
    return {
      card: {
        light: shadows.none,
        dark: shadows.none,
        elevatedLight: shadows.sm,
        elevatedDark: shadows.sm,
      },
      button: {
        light: shadows.none,
        dark: shadows.none,
        elevatedLight: shadows.xs,
        elevatedDark: shadows.xs,
        pressed: shadows.none,
      },
      modal: {
        light: shadows.sm,
        dark: shadows.sm,
      },
      dropdown: {
        light: shadows.md,
        dark: shadows.md,
      },
      tooltip: {
        light: shadows.sm,
        dark: shadows.sm,
      },
      pageHeader: {
        light: shadows.lg,
        dark: shadows.lg,
      },
    };
  }

  if (intensity === 'elevated') {
    return {
      card: {
        light: shadows.lg,
        dark: shadows.lg,
        elevatedLight: shadows.xl,
        elevatedDark: shadows.xl,
      },
      button: {
        light: shadows.sm,
        dark: shadows.sm,
        elevatedLight: shadows.md,
        elevatedDark: shadows.md,
        pressed: shadows.none,
      },
      modal: {
        light: shadows['2xl'],
        dark: shadows['2xl'],
      },
      dropdown: {
        light: shadows.xl,
        dark: shadows.xl,
      },
      tooltip: {
        light: shadows.lg,
        dark: shadows.lg,
      },
      pageHeader: {
        light: shadows.xl,
        dark: shadows.xl,
      },
    };
  }

  return {
    ...componentShadows,
    pageHeader: {
      light: lightShadows.lg,
      dark: darkShadows.lg,
    },
  };
}

export function normalizeRuntimeDesignTokenOverrides(overrides?: RawRuntimeDesignTokenOverrides | RuntimeDesignTokenOverrides | null): RuntimeDesignTokens {
  const surfaceRadius = readFiniteNumber(
    overrides?.surfaceRadius,
    defaultRuntimeDesignTokenOverrides.surfaceRadius,
    runtimeDesignTokenLimits.surfaceRadius.min,
    runtimeDesignTokenLimits.surfaceRadius.max,
  );
  const controlRadius = readFiniteNumber(
    overrides?.controlRadius,
    defaultRuntimeDesignTokenOverrides.controlRadius,
    runtimeDesignTokenLimits.controlRadius.min,
    runtimeDesignTokenLimits.controlRadius.max,
  );
  const iconRadius = readFiniteNumber(
    overrides?.iconRadius,
    defaultRuntimeDesignTokenOverrides.iconRadius,
    runtimeDesignTokenLimits.iconRadius.min,
    runtimeDesignTokenLimits.iconRadius.max,
  );
  const borderWidth = readFiniteNumber(
    overrides?.borderWidth,
    defaultRuntimeDesignTokenOverrides.borderWidth,
    runtimeDesignTokenLimits.borderWidth.min,
    runtimeDesignTokenLimits.borderWidth.max,
  );
  const primaryHue = normalizePrimaryHue(overrides?.primaryHue);
  const shadowIntensity = readShadowIntensity(overrides?.shadowIntensity);

  return {
    surfaceRadius,
    controlRadius,
    iconRadius,
    borderWidth,
    primaryHue,
    primary: resolvePrimary(primaryHue),
    shadowIntensity,
    shadows: resolveShadows(shadowIntensity, 'light'),
  };
}

declare module '@mui/material/styles' {
  interface Theme {
    runtimeTokens: RuntimeDesignTokens;
  }

  interface ThemeOptions {
    runtimeTokens?: RuntimeDesignTokens;
  }
}
