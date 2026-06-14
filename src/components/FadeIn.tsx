import { Box, type BoxProps } from '@mui/material';
import React from 'react';

export function FadeIn({ sx, ...props }: BoxProps) {
  return (
    <Box
      sx={{
        animation: 'pharmfact-fade-in 180ms ease-out both',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
        ...sx,
      }}
      {...props}
    />
  );
}
