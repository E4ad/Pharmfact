import { Stack, Typography, type StackProps } from '@mui/material';
import type { ReactNode } from 'react';
import { BackHomeButton } from './BackHomeButton';

/**
 * Composant d'en-tête de page standardisé
 * Affiche un bouton de retour, un titre et un sous-titre optionnel
 * 
 * @example
 * ```tsx
 * <PageHeader
 *   backTo="/activity"
 *   title="Pilotage fiscal"
 *   subtitle="Estimations de pilotage — à valider avec votre comptable."
 * />
 * 
 * <PageHeader
 *   backTo="/missions"
 *   backLabel="Missions"
 *   title="Modifier mission"
 * />
 * ```
 */
interface PageHeaderProps {
  /** Chemin de navigation pour le bouton retour (default: /activity) */
  backTo?: string;
  /** Libellé du bouton retour (default: "Accueil") */
  backLabel?: string;
  /** Titre de la page */
  title: string;
  /** Sous-titre optionnel */
  subtitle?: string;
  /** Contenu supplémentaire à afficher après le titre */
  children?: ReactNode;
  /** Props supplémentaires pour le Stack container */
  stackProps?: StackProps;
  /** Test ID */
  'data-testid'?: string;
}

export function PageHeader({
  backTo = '/activity',
  backLabel = 'Accueil',
  title,
  subtitle,
  children,
  stackProps = {},
  'data-testid': testId,
}: PageHeaderProps) {
  return (
    <Stack
      spacing={subtitle || children ? 1 : 2}
      data-testid={testId}
      {...stackProps}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <BackHomeButton to={backTo} label={backLabel} />
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>

      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}

      {children}
    </Stack>
  );
}

export default PageHeader;
