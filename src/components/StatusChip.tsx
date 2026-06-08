import { Chip } from '@mui/material';
import type { MissionStatus, InvoiceStatus } from '../storage/schema';
import { invoiceStatusLabels, invoiceStatusTone } from '../services/invoiceWorkflow';
import { missionStatusLabels, missionStatusTone } from '../services/missionStatus';

type Props =
  | { kind: 'mission'; status: MissionStatus }
  | { kind: 'invoice'; status: InvoiceStatus }
  | { kind: 'none'; label: string };

export function StatusChip(props: Props) {
  if (props.kind === 'mission') {
    return <Chip size="small" label={missionStatusLabels[props.status]} color={missionStatusTone(props.status)} />;
  }
  if (props.kind === 'invoice') {
    return <Chip size="small" label={invoiceStatusLabels[props.status]} color={invoiceStatusTone(props.status)} />;
  }
  return <Chip size="small" label={props.label} variant="outlined" />;
}
