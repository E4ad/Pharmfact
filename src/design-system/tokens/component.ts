// Component-specific design tokens
// Phase 3 - Component Family Consistency
// Phase 7 - Spacing and Height Tokenization

import { borderRadiusScale } from './borderRadius';
import { spacingScalePx, spacingScale } from './spacing';

// Re-export borderRadius and spacing values for convenience
export { borderRadiusScale, spacingScale };

// Component Heights - ensure buttons and inputs share the same height when on same form
export const componentHeight = {
  xs: 28,    // extra small chips, badges
  sm: 32,    // small buttons, compact inputs
  md: 40,    // default buttons, inputs, selects
  lg: 48,    // large buttons, tall inputs
} as const;

// Fractional spacing for fine adjustments (used in PageSection, ConfirmDialog, etc.)
// MUI spacing units: 1 = 8px, so 2.5 = 20px, 3.5 = 28px
// BASE_UNIT = 4px in our system
const BASE_UNIT = 4;
export const spacingFractional = {
  '0.25': BASE_UNIT * 0.5,    // 2px
  '0.5': BASE_UNIT * 1,     // 4px
  '0.75': BASE_UNIT * 1.5,  // 6px
  '1.25': BASE_UNIT * 2.5,  // 10px
  '1.5': BASE_UNIT * 3,     // 12px (same as spacingScalePx.sm)
  '1.75': BASE_UNIT * 3.5,  // 14px
  '2.5': BASE_UNIT * 5,     // 20px
  '3.5': BASE_UNIT * 7,     // 28px
} as const;

// Border Width - 2-Step Rule: max 2 options (1px and 4px)
// Default changed to 2px per user request
export const borderWidth = {
  thin: 2,    // default for inputs, cards, dividers (changed from 1)
  thick: 4,   // featured items, bold accents, active indicators
} as const;

// Icon container sizes for consistent icon dimensions
// Used in ActionCard, OptionActionCard, EmptyState, etc.
export const iconSize = {
  xs: 24,
  sm: 28,
  md: 36,
  lg: 52,
  xl: 54,
} as const;

// Card action heights for consistent card action areas
// Used in ActionCard, OptionActionCard, etc.
export const cardActionHeight = {
  sm: 88,
  md: 140,
  lg: 180,
} as const;

// Home page specific tokens
// Used in ActivityPage for consistent hero and action card sizing
export const homePageTokens = {
  heroHeight: {
    mobile: 180,
    desktop: 200,
  },
  actionCardHeight: {
    mobile: 160,
    desktop: 176,
  },
} as const;

// Dashboard card tokens for consistent sizing across pages
export const dashboardTokens = {
  card: {
    borderRadius: borderRadiusScale.xs,  // 1px for sharp corners
    height: {
      sm: 132,   // Settings category cards
      md: 176,   // Standard dashboard cards
      lg: 196,   // Large dashboard cards
    },
  },
  hero: {
    borderRadius: borderRadiusScale.xs,  // 1px for sharp corners
    height: {
      standard: 200,   // Standard hero height
      tall: 220,       // Tall hero height
    },
  },
} as const;

// Component-specific border radius mappings
// Card standard: 1px, Header/hero: 1px, Chip/badge/avatar: full only
export const componentBorderRadiusMap = {
  // Form components - using 1px for sharp corners
  input: borderRadiusScale.xs,
  select: borderRadiusScale.xs,
  textarea: borderRadiusScale.xs,
  
  // Buttons
  button: {
    default: borderRadiusScale.xs,
    square: borderRadiusScale.none,
  },
  
  // Cards and containers
  card: borderRadiusScale.xs,
  dashboardCard: borderRadiusScale.xs,
  settingsCard: borderRadiusScale.xs,
  hero: borderRadiusScale.xs,
  paper: borderRadiusScale.xs,
  container: borderRadiusScale.none,
  dialog: borderRadiusScale.xs,
  modal: borderRadiusScale.xs,
  
  // Chips, badges, tags - full rounding for pills
  chip: borderRadiusScale.full,
  badge: borderRadiusScale.full,
  status: borderRadiusScale.full,
  pill: borderRadiusScale.full,
  tag: borderRadiusScale.full,
  
  // Other components
  alert: borderRadiusScale.xs,
  toast: borderRadiusScale.xs,
  tooltip: borderRadiusScale.xs,
  tableContainer: borderRadiusScale.none,
  
  // Special cases
  image: borderRadiusScale.xs,
  avatar: borderRadiusScale.full,
  drawer: borderRadiusScale.none,
} as const;

// Padding tokens for components
export const componentPadding = {
  x: {
    sm: spacingScalePx.sm,    // 12px
    md: spacingScalePx.md,    // 16px
    lg: spacingScalePx.lg,    // 24px
  },
  y: {
    sm: spacingScalePx.sm,    // 12px
    md: spacingScalePx.md,    // 16px
    lg: spacingScalePx.lg,    // 24px
  },
} as const;

export type ComponentHeight = keyof typeof componentHeight;
export type BorderWidth = keyof typeof borderWidth;
