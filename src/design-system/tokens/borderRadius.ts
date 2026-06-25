export const borderRadiusScale = {
  none: 0,
  xs: 1,     // 1 pixel for sharp corners
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const componentBorderRadius = {
  input: borderRadiusScale.xs,
  select: borderRadiusScale.xs,
  textarea: borderRadiusScale.xs,
  button: {
    default: borderRadiusScale.xs,
    square: borderRadiusScale.none,
  },
  card: 10,
  dashboardCard: 10,
  settingsCard: 10,
  hero: 10,
  paper: 10,
  container: borderRadiusScale.none,
  chip: borderRadiusScale.full,
  badge: borderRadiusScale.full,
  status: borderRadiusScale.full,
  image: borderRadiusScale.xs,
  avatar: borderRadiusScale.full,
  modal: borderRadiusScale.xs,
  dialog: borderRadiusScale.xs,
  drawer: borderRadiusScale.none,
  alert: borderRadiusScale.xs,
  toast: borderRadiusScale.xs,
  tooltip: borderRadiusScale.xs,
  tableContainer: borderRadiusScale.none,
} as const;
