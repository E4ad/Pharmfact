import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MoneyValue } from '../../components/MoneyValue';
import { FadeIn } from '../../components/FadeIn';
import { PageHeader } from '../../components/PageHeader';
import { PageSection } from '../../components/PageSection';
import { SurfaceCard } from '../../components/SurfaceCard';
import { MetricCard } from '../../components/MetricCard';
import { useNotifications } from '../../components/NotificationSystem';
import { useFinancialSettings } from '../../hooks/useFinancialSettings';
import {
  findPharmacie,
  pharmacieDisplayName,
  selectFinancialOptions,
} from '../../storage/selectors';
import { buildBusinessAlerts, missionsReadyToInvoice } from '../../services/businessRules';
import { buildInvoicePipelineMetrics } from '../../services/dashboardMetrics';
import {
  buildFinancialMetrics,
  collectMissionDeductibleExpenseRows,
  type AnnualFinancialSnapshot,
  type FinancialWarning,
  type MissionDeductibleExpenseRow,
  type MonthlyFinancialSnapshot,
  type QuarterlyFinancialSnapshot,
} from '../../services/financialMetrics';
import { createId, todayIso } from '../../services/ids';
import { formatMoney } from '../../services/money';
import { updateAppState, useAppState } from '../../storage/localStore';
import type { DeductibleExpense, TaxPayment } from '../../storage/schema';
import { FinancialPeriodCard } from './components/FinancialPeriodCard';
import { FinancialMetricCard } from './components/FinancialMetricCard';
import { FinancialInfoBanner } from './components/FinancialInfoBanner';
import { FinancialActionCard } from './components/FinancialActionCard';
import { TaxPaymentFormDrawer } from './components/TaxPaymentFormDrawer';
import { DeductibleExpenseFormDrawer } from './components/DeductibleExpenseFormDrawer';
import { MissionGeneratedExpensesDrawer } from './components/MissionGeneratedExpensesDrawer';
import { ReceivablesDrawer } from './components/ReceivablesDrawer';
import { TpsTvqDrawer } from './components/TpsTvqDrawer';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';
import ReceiptRoundedIcon from '@mui/icons-material/ReceiptRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';
import { spacingScale } from '../../design-system/tokens';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import { buildCsvExport, type CsvExportKind } from '../../services/csvExports';
import {
  buildSmallSupplierSnapshot,
  type SmallSupplierSnapshot,
} from '../../services/smallSupplier';
import { transitionInvoice } from '../../services/invoiceWorkflow';
import type { InvoiceStatus } from '../../storage/schema';

type ViewMode = 'monthly' | 'quarterly' | 'annual';

export function FinancialPage() {
  return <FinancialDashboardPage />;
}

export function FinancialDashboardPage() {
  const state = useAppState();
  const { notify } = useNotifications();
  const navigate = useNavigate();
  const financialSettings = useFinancialSettings();
  const today = todayIso();
  const availableViews = useMemo(() => enabledViews(financialSettings), [financialSettings]);
  const invoicePipeline = useMemo(() => buildInvoicePipelineMetrics(state, today), [state, today]);
  const { annual } = useMemo(
    () =>
      buildFinancialMetrics({
        invoices: state.invoices,
        taxPayments: state.taxPayments,
        expenses: financialSettings.enableExpenseTracking ? state.deductibleExpenses : [],
        fiscalSettings: financialSettings,
        todayIso: today,
        missions: state.missions,
        pharmaciens: state.pharmaciens,
        expenseReceipts: state.expenseReceipts,
      }),
    [state, today, financialSettings],
  );

  const missionExpenseRows = useMemo(
    () => collectMissionDeductibleExpenseRows(state.missions, financialSettings),
    [state.missions, financialSettings],
  );
  const smallSupplier = useMemo(() => buildSmallSupplierSnapshot(state, today), [state, today]);
  const missionsToInvoice = useMemo(() => missionsReadyToInvoice(state), [state]);
  const operationalAlerts = useMemo(
    () =>
      buildBusinessAlerts(state, today)
        .filter(
          (alert) => alert.href?.startsWith('/invoices') || alert.href?.startsWith('/missions'),
        )
        .slice(0, 4),
    [state, today],
  );

  const [view, setView] = useState<ViewMode>(availableViews[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () =>
      annual.months?.find((month: MonthlyFinancialSnapshot) => month.month === today.slice(0, 7))
        ?.month ??
      annual.months?.[0]?.month ??
      today.slice(0, 7),
  );
  const selectedMonthly =
    annual.months?.find((month: MonthlyFinancialSnapshot) => month.month === selectedMonth) ??
    annual.months?.[0];

  // Drawers state
  const [taxPaymentDrawerOpen, setTaxPaymentDrawerOpen] = useState(false);
  const [deductibleExpenseDrawerOpen, setDeductibleExpenseDrawerOpen] = useState(false);
  const [missionExpensesDrawerOpen, setMissionExpensesDrawerOpen] = useState(false);
  const [receivablesDrawerOpen, setReceivablesDrawerOpen] = useState(false);
  const [tpsTvqDrawerOpen, setTpsTvqDrawerOpen] = useState(false);

  useEffect(() => {
    if (!availableViews.includes(view)) setView(availableViews[0]);
  }, [availableViews, view]);

  function exportJson(label: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${label}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv(kind: CsvExportKind) {
    const csv = buildCsvExport(state, kind, annual.year);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${kind}-${annual.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function setInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((item) =>
        item.id === invoiceId ? transitionInvoice(item, status) : item,
      ),
    }));
    notify({
      severity: 'success',
      message: `Facture ${status === 'SENT' ? 'envoyée' : status === 'PAID' ? 'payée' : 'mise à jour'}.`,
    });
  }

  const periodLabel = useMemo(() => {
    if (view === 'monthly') {
      return new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(
        new Date(`${selectedMonth}-01T00:00:00`),
      );
    } else if (view === 'quarterly') {
      return selectedMonthly.quarterLabel;
    } else {
      return String(annual.year);
    }
  }, [view, selectedMonth, selectedMonthly.quarterLabel, annual.year]);

  const availablePeriods = useMemo(() => {
    if (view === 'monthly') {
      return annual.months?.map((month: MonthlyFinancialSnapshot) => month.month) || [];
    } else if (view === 'quarterly') {
      return annual.quarters?.map((quarter: QuarterlyFinancialSnapshot) => quarter.label) || [];
    } else {
      return [String(annual.year)];
    }
  }, [view, annual]);

  return (
    <FadeIn>
      <Stack spacing={{ xs: 3, md: 4 }} sx={{ width: 'min(1180px, 100%)', mx: 'auto' }}>
        <PageHeader
          eyebrow="Pilotage fiscal"
          title="Pilotage fiscal"
          description="Suivez les estimations, réserves fiscales et montants à valider avec votre comptable."
          data-testid="financial-page-header"
        />

        <PageSection
          title="Repères propriétaires"
          description="Cette page porte la réserve fiscale, le petit fournisseur et les liens vers le recouvrement."
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <MetricCard
              label="Missions à facturer"
              value={String(missionsToInvoice.length)}
              helperText={`${formatMoney(missionsToInvoice.reduce((sum, mission) => sum + mission.totalCents, 0))} à générer`}
              tone="warning"
              actionLabel="Filtrer"
              onAction={() => navigate('/missions?filter=to_invoice')}
            />
            <MetricCard
              label="À envoyer"
              value={String(invoicePipeline.toSendCount)}
              helperText={formatMoney(invoicePipeline.toSendCents)}
              tone="primary"
              actionLabel="Filtrer"
              onAction={() => navigate('/invoices?filter=to_send')}
            />
            <MetricCard
              label="À encaisser"
              value={formatMoney(invoicePipeline.receivableCents)}
              helperText={`${invoicePipeline.receivableCount} facture${invoicePipeline.receivableCount > 1 ? 's' : ''} en circulation`}
              tone="primary"
              actionLabel="Filtrer"
              onAction={() => navigate('/invoices?filter=receivable')}
            />
            <MetricCard
              label="À vérifier"
              value={String(invoicePipeline.toVerifyCount)}
              helperText={`${invoicePipeline.overdueCount} échue${invoicePipeline.overdueCount > 1 ? 's' : ''}`}
              tone="warning"
              actionLabel="Filtrer"
              onAction={() => navigate('/invoices?filter=attention')}
            />
          </Box>

          {operationalAlerts.length ? (
            <SurfaceCard contentSx={{ p: 0 }}>
              <Box sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Typography variant="h6">Actions restantes</Typography>
                  <Stack spacing={1.25}>
                    {operationalAlerts.map((alert) => (
                      <Stack
                        key={alert.id}
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1.5}
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', md: 'center' },
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 750 }}>
                            {alert.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {alert.message}
                          </Typography>
                        </Box>
                        {alert.href ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(alert.href!)}
                          >
                            {alert.actionLabel ?? 'Ouvrir'}
                          </Button>
                        ) : null}
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </SurfaceCard>
          ) : null}
        </PageSection>

        <PageSection
          title="Synthèse financière"
          description="Changez de période pour comparer rapidement le mois, le trimestre ou l’année."
        >
          <FinancialViewTabs value={view} onChange={setView} availableViews={availableViews} />
        </PageSection>

        <PageSection
          title="Exports fiscaux CSV"
          description="Fichiers locaux UTF-8, montants en dollars et dates ISO."
        >
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {(
              [
                'revenus',
                'factures',
                'depenses',
                'pharmacies',
                'synthese-annuelle',
              ] as CsvExportKind[]
            ).map((kind) => (
              <Button key={kind} variant="outlined" onClick={() => exportCsv(kind)}>
                Export {kind}
              </Button>
            ))}
          </Stack>
        </PageSection>

        {financialSettings.enableSmallSupplierTracking ? (
          <SmallSupplierDetailCard snapshot={smallSupplier} />
        ) : null}

        {view === 'monthly' && selectedMonthly ? (
          <MonthlyFinancialView
            annual={annual}
            selectedMonth={selectedMonth}
            snapshot={selectedMonthly}
            onMonthChange={setSelectedMonth}
            onExport={() => exportJson(`synthese-mensuelle-${selectedMonth}`, selectedMonthly)}
            onAddTaxPayment={() => setTaxPaymentDrawerOpen(true)}
            onAddDeductibleExpense={() => setDeductibleExpenseDrawerOpen(true)}
            onViewMissionExpenses={() => setMissionExpensesDrawerOpen(true)}
            onViewReceivables={() => setReceivablesDrawerOpen(true)}
            onViewTpsTvq={() => setTpsTvqDrawerOpen(true)}
            missionExpenseRows={missionExpenseRows}
          />
        ) : null}

        {view === 'quarterly' ? (
          <QuarterlyFinancialView
            annual={annual}
            onExport={(quarter) =>
              exportJson(`synthese-trimestrielle-${quarter.label.replaceAll(' ', '-')}`, quarter)
            }
          />
        ) : null}

        {view === 'annual' ? (
          <AnnualFinancialView
            annual={annual}
            onExport={() => exportJson(`synthese-annuelle-${annual.year}`, annual)}
          />
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: spacingScale.md,
          }}
        >
          {financialSettings.enableInstalmentTracking ? (
            <InstalmentSummaryCard
              annual={annual}
              onAddTaxPayment={() => setTaxPaymentDrawerOpen(true)}
            />
          ) : null}
          {financialSettings.enableExpenseTracking ? (
            <DeductibleExpensesSummaryCard
              annual={annual}
              onAddDeductibleExpense={() => setDeductibleExpenseDrawerOpen(true)}
            />
          ) : null}
        </Box>

        {financialSettings.enableExpenseTracking &&
        financialSettings.includeMissionDeductibleExpenses ? (
          <MissionGeneratedExpensesSummaryCard
            rows={missionExpenseRows}
            onViewDetail={() => setMissionExpensesDrawerOpen(true)}
          />
        ) : null}

        {financialSettings.enableExpenseTracking ? (
          <ReceivablesSummaryCard
            receivableCents={selectedMonthly?.receivableCents ?? 0}
            onViewDetail={() => setReceivablesDrawerOpen(true)}
          />
        ) : null}

        {/* Drawers */}
        <TaxPaymentFormDrawer
          open={taxPaymentDrawerOpen}
          onClose={() => setTaxPaymentDrawerOpen(false)}
          onAdded={() => notify({ severity: 'success', message: 'Acompte ajouté avec succès.' })}
          periodLabel={periodLabel}
        />

        <DeductibleExpenseFormDrawer
          open={deductibleExpenseDrawerOpen}
          onClose={() => setDeductibleExpenseDrawerOpen(false)}
          onSubmit={() => notify({ severity: 'success', message: 'Dépense ajoutée avec succès.' })}
        />

        <MissionGeneratedExpensesDrawer
          open={missionExpensesDrawerOpen}
          onClose={() => setMissionExpensesDrawerOpen(false)}
          rows={missionExpenseRows}
        />

        <ReceivablesDrawer
          open={receivablesDrawerOpen}
          onClose={() => setReceivablesDrawerOpen(false)}
          invoices={state.invoices.filter(
            (invoice) => invoice.status === 'SENT' || invoice.status === 'GENERATED',
          )}
          pharmacies={state.pharmacies}
          onStatusChange={setInvoiceStatus}
        />

        <TpsTvqDrawer
          open={tpsTvqDrawerOpen}
          onClose={() => setTpsTvqDrawerOpen(false)}
          isSmallSupplier={state.fiscalSettings.defaultTaxStatus === 'SMALL_SUPPLIER'}
          gstQstCollectedCents={selectedMonthly?.gstQstCollectedCents ?? 0}
          gstQstRemittedCents={selectedMonthly?.gstQstRemittedCents ?? 0}
        />
      </Stack>
    </FadeIn>
  );
}

function enabledViews(settings: {
  showMonthlyView: boolean;
  showQuarterlyView: boolean;
  showAnnualView: boolean;
}): ViewMode[] {
  const views: ViewMode[] = [];
  if (settings.showMonthlyView) views.push('monthly');
  if (settings.showQuarterlyView) views.push('quarterly');
  if (settings.showAnnualView) views.push('annual');
  return views.length ? views : ['annual'];
}

export function FinancialViewTabs({
  value,
  onChange,
  availableViews,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  availableViews: ViewMode[];
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {availableViews.includes('monthly') ? (
        <Button
          variant={value === 'monthly' ? 'contained' : 'outlined'}
          onClick={() => onChange('monthly')}
        >
          Mensuel
        </Button>
      ) : null}
      {availableViews.includes('quarterly') ? (
        <Button
          variant={value === 'quarterly' ? 'contained' : 'outlined'}
          onClick={() => onChange('quarterly')}
        >
          Trimestriel
        </Button>
      ) : null}
      {availableViews.includes('annual') ? (
        <Button
          variant={value === 'annual' ? 'contained' : 'outlined'}
          onClick={() => onChange('annual')}
        >
          Annuel
        </Button>
      ) : null}
    </Box>
  );
}

export function MonthlyFinancialView({
  annual,
  selectedMonth,
  snapshot,
  onMonthChange,
  onExport,
  onAddTaxPayment,
  onAddDeductibleExpense,
  onViewMissionExpenses,
  onViewReceivables,
  onViewTpsTvq,
  missionExpenseRows,
}: {
  annual: AnnualFinancialSnapshot;
  selectedMonth: string;
  snapshot: MonthlyFinancialSnapshot;
  onMonthChange: (month: string) => void;
  onExport: () => void;
  onAddTaxPayment: () => void;
  onAddDeductibleExpense: () => void;
  onViewMissionExpenses: () => void;
  onViewReceivables: () => void;
  onViewTpsTvq: () => void;
  missionExpenseRows?: MissionDeductibleExpenseRow[];
}) {
  const periodLabel = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(
    new Date(`${selectedMonth}-01T00:00:00`),
  );
  const missionRowsForMonth =
    missionExpenseRows?.filter((row) => row.date.startsWith(selectedMonth)) || [];

  return (
    <Stack spacing={3}>
      <FinancialPeriodCard
        periodType="monthly"
        periodLabel={periodLabel}
        amountToCollect={snapshot.receivableCents}
        expenses={snapshot.deductibleExpensesCents}
        instalmentsPaid={snapshot.incomeTaxInstalmentsPaidCents}
        onPeriodChange={onMonthChange}
        availablePeriods={
          annual.months?.map((month: MonthlyFinancialSnapshot) => month.month) || []
        }
        onExport={onExport}
      />

      {snapshot.warnings.length > 0 ? (
        <FinancialInfoBanner type="warning" messages={snapshot.warnings.map((w) => w.message)} />
      ) : (
        <FinancialInfoBanner
          type="info"
          messages={[
            snapshot.receivableCents > 0 && snapshot.collectedCents === 0
              ? `Une facture de ${formatMoney(snapshot.receivableCents)} est à encaisser. Elle sera intégrée à l’encaissé après paiement.`
              : 'Aucune alerte prioritaire pour cette période.',
          ]}
        />
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <FinancialMetricCard
          iconTone="green"
          icon={<AttachMoneyRoundedIcon fontSize="small" />}
          label="Encaissé"
          valueCents={snapshot.collectedCents}
          helperText="Factures payées sur la période"
        />
        <FinancialMetricCard
          iconTone="blue"
          icon={<SavingsRoundedIcon fontSize="small" />}
          label="Bénéfice net estimé"
          valueCents={snapshot.estimatedNetProfitCents}
          helperText="Encaissé moins dépenses déductibles"
        />
        <FinancialMetricCard
          iconTone="amber"
          icon={<AccountBalanceWalletRoundedIcon fontSize="small" />}
          label="Réserve recommandée"
          valueCents={snapshot.targetReserveCents}
          helperText={`${Math.round(snapshot.reserveRate * 100)} % du bénéfice estimé`}
        />
        <FinancialMetricCard
          iconTone="purple"
          icon={<WarningRoundedIcon fontSize="small" />}
          label="Reste à prévoir"
          valueCents={snapshot.remainingProvisionCents}
          helperText="Réserve moins acomptes"
        />
      </Box>

      {missionRowsForMonth.length > 0 ? (
        <SurfaceCard contentSx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Dépenses issues des missions
          </Typography>
          <Table size="small" aria-label="Dépenses déductibles">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">
                  Date
                </TableCell>
                <TableCell component="th" scope="col">
                  Mission
                </TableCell>
                <TableCell component="th" scope="col">
                  Type
                </TableCell>
                <TableCell component="th" scope="col" align="right">
                  Montant facturé
                </TableCell>
                <TableCell component="th" scope="col" align="right">
                  Montant déductible
                </TableCell>
                <TableCell component="th" scope="col">
                  Justificatif
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {missionRowsForMonth.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{row.missionCode ?? row.missionId.slice(0, 8)}</TableCell>
                  <TableCell>{row.category || row.label}</TableCell>
                  <TableCell align="right">
                    <MoneyValue cents={row.amountCents} />
                  </TableCell>
                  <TableCell align="right">
                    <MoneyValue cents={row.deductibleAmountCents ?? 0} />
                  </TableCell>
                  <TableCell>{row.hasReceipt ? '✓' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Button variant="outlined" size="small" onClick={onViewMissionExpenses}>
              Voir tout le détail
            </Button>
          </Box>
        </SurfaceCard>
      ) : null}

      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}
      >
        <FinancialActionCard
          iconTone="green"
          icon={<PictureAsPdfRoundedIcon fontSize="small" />}
          title="Factures à encaisser"
          description={`Voir les factures en attente de paiement.`}
          onClick={onViewReceivables}
        />
        <FinancialActionCard
          iconTone="gray"
          icon={<ReceiptRoundedIcon fontSize="small" />}
          title="TPS/TVQ"
          description={`Voir le détail des montants TPS/TVQ.`}
          onClick={onViewTpsTvq}
        />
      </Box>
    </Stack>
  );
}

export function QuarterlyFinancialView({
  annual,
  onExport,
}: {
  annual: AnnualFinancialSnapshot;
  onExport: (quarter: QuarterlyFinancialSnapshot) => void;
}) {
  return (
    <Stack spacing={3}>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}
      >
        {annual.quarters.map((quarter) => (
          <SurfaceCard key={quarter.label} contentSx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="h5">{quarter.label}</Typography>
                <Button size="small" onClick={() => onExport(quarter)}>
                  Exporter
                </Button>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <FinancialMetricCard
                  iconTone="green"
                  icon={<AttachMoneyRoundedIcon fontSize="small" />}
                  label="Encaissé"
                  valueCents={quarter.collectedCents}
                  helperText=""
                  compact
                />
                <FinancialMetricCard
                  iconTone="blue"
                  icon={<SavingsRoundedIcon fontSize="small" />}
                  label="Bénéfice net"
                  valueCents={quarter.estimatedNetProfitCents}
                  helperText=""
                  compact
                />
                <FinancialMetricCard
                  iconTone="amber"
                  icon={<AccountBalanceWalletRoundedIcon fontSize="small" />}
                  label="Réserve"
                  valueCents={quarter.targetReserveCents}
                  helperText=""
                  compact
                />
                <FinancialMetricCard
                  iconTone="purple"
                  icon={<WarningRoundedIcon fontSize="small" />}
                  label="Reste"
                  valueCents={quarter.remainingProvisionCents}
                  helperText=""
                  compact
                />
              </Box>
            </Stack>
          </SurfaceCard>
        ))}
      </Box>
    </Stack>
  );
}

export function AnnualFinancialView({
  annual,
  onExport,
}: {
  annual: AnnualFinancialSnapshot;
  onExport: () => void;
}) {
  const financialSettings = useFinancialSettings();

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Année {annual.year}</Typography>
        <Button startIcon={<PictureAsPdfRoundedIcon />} onClick={onExport}>
          Exporter synthèse annuelle
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <FinancialMetricCard
          iconTone="green"
          icon={<AttachMoneyRoundedIcon fontSize="small" />}
          label="Encaissé annuel"
          valueCents={annual.collectedCents}
          helperText="Factures payées"
        />
        <FinancialMetricCard
          iconTone="blue"
          icon={<SavingsRoundedIcon fontSize="small" />}
          label="Bénéfice net"
          valueCents={annual.estimatedNetProfitCents}
          helperText="Après dépenses déductibles"
        />
        <FinancialMetricCard
          iconTone="amber"
          icon={<AccountBalanceWalletRoundedIcon fontSize="small" />}
          label="Réserve"
          valueCents={annual.targetReserveCents}
          helperText="Cible annuelle"
        />
        <FinancialMetricCard
          iconTone="purple"
          icon={<WarningRoundedIcon fontSize="small" />}
          label="Reste"
          valueCents={annual.remainingProvisionCents}
          helperText="Réserve moins acomptes"
        />
      </Box>
    </Stack>
  );
}

function SmallSupplierDetailCard({ snapshot }: { snapshot: SmallSupplierSnapshot }) {
  const percent = Math.min(Math.round(snapshot.ratio * 100), 999);
  const chipColor =
    snapshot.status === 'exceeded'
      ? 'error'
      : snapshot.status === 'warning'
        ? 'warning'
        : 'success';
  const chipLabel =
    snapshot.status === 'exceeded'
      ? 'Seuil dépassé'
      : snapshot.status === 'warning'
        ? 'Vigilance'
        : 'Normal';

  return (
    <SurfaceCard contentSx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <Box>
            <Typography variant="h5">Petit fournisseur</Typography>
            <Typography variant="body2" color="text.secondary">
              Cumul des fournitures taxables du {snapshot.periodStart} au {snapshot.periodEnd}. À
              valider selon votre situation fiscale.
            </Typography>
          </Box>
          <Chip color={chipColor} label={chipLabel} />
        </Stack>

        <Box>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 750 }}>
              {formatMoney(snapshot.taxableRevenueCents)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {percent} % de {formatMoney(snapshot.thresholdCents)}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(percent, 100)}
            color={
              chipColor === 'error' ? 'error' : chipColor === 'warning' ? 'warning' : 'success'
            }
            sx={(theme) => ({ height: 10, borderRadius: theme.runtimeTokens.controlRadius })}
          />
        </Box>

        {snapshot.included.length ? (
          <Table size="small" aria-label="Factures incluses dans le cumul petit fournisseur">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Facture</TableCell>
                <TableCell>Missions</TableCell>
                <TableCell align="right">Montant inclus</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {snapshot.included.map((item) => (
                <TableRow key={item.invoiceId}>
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.invoiceNumber}</TableCell>
                  <TableCell>{item.missionIds.length || '—'}</TableCell>
                  <TableCell align="right">{formatMoney(item.amountCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Aucune facture incluse dans la période surveillée.
          </Typography>
        )}
      </Stack>
    </SurfaceCard>
  );
}

export function InstalmentSummaryCard({
  annual,
  onAddTaxPayment,
}: {
  annual: AnnualFinancialSnapshot;
  onAddTaxPayment: () => void;
}) {
  const theme = useTheme();
  const nextQuarter =
    annual.quarters.find((quarter) => quarter.nextInstalmentDate) ?? annual.quarters[0];

  return (
    <SurfaceCard contentSx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: theme.runtimeTokens.iconRadius,
              backgroundColor: '#BBDEFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AccountBalanceWalletRoundedIcon color="primary" fontSize="small" />
          </Box>
          <Typography variant="h5">Acomptes provisionnels</Typography>
        </Stack>
        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
          {formatMoney(nextQuarter.suggestedInstalmentCents ?? 0)}
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Prochain : {nextQuarter.nextInstalmentDate ?? 'À déterminer'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Déjà versé : {formatMoney(nextQuarter.incomeTaxInstalmentsPaidCents ?? 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Écart : {formatMoney(nextQuarter.instalmentGapCents ?? 0)}
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={onAddTaxPayment}
          sx={(theme) => ({
            borderRadius: theme.runtimeTokens.controlRadius,
            alignSelf: 'flex-start',
            mt: 1,
            boxShadow:
              theme.runtimeTokens.shadows.button[
                theme.palette.mode === 'dark' ? 'elevatedDark' : 'elevatedLight'
              ],
            '&:hover': {
              boxShadow:
                theme.runtimeTokens.shadows.button[
                  theme.palette.mode === 'dark' ? 'elevatedDark' : 'elevatedLight'
                ],
            },
          })}
        >
          Ajouter un acompte
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

export function DeductibleExpensesSummaryCard({
  annual,
  onAddDeductibleExpense,
}: {
  annual: AnnualFinancialSnapshot;
  onAddDeductibleExpense: () => void;
}) {
  const theme = useTheme();

  return (
    <SurfaceCard contentSx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: theme.runtimeTokens.iconRadius,
              backgroundColor: '#FFE0B2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ReceiptRoundedIcon color="warning" fontSize="small" />
          </Box>
          <Typography variant="h5">Dépenses déductibles</Typography>
        </Stack>
        <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
          <MoneyValue cents={annual.deductibleExpensesCents} />
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={onAddDeductibleExpense}
          sx={(theme) => ({
            borderRadius: theme.runtimeTokens.controlRadius,
            alignSelf: 'flex-start',
            mt: 1,
            boxShadow:
              theme.runtimeTokens.shadows.button[
                theme.palette.mode === 'dark' ? 'elevatedDark' : 'elevatedLight'
              ],
            '&:hover': {
              boxShadow:
                theme.runtimeTokens.shadows.button[
                  theme.palette.mode === 'dark' ? 'elevatedDark' : 'elevatedLight'
                ],
            },
          })}
        >
          Ajouter une dépense
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

export function MissionGeneratedExpensesSummaryCard({
  rows,
  onViewDetail,
}: {
  rows: MissionDeductibleExpenseRow[];
  onViewDetail: () => void;
}) {
  const totalDeductible = rows.reduce((sum, row) => sum + (row.deductibleAmountCents ?? 0), 0);

  return (
    <SurfaceCard contentSx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Dépenses issues des missions</Typography>
        <Typography variant="h4">
          <MoneyValue cents={totalDeductible} />
        </Typography>
        <Typography color="text.secondary">{rows.length} frais de mission déductibles.</Typography>
        <Button variant="outlined" onClick={onViewDetail}>
          Voir détail
        </Button>
      </Stack>
    </SurfaceCard>
  );
}

export function ReceivablesSummaryCard({
  receivableCents,
  onViewDetail,
}: {
  receivableCents: number;
  onViewDetail: () => void;
}) {
  return (
    <SurfaceCard contentSx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Factures à encaisser</Typography>
        <Typography variant="h4">
          <MoneyValue cents={receivableCents} />
        </Typography>
        <Button variant="outlined" onClick={onViewDetail}>
          Voir les factures
        </Button>
      </Stack>
    </SurfaceCard>
  );
}
