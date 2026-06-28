import { Box, Typography } from '@mui/material';
import accesPharmaLogo from '../assets/franchises/acces_pharma.png';
import brunetLogo from '../assets/franchises/brunet.jpg';
import familiprixLogo from '../assets/franchises/familiprix.svg';
import jeanCoutouLogo from '../assets/franchises/jean_coutu.png';
import pharmaprixLogo from '../assets/franchises/pharmaprix.svg';
import proximLogo from '../assets/franchises/proxim.jpg';
import uniprixLogo from '../assets/franchises/uniprix.svg';
import { pharmacyFranchiseLabels } from '../services/pharmacyMetadata';
import type { Pharmacie, PharmacyFranchise } from '../storage/schema';
import { pharmacieDisplayName } from '../storage/selectors';

const FRANCHISE_LOGOS: Partial<Record<PharmacyFranchise, string>> = {
  jean_coutu: jeanCoutouLogo,
  familiprix: familiprixLogo,
  uniprix: uniprixLogo,
  brunet: brunetLogo,
  pharmaprix: pharmaprixLogo,
  proxim: proximLogo,
  acces_pharma: accesPharmaLogo,
};

const AVATAR_COLORS = ['#1976d2', '#7b1fa2', '#00838f', '#e65100', '#2e7d32', '#ad1457'];

function avatarBg(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export function PharmacyLogo({ pharmacy, size = 38 }: { pharmacy?: Pharmacie; size?: number }) {
  const name = pharmacieDisplayName(pharmacy);
  const logoSrc = pharmacy?.franchise ? FRANCHISE_LOGOS[pharmacy.franchise] : undefined;
  const initials = name.trim().split(/\s+/)[0]?.slice(0, 2).toUpperCase() ?? '?';
  const franchiseLabel = pharmacy?.franchise
    ? (pharmacyFranchiseLabels[pharmacy.franchise] ?? name)
    : name;

  if (logoSrc) {
    return (
      <Box
        component="img"
        src={logoSrc}
        alt={franchiseLabel}
        sx={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: 1,
          p: 0.25,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        bgcolor: avatarBg(name),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Typography sx={{ color: 'white', fontWeight: 800, fontSize: size * 0.32, lineHeight: 1 }}>
        {initials}
      </Typography>
    </Box>
  );
}
