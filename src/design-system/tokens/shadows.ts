import type { ThemeMode } from './colors';

export const lightShadows = {
  none: 'none',
  xs: '0 1px 2px rgba(15, 23, 42, 0.06)',
  sm: '0 1px 3px rgba(15, 23, 42, 0.1), 0 1px 2px rgba(15, 23, 42, 0.06)',
  md: '0 4px 6px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.06)',
  lg: '0 10px 15px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.05)',
  xl: '0 20px 25px rgba(15, 23, 42, 0.08), 0 8px 10px rgba(15, 23, 42, 0.04)',
  '2xl': '0 25px 50px rgba(15, 23, 42, 0.25)',
} as const;

export const darkShadows = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.24)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.32), 0 1px 2px rgba(0, 0, 0, 0.24)',
  md: '0 4px 6px rgba(0, 0, 0, 0.34), 0 2px 4px rgba(0, 0, 0, 0.26)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.36), 0 4px 6px rgba(0, 0, 0, 0.28)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.38), 0 8px 10px rgba(0, 0, 0, 0.3)',
  '2xl': '0 25px 50px rgba(0, 0, 0, 0.5)',
} as const;

export const componentShadows = {
  card: {
    light: lightShadows.sm,
    dark: darkShadows.sm,
    elevatedLight: lightShadows.md,
    elevatedDark: darkShadows.md,
  },
  button: {
    light: lightShadows.xs,
    dark: darkShadows.xs,
    pressed: lightShadows.none,
  },
  modal: {
    light: lightShadows['2xl'],
    dark: darkShadows['2xl'],
  },
  dropdown: {
    light: lightShadows.lg,
    dark: darkShadows.lg,
  },
  tooltip: {
    light: lightShadows.md,
    dark: darkShadows.md,
  },
} as const;

export function getElevationShadow(level: keyof typeof lightShadows, mode: ThemeMode = 'light'): string {
  return mode === 'dark' ? darkShadows[level] : lightShadows[level];
}
