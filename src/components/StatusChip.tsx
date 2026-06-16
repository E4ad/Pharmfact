import { Chip } from '@mui/material';
import type { MissionStatus, InvoiceStatus } from '../storage/schema';
import { invoiceStatusLabels, invoiceStatusTone } from '../services/invoiceWorkflow';
import { missionStatusLabels, missionStatusTone } from '../services/missionStatus';
import { borderRadiusScale, componentHeight, spacingScale } from '../design-system/tokens';

type Props =
  | { kind: 'mission'; status: MissionStatus }
  | { kind: 'invoice'; status: InvoiceStatus }
  | { kind: 'none'; label: string };

export function StatusChip(props: Props) {
  const commonSx = {
    height: componentHeight.xs,
    borderRadius: borderRadiusScale.full,
    fontWeight: 750,
    letterSpacing: '0.01em',
    '& .MuiChip-label': {
      px: spacingScale.sm,
    },
  };

  if (props.kind === 'mission') {
    return <Chip size="small" label={missionStatusLabels[props.status]} color={missionStatusTone(props.status)} sx={commonSx} />;
  }
  if (props.kind === 'invoice') {
    return <Chip size="small" label={invoiceStatusLabels[props.status]} color={invoiceStatusTone(props.status)} sx={commonSx} />;
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
