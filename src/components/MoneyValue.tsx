import { Typography, type TypographyProps } from '@mui/material';
import { formatMoney } from '../services/money';

type Props = TypographyProps & {
  cents: number;
};

export function MoneyValue({ cents, ...typographyProps }: Props) {
  const sx = typographyProps.sx
    ? [{ fontVariantNumeric: 'tabular-nums' }, ...(Array.isArray(typographyProps.sx) ? typographyProps.sx : [typographyProps.sx])]
    : { fontVariantNumeric: 'tabular-nums' };

  return (
    <Typography {...typographyProps} sx={sx}>
      {formatMoney(cents)}
    </Typography>
  );
}
