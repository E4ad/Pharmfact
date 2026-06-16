export type ThemeMode = 'light' | 'dark';

export const brandColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
} as const;

export const neutralColors = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

export const semanticColors = {
  link: {
    default: brandColors.primary[600],
    hover: brandColors.primary[700],
    active: brandColors.primary[800],
    visited: brandColors.primary[900],
  },
  border: {
    light: neutralColors.slate[200],
    default: neutralColors.slate[300],
    dark: neutralColors.slate[400],
  },
  divider: {
    light: neutralColors.slate[200],
    default: neutralColors.slate[300],
    dark: neutralColors.slate[700],
  },
  background: {
    primary: neutralColors.slate[50],
    secondary: neutralColors.slate[100],
    tertiary: neutralColors.slate[200],
    elevated: neutralColors.white,
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    primary: neutralColors.slate[900],
    secondary: neutralColors.slate[600],
    tertiary: neutralColors.slate[500],
    disabled: neutralColors.slate[400],
    inverse: neutralColors.white,
  },
} as const;

export const lightThemeColors = {
  background: {
    default: '#f7f7f8',
    paper: neutralColors.white,
    elevated: neutralColors.white,
    secondary: neutralColors.slate[50],
  },
  text: {
    primary: '#202124',
    secondary: '#686b70',
    tertiary: neutralColors.slate[500],
    disabled: neutralColors.slate[400],
    inverse: neutralColors.white,
  },
  border: {
    light: '#e8e8eb',
    default: neutralColors.slate[300],
    strong: neutralColors.slate[400],
  },
  divider: '#e8e8eb',
  action: {
    hover: 'rgba(37, 99, 235, 0.06)',
    selected: 'rgba(37, 99, 235, 0.1)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.06)',
    focus: 'rgba(37, 99, 235, 0.18)',
  },
} as const;

export const darkThemeColors = {
  background: {
    default: '#0f1115',
    paper: '#171a21',
    elevated: neutralColors.slate[800],
    secondary: 'rgba(255, 255, 255, 0.04)',
  },
  text: {
    primary: '#f5f5f5',
    secondary: '#a0aec0',
    tertiary: neutralColors.slate[500],
    disabled: 'rgba(255, 255, 255, 0.3)',
    inverse: neutralColors.black,
  },
  border: {
    light: 'rgba(255, 255, 255, 0.08)',
    default: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.23)',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  action: {
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.06)',
    focus: 'rgba(144, 202, 249, 0.26)',
  },
} as const;

// Card background hierarchy for visual priority
// Used in ActionCard, HomeActionCard, etc.
export const cardBackgrounds = {
  primary: neutralColors.white,
  secondary: neutralColors.slate[50],
  tertiary: neutralColors.slate[100],
} as const;

export const colors = {
  brand: brandColors,
  neutral: neutralColors,
  semantic: semanticColors,
  light: lightThemeColors,
  dark: darkThemeColors,
} as const;

export type Colors = typeof colors;
