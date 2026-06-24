import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { formatMoney } from '../../../services/money';

const summaryCardSx = {
  borderRadius: 16,
  bgcolor: 'primary.dark',
  color: 'common.white',
  boxShadow: 1,
  p: 2.5,
  backgroundImage: 'linear-gradient(145deg, #075985 0%, #0f3f5c 58%, #0f172a 100%)',
  border: '1px solid',
  borderColor: 'rgba(7, 89, 133, 0.45)',
} as const;

const labelSx = {
  fontSize: '0.72rem',
  color: 'rgba(255,255,255,0.68)',
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const valueSx = {
  fontWeight: 700,
  color: '#fff',
  textAlign: 'right' as const,
  fontSize: '0.86rem',
};

const strongValueSx = {
  fontWeight: 900,
  fontSize: '1.1rem',
  color: 'common.white',
  textAlign: 'right' as const,
};

export function MissionSummaryPanel({
  topBar,
  missionCode,
  pharmacyName,
  pharmacyAddress,
  dates,
  daysWorked,
  paidHours,
  hourlyRateCents,
  subtotalCents,
  expensesCents,
  totalCents,
  children,
}: {
  topBar?: ReactNode;
  missionCode?: string;
  pharmacyName: string;
  pharmacyAddress: string;
  dates: string;
  daysWorked: number;
  paidHours: number;
  hourlyRateCents: number;
  subtotalCents: number;
  expensesCents: number;
  totalCents: number;
  children?: ReactNode;
}) {
  return (
    <Box sx={summaryCardSx}>
      {topBar ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75, mb: 1.5 }}>
          {topBar}
        </Box>
      ) : null}
      <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 800, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Résumé
      </Typography>
      <Box sx={{ pb: 1.5, mb: 1.5, borderBottom: '1px solid', borderColor: 'rgba(255,255,255,0.16)' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.25, color: 'common.white', display: 'block' }}>
          {pharmacyName}
        </Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.3, display: 'block' }}>
          {pharmacyAddress}
        </Typography>
        {missionCode ? (
          <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 0.5, display: 'block' }}>
            {missionCode}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'rgba(255,255,255,0.16)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 2, alignItems: 'baseline' }}>
        <Typography sx={labelSx}>Dates</Typography>
        <Typography sx={{ ...valueSx, fontWeight: 800 }}>{dates}</Typography>
      </Box>
      {children}
      <Box sx={{ display: 'grid', gap: 1.75 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(132px, 1fr) minmax(92px, auto)', gap: 2, alignItems: 'baseline' }}>
          <Typography sx={labelSx}>Jours travaillés</Typography>
          <Typography sx={valueSx}>{daysWorked}</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(132px, 1fr) minmax(92px, auto)', gap: 2, alignItems: 'baseline' }}>
          <Typography sx={labelSx}>Heures payées</Typography>
          <Typography sx={valueSx}>{paidHours.toFixed(2).replace('.', ',')} h</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(132px, 1fr) minmax(92px, auto)', gap: 2, alignItems: 'baseline' }}>
          <Typography sx={labelSx}>Taux horaire</Typography>
          <Typography sx={valueSx}>{formatMoney(hourlyRateCents)}/h</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(132px, 1fr) minmax(92px, auto)', gap: 2, alignItems: 'baseline' }}>
          <Typography sx={labelSx}>Honoraires</Typography>
          <Typography sx={valueSx}>{formatMoney(subtotalCents)}</Typography>
        </Box>
        {expensesCents > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(132px, 1fr) minmax(92px, auto)', gap: 2, alignItems: 'baseline' }}>
            <Typography sx={labelSx}>Frais</Typography>
            <Typography sx={valueSx}>{formatMoney(expensesCents)}</Typography>
          </Box>
        ) : null}
      </Box>
      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.18)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 2, alignItems: 'baseline' }}>
        <Typography sx={labelSx}>Total mission</Typography>
        <Typography sx={strongValueSx}>{formatMoney(totalCents)}</Typography>
      </Box>
    </Box>
  );
}
