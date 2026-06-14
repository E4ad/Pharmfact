import { Box, Container } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container id="main-content" component="main" tabIndex={-1} maxWidth="xl" sx={{ py: { xs: 4, md: 7 } }}>
        {children}
      </Container>
    </Box>
  );
}
