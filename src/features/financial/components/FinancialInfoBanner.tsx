import { Alert, Stack } from '@mui/material';

interface FinancialInfoBannerProps {
  type: 'info' | 'warning' | 'error';
  messages: string[];
}

export function FinancialInfoBanner({ type, messages }: FinancialInfoBannerProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      {messages.map((message, index) => (
        <Alert key={index} severity={type}>
          {message}
        </Alert>
      ))}
    </Stack>
  );
}
