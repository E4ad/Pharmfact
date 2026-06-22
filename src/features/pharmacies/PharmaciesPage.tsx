import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { MoneyValue } from '../../components/MoneyValue';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { buildPharmacyMetrics } from '../../services/dashboardMetrics';
import { formatMoney } from '../../services/money';
import { useAppState } from '../../storage/localStore';
import { pharmacieDisplayName } from '../../storage/selectors';

export function PharmaciesPage() {
  const state = useAppState();
  const navigate = useNavigate();

  return (
    <Stack spacing={{ xs: 3, md: 4 }} sx={{ width: 'min(1120px, 100%)', mx: 'auto' }}>
      <PageHeader
        eyebrow="Pharmacies"
        title="Clients et lieux de mission"
        description="Suivez les informations de facturation, les conditions habituelles et les montants en attente par pharmacie."
        actions={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate('/pharmacy/add')}>
            Ajouter
          </Button>
        }
      />

      {!state.pharmacies.length ? (
        <EmptyState title="Aucune pharmacie" description="Ajoutez une pharmacie pour préparer les missions et les factures." actionLabel="Ajouter une pharmacie" onAction={() => navigate('/pharmacy/add')} />
      ) : (
        <PageSection
          title="Registre pharmacies"
          description={`${state.pharmacies.length} pharmacie${state.pharmacies.length > 1 ? 's' : ''} suivie${state.pharmacies.length > 1 ? 's' : ''}.`}
        >
          <SurfaceCard contentSx={{ overflowX: 'auto' }}>
            <Table aria-label="Registre des pharmacies">
              <TableHead>
                <TableRow>
                  <TableCell>Pharmacie</TableCell>
                  <TableCell>Facturation</TableCell>
                  <TableCell>Taux habituel</TableCell>
                  <TableCell>Total facturé</TableCell>
                  <TableCell>Dernier remplacement</TableCell>
                  <TableCell>Impayées</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.pharmacies.map((pharmacie) => {
                  const metrics = buildPharmacyMetrics(state, pharmacie);
                  return (
                    <TableRow key={pharmacie.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{pharmacieDisplayName(pharmacie)}</Typography>
                          <Typography variant="caption" color="text.secondary">{pharmacie.ville || 'Ville non renseignée'} · {pharmacie.codePostal || 'Code postal manquant'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{pharmacie.billingContactName || 'Contact non renseigné'}</Typography>
                        <Typography variant="caption" color="text.secondary">{pharmacie.billingEmail || pharmacie.email || 'Email manquant'}</Typography>
                      </TableCell>
                      <TableCell>{pharmacie.usualHourlyRateCents ? <MoneyValue cents={pharmacie.usualHourlyRateCents} /> : '—'}</TableCell>
                      <TableCell><MoneyValue cents={metrics.totalInvoicedCents} /></TableCell>
                      <TableCell>{metrics.lastMissionDate ?? '—'}</TableCell>
                      <TableCell>
                        {metrics.unpaidInvoices.length ? (
                          <Stack spacing={0.25}>
                            <Button
                              size="small"
                              variant="text"
                              sx={{ alignSelf: 'flex-start', px: 0, fontWeight: 750 }}
                              onClick={() => navigate(`/invoices?filter=receivable&pharmacieId=${pharmacie.id}`)}
                            >
                              {metrics.unpaidInvoices.length} facture{metrics.unpaidInvoices.length > 1 ? 's' : ''}
                            </Button>
                            <Typography variant="caption" color="text.secondary">
                              {formatMoney(metrics.unpaidInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0))}
                            </Typography>
                          </Stack>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" startIcon={<EditRoundedIcon />} onClick={() => navigate(`/pharmacy/add?id=${pharmacie.id}`)}>
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SurfaceCard>
        </PageSection>
      )}
    </Stack>
  );
}
