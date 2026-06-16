// Component-specific design tokens
// Phase 6 - Component Family Consistency
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
export const borderWidth = {
  thin: 1,    // default for inputs, cards, dividers
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

// Component-specific border radius mappings
export const componentBorderRadiusMap = {
  // Form components
  input: borderRadiusScale.sm,
  select: borderRadiusScale.sm,
  textarea: borderRadiusScale.sm,
  
  // Buttons
  button: {
    default: borderRadiusScale.md,
    pill: borderRadiusScale.full,
  },
  
  // Cards and containers
  card: borderRadiusScale.lg,
  paper: borderRadiusScale.lg,
  container: borderRadiusScale.lg,
  dialog: borderRadiusScale.lg,
  modal: borderRadiusScale.lg,
  
  // Pills, badges, chips
  chip: borderRadiusScale.full,
  badge: borderRadiusScale.full,
  status: borderRadiusScale.full,
  pill: borderRadiusScale.full,
  tag: borderRadiusScale.full,
  
  // Other components
  alert: borderRadiusScale.md,
  toast: borderRadiusScale.md,
  tooltip: borderRadiusScale.sm,
  tableContainer: borderRadiusScale.md,
  
  // Special cases
  image: borderRadiusScale.md,
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
