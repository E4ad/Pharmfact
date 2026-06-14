import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Button, type ButtonProps } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * Bouton de retour standardisé pour toutes les pages internes
 * Remplace le PageBackButton pour une cohérence totale
 * 
 * @example
 * ```tsx
 * <BackHomeButton to="/activity" label="Accueil" data-testid="back-button" />
 * <BackHomeButton to="/missions" label="Missions" data-testid="back-button" />
 * ```
 */
interface BackHomeButtonProps {
  /** Chemin de navigation (default: /activity) */
  to?: string;
  /** Libellé du bouton (default: "Accueil") */
  label?: string;
  /** Test ID pour les tests */
  'data-testid'?: string;
  /** Props supplémentaires à passer au Button MUI */
  buttonProps?: Omit<ButtonProps, 'onClick' | 'startIcon' | 'color'>;
}

export function BackHomeButton({
  to = '/activity',
  label = 'Accueil',
  'data-testid': testId,
  buttonProps = {},
}: BackHomeButtonProps) {
  const navigate = useNavigate();
  const { sx, ...restButtonProps } = buttonProps;

  const handleClick = () => {
    navigate(to);
  };

  return (
    <Button
      color="inherit"
      startIcon={<ArrowBackRoundedIcon />}
      onClick={handleClick}
      sx={{
        alignSelf: 'flex-start',
        textTransform: 'none',
        fontWeight: 500,
        ...sx,
      }}
      data-testid={testId}
      {...restButtonProps}
    >
      {label}
    </Button>
  );
}

export default BackHomeButton;
