import { Card, CardContent, Stack, Typography, type StackProps } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Composant de section pour regrouper des éléments financiers
 * Affiche un titre et un contenu dans une carte
 * 
 * @example
 * ```tsx
 * <FinancialSection title="Pilotage fiscal">
 *   <Box sx={{ display: 'grid', gap: 2 }}>
 *     <InstalmentSummaryCard />
 *     <TpsTvqCard />
 *   </Box>
 * </FinancialSection>
 * ```
 */
interface FinancialSectionProps extends StackProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function FinancialSection({ 
  title, 
  children, 
  actions,
  ...stackProps 
}: FinancialSectionProps) {
  return (
    <Card {...stackProps}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

export default FinancialSection;
