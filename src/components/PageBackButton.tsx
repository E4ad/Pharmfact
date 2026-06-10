import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

type Props = {
  to: string;
  label?: string;
  'data-testid'?: string;
};

export function PageBackButton({ to, label = 'Accueil', 'data-testid': testId }: Props) {
  const navigate = useNavigate();

  return (
    <Button color="inherit" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(to)} sx={{ alignSelf: 'flex-start' }} data-testid={testId}>
      {label}
    </Button>
  );
}
