import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactElement } from 'react';
import { AppShell } from '../components/AppShell';
import { ActivityPage } from '../features/activity/ActivityPage';
import { FinancialPage } from '../features/financial/FinancialPage';
import { InvoicePrintPage } from '../features/invoices/InvoicePrintPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { OptionsPage } from '../features/options/OptionsPage';
import { PharmacieAddPage } from '../features/pharmacies/PharmacieAddPage';
import { PharmacienNewPage } from '../features/pharmaciens/PharmacienNewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { RouteErrorPage } from '../pages/errors/RouteErrorPage';

// Lazy loading pour les pages lourdes
const MissionsPage = lazy(() => import('../features/missions/MissionsPage').then(m => ({ default: m.MissionsPage })));
const InvoicesPage = lazy(() => import('../features/invoices/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const MissionFormPageLazy = lazy(() => import('../features/missions/MissionFormPage').then(m => ({ default: m.MissionFormPage })));

function shell(element: ReactElement) {
  return <AppShell>{element}</AppShell>;
}

function LoadingFallback() {
  return <div>Chargement...</div>;
}

function route(path: string, element: ReactElement) {
  return { path, element, errorElement: <RouteErrorPage /> };
}

// Wrapper pour lazy loading avec Suspense
function lazyRoute(path: string, element: ReactElement) {
  return {
    path,
    element: <Suspense fallback={<LoadingFallback />}>{element}</Suspense>,
    errorElement: <RouteErrorPage />,
  };
}

export const router = createBrowserRouter([
  route('/', shell(<OnboardingPage />)),
  route('/welcome', shell(<OnboardingPage />)),
  route('/activity', shell(<ActivityPage />)),
  lazyRoute('/mission/new', shell(<MissionFormPageLazy mode="create" />)),
  lazyRoute('/missions/new', shell(<MissionFormPageLazy mode="create" />)),
  lazyRoute('/missions/:missionId/edit', shell(<MissionFormPageLazy mode="edit" />)),
  lazyRoute('/missions', <MissionsPage />),
  lazyRoute('/invoices', shell(<InvoicesPage />)),
  route('/invoices/:invoiceId/print', <InvoicePrintPage />),
  route('/financial', shell(<FinancialPage />)),
  route('/options', shell(<OptionsPage />)),
  route('/settings', shell(<SettingsPage />)),
  route('/pharmacy/add', shell(<PharmacieAddPage />)),
  route('/pharmacien/new', shell(<PharmacienNewPage />)),
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
]);
