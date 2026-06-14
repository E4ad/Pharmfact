import { Typography, type TypographyProps } from '@mui/material';
import { formatMoney } from '../services/money';

type Props = TypographyProps & {
  cents: number;
};

export function MoneyValue({ cents, ...typographyProps }: Props) {
  const sx = typographyProps.sx
    ? [{ fontVariantNumeric: 'tabular-nums', fontWeight: 850 }, ...(Array.isArray(typographyProps.sx) ? typographyProps.sx : [typographyProps.sx])]
    : { fontVariantNumeric: 'tabular-nums', fontWeight: 850 };

  return (
    <Typography {...typographyProps} sx={sx}>
      {formatMoney(cents)}
    </Typography>
  );
}
