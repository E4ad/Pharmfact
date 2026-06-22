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

// Component border radius defaults - using 1px for sharp corners
export const componentBorderRadius = {
  input: borderRadiusScale.xs,
  select: borderRadiusScale.xs,
  textarea: borderRadiusScale.xs,
  button: {
    default: borderRadiusScale.xs,
    square: borderRadiusScale.none,
  },
  card: borderRadiusScale.xs,
  dashboardCard: borderRadiusScale.xs,
  settingsCard: borderRadiusScale.xs,
  hero: borderRadiusScale.xs,
  paper: borderRadiusScale.xs,
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
