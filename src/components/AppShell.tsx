import { Box, Container } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  const location = useLocation();

  useEffect(() => {
    document.title = `${pageTitle(location.pathname)} · Pharmfact`;
  }, [location.pathname]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container id="main-content" component="main" tabIndex={-1} maxWidth="xl" sx={{ py: { xs: 4, md: 7 } }}>
        {children}
      </Container>
    </Box>
  );
}

function pageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/welcome') return 'Accueil';
  if (pathname.startsWith('/activity')) return 'Accueil';
  if (pathname.startsWith('/mission/new') || pathname.startsWith('/missions/new')) return 'Nouvelle mission';
  if (pathname.startsWith('/missions/') && pathname.endsWith('/edit')) return 'Modifier une mission';
  if (pathname.startsWith('/missions')) return 'Missions';
  if (pathname.startsWith('/invoices')) return 'Factures & encaissements';
  if (pathname.startsWith('/financial')) return 'Pilotage fiscal';
  if (pathname.startsWith('/options')) return 'Options';
  if (pathname.startsWith('/pharmacies')) return 'Référentiels';
  if (pathname.startsWith('/pharmacy/add')) return 'Ajouter une pharmacie';
  if (pathname.startsWith('/pharmacien/new')) return 'Nouveau pharmacien';
  return 'Pharmfact';
}
