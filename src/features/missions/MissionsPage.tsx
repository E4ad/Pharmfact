import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import { Alert, Button, Snackbar } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageBackButton } from '../../components/PageBackButton';
import { apiUrl, assertBackendAvailable } from '../../services/api';
import { buildMissionIcs, downloadIcs } from '../../services/calendarIcs';
import { createId } from '../../services/ids';
import { createInvoiceFromMission, invoiceStatusLabels, transitionInvoice } from '../../services/invoiceWorkflow';
import { formatMoney } from '../../services/money';
import { missionStatusLabels } from '../../services/missionStatus';
import { exportAppState, updateAppState, useAppState } from '../../storage/localStore';
import type { Invoice, InvoiceStatus, Mission, MissionStatus, Pharmacien, Pharmacie } from '../../storage/schema';
import { findInvoice, findPharmacien, findPharmacie, missionInvoice } from '../../storage/selectors';
import './MissionsPage.css';

const missionStatusOptions: MissionStatus[] = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
const missionFilterOptions: Array<{ value: MissionStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'CONFIRMED', label: 'À venir' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'ARCHIVED', label: 'Archivée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

type MissionFilter = MissionStatus | 'ALL';
function missionStatusClass(status: MissionStatus): string {
  if (status === 'IN_PROGRESS') return 'is-warning';
  if (status === 'COMPLETED') return 'is-success';
  if (status === 'ARCHIVED' || status === 'CANCELLED') return 'is-muted';
  return 'is-blue';
}

function invoiceStatusClass(status?: InvoiceStatus): string {
  if (!status) return 'is-muted';
  if (status === 'PAID') return 'is-success';
  if (status === 'ARCHIVED' || status === 'VOIDED') return 'is-muted';
  return 'is-blue';
}

function periodLabel(mission: Mission): string {
  return mission.dateDebut === mission.dateFin ? mission.dateDebut : `${mission.dateDebut} - ${mission.dateFin}`;
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export function MissionsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('selected'));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MissionFilter>('ALL');
  const [toast, setToast] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  const missions = useMemo(
    () => [...state.missions]
      .filter((mission) => statusFilter === 'ALL' || mission.status === statusFilter)
      .sort((a, b) => `${b.dateDebut}${b.createdAt}`.localeCompare(`${a.dateDebut}${a.createdAt}`)),
    [state.missions, statusFilter],
  );
  const selected = state.missions.find((mission) => mission.id === selectedId);
  const selectedInvoice = selected ? findInvoice(state, selected.invoiceId) ?? missionInvoice(state, selected) : undefined;

  useEffect(() => {
    const selected = searchParams.get('selected');
    if (selected) setSelectedId(selected);
  }, [searchParams]);

  useEffect(() => {
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setSearchParams({});
        setHistoryOpen(false);
      }
    }

    window.addEventListener('keydown', closeWithEscape);
    return () => window.removeEventListener('keydown', closeWithEscape);
  }, []);

  function openMission(missionId: string) {
    setSelectedId(missionId);
    setSearchParams({ selected: missionId });
    setHistoryOpen(false);
  }

  function closeDrawer() {
    setSelectedId(null);
    setSearchParams({});
    setHistoryOpen(false);
  }

  function transitionMission(mission: Mission, status: MissionStatus) {
    updateAppState((current) => ({
      ...current,
      missions: current.missions.map((item) => item.id === mission.id ? {
        ...item,
        status,
        updatedAt: new Date().toISOString(),
        events: [...item.events, { id: createId('evt'), eventType: 'STATUS_CHANGED', label: `Mission marquée ${missionStatusLabels[status].toLowerCase()}`, eventDate: new Date().toISOString() }],
      } : item),
    }));
    setToast({ severity: 'success', message: `Mission marquée ${missionStatusLabels[status].toLowerCase()}` });
  }

  function generateInvoice(mission: Mission) {
    updateAppState((current) => {
      const currentMission = current.missions.find((item) => item.id === mission.id);
      if (!currentMission || currentMission.invoiceId) return current;
      const invoice = createInvoiceFromMission(currentMission, current);
      return {
        ...current,
        invoices: [...current.invoices, invoice],
        missions: current.missions.map((item) => item.id === mission.id ? {
          ...item,
          invoiceId: invoice.id,
          events: [...item.events, { id: createId('evt'), eventType: 'INVOICE_CREATED', label: `Facture ${invoice.numero} générée`, eventDate: new Date().toISOString() }],
        } : item),
      };
    });
    setToast({ severity: 'success', message: 'Facture générée' });
  }

  function updateInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
    updateAppState((current) => ({
      ...current,
      invoices: current.invoices.map((invoice) => invoice.id === invoiceId ? transitionInvoice(invoice, status) : invoice),
    }));
    setToast({ severity: 'success', message: `Facture ${invoiceStatusLabels[status].toLowerCase()}` });
  }

  function downloadCalendar(mission: Mission) {
    const pharmacien = findPharmacien(state, mission.pharmacienId);
    const pharmacie = findPharmacie(state, mission.pharmacieId);
    downloadIcs(`${mission.missionCode}.ics`, buildMissionIcs(mission, pharmacien, pharmacie));
    setToast({ severity: 'success', message: 'Invitation calendrier téléchargée' });
  }

  async function downloadPdf(invoiceId: string) {
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    setDownloadingInvoiceId(invoiceId);
    try {
      await assertBackendAvailable();
      const response = await fetch(apiUrl(`/invoices/${invoiceId}/pdf`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: JSON.parse(exportAppState()) }),
      });
      if (!response.ok) {
        console.error('[qa-pdf-download-failed]', { invoiceId, status: response.status, body: await response.text() });
        throw new Error('pdf failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.numero}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ severity: 'success', message: 'PDF téléchargé' });
    } catch (error) {
      setToast({ severity: 'error', message: error instanceof Error && error.name === 'BACKEND_UNAVAILABLE' ? 'Serveur API inaccessible' : 'Le PDF n’a pas pu être généré. Vérifiez que le serveur est démarré puis réessayez.' });
    } finally {
      setDownloadingInvoiceId(null);
    }
  }

  return (
    <main className={`mission-focus-page ${selected ? 'has-selection' : ''}`}>
      <header className="mission-focus-header">
        <PageBackButton to="/activity" />
        <h1>Pilotage des missions</h1>
      </header>

      <div className="mission-filter-bar" aria-label="Filtres par statut mission">
        {missionFilterOptions.map((option) => (
          <button key={option.value} className={statusFilter === option.value ? 'is-active' : ''} type="button" onClick={() => setStatusFilter(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      <section className="mission-list" aria-label="Liste des missions">
        {missions.length ? missions.map((mission) => (
          <MissionListItem
            key={mission.id}
            mission={mission}
            invoice={missionInvoice(state, mission)}
            pharmacie={findPharmacie(state, mission.pharmacieId)}
            selected={selectedId === mission.id}
            onClick={() => openMission(mission.id)}
          />
        )) : (
          <div className="mission-empty-state">
            <p>Aucune mission à piloter.</p>
            <button type="button" onClick={() => navigate('/mission/new')}>Créer une mission</button>
          </div>
        )}
      </section>

      {selected ? (
        <>
          <button className="mission-drawer-backdrop" type="button" aria-label="Fermer le détail mission" onClick={closeDrawer} />
          <MissionDrawer
            mission={selected}
            invoice={selectedInvoice}
            pharmacien={findPharmacien(state, selected.pharmacienId)}
            pharmacie={findPharmacie(state, selected.pharmacieId)}
            historyOpen={historyOpen}
            onClose={closeDrawer}
            onToggleHistory={() => setHistoryOpen((open) => !open)}
            onCalendar={downloadCalendar}
            onTransitionMission={transitionMission}
            onEditMission={(missionId) => navigate(`/missions/${missionId}/edit`)}
            onGenerateInvoice={generateInvoice}
            onInvoiceStatus={updateInvoiceStatus}
            onOpenPdf={downloadPdf}
            downloadingInvoiceId={downloadingInvoiceId}
          />
        </>
      ) : null}

      <Snackbar open={Boolean(toast)} autoHideDuration={2600} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </main>
  );
}

function MissionListItem({ mission, invoice, pharmacie, selected, onClick }: {
  mission: Mission;
  invoice?: Invoice;
  pharmacie?: Pharmacie;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button data-testid="mission-row" className={`mission-list-item ${selected ? 'is-selected' : ''}`} type="button" onClick={onClick}>
      <span className="mission-list-primary">{pharmacie?.nom ?? 'Remplacement officine'}</span>
      <span className="mission-list-period">{periodLabel(mission)}</span>
      <StatusPill label={missionStatusLabels[mission.status]} tone={missionStatusClass(mission.status)} />
      <StatusPill label={invoice ? invoiceStatusLabels[invoice.status] : 'Non générée'} tone={invoiceStatusClass(invoice?.status)} />
    </button>
  );
}

function MissionDrawer({ mission, invoice, pharmacien, pharmacie, historyOpen, downloadingInvoiceId, onClose, onToggleHistory, onCalendar, onTransitionMission, onEditMission, onGenerateInvoice, onInvoiceStatus, onOpenPdf }: {
  mission: Mission;
  invoice?: Invoice;
  pharmacien?: Pharmacien;
  pharmacie?: Pharmacie;
  historyOpen: boolean;
  downloadingInvoiceId: string | null;
  onClose: () => void;
  onToggleHistory: () => void;
  onCalendar: (mission: Mission) => void;
  onTransitionMission: (mission: Mission, status: MissionStatus) => void;
  onEditMission: (missionId: string) => void;
  onGenerateInvoice: (mission: Mission) => void;
  onInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onOpenPdf: (invoiceId: string) => void;
}) {
  return (
    <aside data-testid="mission-drawer" className="mission-drawer" aria-label={`Détail ${mission.missionCode}`}>
      <button className="mission-drawer-close" type="button" onClick={onClose} aria-label="Fermer"><CloseRoundedIcon fontSize="small" /></button>
      <MissionDrawerHeader mission={mission} pharmacien={pharmacien} pharmacie={pharmacie} />
      <section className="mission-drawer-section">
        <h3>Actions mission</h3>
        <DrawerActionButton label="Modifier la mission" onClick={() => onEditMission(mission.id)} />
      </section>
      <button className="mission-calendar-action" type="button" onClick={() => onCalendar(mission)}>
        <CalendarMonthRoundedIcon fontSize="small" />
        Télécharger invitation calendrier (.ics)
      </button>
      <MissionStatusControls mission={mission} onTransition={onTransitionMission} />
      <MissionBillingSection invoice={invoice} mission={mission} downloadingInvoiceId={downloadingInvoiceId} onGenerateInvoice={onGenerateInvoice} onInvoiceStatus={onInvoiceStatus} onOpenPdf={onOpenPdf} />
      <MissionHistorySection mission={mission} open={historyOpen} onToggle={onToggleHistory} />
    </aside>
  );
}

function MissionDrawerHeader({ mission, pharmacien, pharmacie }: { mission: Mission; pharmacien?: Pharmacien; pharmacie?: Pharmacie }) {
  return (
    <section className="mission-drawer-header">
      <div className="mission-kicker">Type de mission</div>
      <h2>Remplacement officine</h2>
      <dl className="mission-detail-grid">
        <div>
          <dt>Mission</dt>
          <dd>{mission.missionCode}</dd>
        </div>
        <div>
          <dt>Pharmacie</dt>
          <dd>{pharmacie?.nom ?? 'Pharmacie non définie'}</dd>
        </div>
        <div>
          <dt>Pharmacien</dt>
          <dd>{pharmacien?.nom ?? 'Pharmacien non défini'}</dd>
        </div>
        <div>
          <dt>Période</dt>
          <dd>{periodLabel(mission)}</dd>
        </div>
        <div>
          <dt>Résumé</dt>
          <dd>{mission.totalHours.toFixed(2)} h · {formatMoney(mission.totalCents)}</dd>
        </div>
      </dl>
    </section>
  );
}

function MissionStatusControls({ mission, onTransition }: { mission: Mission; onTransition: (mission: Mission, status: MissionStatus) => void }) {
  return (
    <section className="mission-drawer-section">
      <h3>Statut mission</h3>
      <div className="mission-segmented-controls">
        {missionStatusOptions.map((status) => (
          <button key={status} className={mission.status === status ? 'is-active' : ''} type="button" onClick={() => onTransition(mission, status)}>
            {missionStatusLabels[status]}
          </button>
        ))}
      </div>
    </section>
  );
}

function MissionBillingSection({ invoice, mission, downloadingInvoiceId, onGenerateInvoice, onInvoiceStatus, onOpenPdf }: {
  invoice?: Invoice;
  mission: Mission;
  downloadingInvoiceId: string | null;
  onGenerateInvoice: (mission: Mission) => void;
  onInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onOpenPdf: (invoiceId: string) => void;
}) {
  return (
    <section className="mission-drawer-section">
      <h3>Facturation</h3>
      <div className="mission-billing-card">
        <div className="mission-billing-status-row">
          <span>Statut facture</span>
          <StatusPill label={invoice ? invoiceStatusLabels[invoice.status] : 'Non générée'} tone={invoiceStatusClass(invoice?.status)} />
        </div>
        <div className="mission-billing-actions">
          {!invoice ? <DrawerActionButton label="Générer facture" onClick={() => onGenerateInvoice(mission)} /> : null}
          {invoice ? <DrawerActionButton label={downloadingInvoiceId === invoice.id ? 'Génération PDF...' : 'Télécharger PDF'} icon={<DownloadRoundedIcon fontSize="small" />} disabled={downloadingInvoiceId === invoice.id} onClick={() => onOpenPdf(invoice.id)} /> : null}
          {invoice?.status === 'GENERATED' ? <DrawerActionButton label="Envoyer au paiement" onClick={() => onInvoiceStatus(invoice.id, 'SENT')} /> : null}
          {invoice?.status === 'SENT' ? <DrawerActionButton label="Marquer payée" onClick={() => onInvoiceStatus(invoice.id, 'PAID')} /> : null}
          {invoice?.status === 'PAID' ? <DrawerActionButton label="Archiver" onClick={() => onInvoiceStatus(invoice.id, 'ARCHIVED')} secondary /> : null}
          {invoice?.status === 'ARCHIVED' ? <DrawerActionButton label="Restaurer" onClick={() => onInvoiceStatus(invoice.id, 'GENERATED')} secondary /> : null}
        </div>
      </div>
    </section>
  );
}

function MissionHistorySection({ mission, open, onToggle }: { mission: Mission; open: boolean; onToggle: () => void }) {
  return (
    <section className="mission-drawer-section">
      <button className="mission-history-toggle" type="button" onClick={onToggle} aria-expanded={open}>
        <span>Historique</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open ? (
        <div className="mission-history-list">
          {mission.events.slice().reverse().map((event) => (
            <p key={event.id}>{formatEventDate(event.eventDate)} · {event.label}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`mission-status-pill ${tone}`}>{label}</span>;
}

function DrawerActionButton({ label, icon, secondary, disabled, onClick }: { label: string; icon?: React.ReactNode; secondary?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button className={`drawer-action-button ${secondary ? 'is-secondary' : ''}`} type="button" disabled={disabled} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
