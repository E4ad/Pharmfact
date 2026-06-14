export const animationDurations = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
} as const;

export const animationEasings = {
  linear: 'linear',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enter: 'cubic-bezier(0, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

export const animationTokens = {
  durations: animationDurations,
  easings: animationEasings,
  transition: {
    fast: `${animationDurations.fast} ${animationEasings.standard}`,
    normal: `${animationDurations.normal} ${animationEasings.standard}`,
    slow: `${animationDurations.slow} ${animationEasings.standard}`,
  },
} as const;
