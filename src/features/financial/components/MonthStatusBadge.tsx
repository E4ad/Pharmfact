import { Box, type BoxProps } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Badge pour afficher le statut temporel d'un mois (Passé, En cours, À venir)
 * 
 * @example
 * ```tsx
 * <MonthStatusBadge status="PAST" />
 * <MonthStatusBadge status="CURRENT" />
 * <MonthStatusBadge status="FUTURE" />
 * ```
 */
interface MonthStatusBadgeProps extends BoxProps {
  status: 'PAST' | 'CURRENT' | 'FUTURE';
}

/**
 * Couleurs et labels pour chaque statut
 */
const statusConfig = {
  PAST: {
    label: 'Passé',
    backgroundColor: 'rgba(72, 187, 120, 0.14)',
    color: '#4caf50',
  },
  CURRENT: {
    label: 'En cours',
    backgroundColor: 'rgba(96, 165, 250, 0.14)',
    color: '#90caf9',
  },
  FUTURE: {
    label: 'À venir',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#a0aec0',
  },
} as const;

export function MonthStatusBadge({ 
  status,
  ...boxProps 
}: MonthStatusBadgeProps): ReactNode {
  const config = statusConfig[status];

  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.5,
        borderRadius: 1,
        backgroundColor: config.backgroundColor,
        color: config.color,
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...boxProps.sx,
      }}
      {...boxProps}
    >
      {config.label}
    </Box>
  );
}

export default MonthStatusBadge;
