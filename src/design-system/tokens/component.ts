// Component-specific design tokens
// Phase 6 - Component Family Consistency

import { borderRadiusScale } from './borderRadius';
import { spacingScalePx } from './spacing';

// Re-export borderRadius values for convenience
export { borderRadiusScale };

// Component Heights - ensure buttons and inputs share the same height when on same form
export const componentHeight = {
  sm: 32,    // small buttons, compact inputs
  md: 40,    // default buttons, inputs, selects
  lg: 48,    // large buttons, tall inputs
} as const;

// Border Width - 2-Step Rule: max 2 options (1px and 4px)
export const borderWidth = {
  thin: 1,    // default for inputs, cards, dividers
  thick: 4,   // featured items, bold accents, active indicators
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
