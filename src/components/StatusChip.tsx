import { Chip, useTheme } from '@mui/material';
import type { MissionStatus, InvoiceStatus, PaymentStatus } from '../storage/schema';
import type { BusinessMissionStatus } from '../services/businessRules';
import { invoiceStatusLabels, invoiceStatusTone, paymentStatusLabels, paymentStatusTone } from '../services/invoiceWorkflow';
import { missionStatusLabels, missionStatusTone } from '../services/missionStatus';
import { businessMissionStatusLabels, businessMissionStatusTone } from '../services/businessRules';
import { componentHeight, spacingScale } from '../design-system/tokens';

type Props =
  | { kind: 'mission'; status: MissionStatus }
  | { kind: 'businessMission'; status: BusinessMissionStatus }
  | { kind: 'invoice'; status: InvoiceStatus }
  | { kind: 'payment'; status: PaymentStatus }
  | { kind: 'none'; label: string };

export function StatusChip(props: Props) {
  const theme = useTheme();
  const commonSx = {
    height: componentHeight.xs,
    borderRadius: theme.runtimeTokens.controlRadius,
    fontWeight: 750,
    letterSpacing: '0.01em',
    '& .MuiChip-label': {
      px: spacingScale.sm,
    },
  };

  if (props.kind === 'mission') {
    return <Chip size="small" label={missionStatusLabels[props.status]} color={missionStatusTone(props.status)} sx={commonSx} />;
  }
  if (props.kind === 'businessMission') {
    return <Chip size="small" label={businessMissionStatusLabels[props.status]} color={businessMissionStatusTone(props.status)} sx={commonSx} />;
  }
  if (props.kind === 'invoice') {
    return <Chip size="small" label={invoiceStatusLabels[props.status]} color={invoiceStatusTone(props.status)} sx={commonSx} />;
  }
  if (props.kind === 'payment') {
    return <Chip size="small" label={paymentStatusLabels[props.status]} color={paymentStatusTone(props.status)} sx={commonSx} />;
  }
  return (
    <Chip
      size="small"
      label={props.label}
      variant="outlined"
      sx={(theme) => ({
        ...commonSx,
        color: theme.palette.text.secondary,
        borderColor: theme.palette.action.focus,
        bgcolor: theme.palette.action.hover,
      })}
    />
  );
}
