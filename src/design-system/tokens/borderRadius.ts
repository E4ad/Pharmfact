export const borderRadiusScale = {
  none: 0,
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

export const componentBorderRadius = {
  input: borderRadiusScale.sm,
  select: borderRadiusScale.sm,
  textarea: borderRadiusScale.sm,
  button: {
    default: borderRadiusScale.md,
    pill: borderRadiusScale.full,
  },
  card: borderRadiusScale.lg,
  paper: borderRadiusScale.lg,
  container: borderRadiusScale.lg,
  chip: borderRadiusScale.full,
  badge: borderRadiusScale.full,
  status: borderRadiusScale.full,
  image: borderRadiusScale.md,
  avatar: borderRadiusScale.full,
  modal: borderRadiusScale.lg,
  dialog: borderRadiusScale.lg,
  drawer: borderRadiusScale.none,
  alert: borderRadiusScale.md,
  toast: borderRadiusScale.md,
  tooltip: borderRadiusScale.sm,
  tableContainer: borderRadiusScale.md,
} as const;
