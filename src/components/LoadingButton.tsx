import { Button, CircularProgress, type ButtonProps } from '@mui/material';
import React, { forwardRef } from 'react';

export type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
  loadingLabel?: string;
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(function LoadingButton(
  { loading = false, loadingLabel, disabled, children, startIcon, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      startIcon={loading ? <CircularProgress color="inherit" size={18} /> : startIcon}
      {...props}
    >
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  );
});
