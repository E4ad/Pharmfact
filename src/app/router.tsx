import { createBrowserRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { AppShell } from '../components/AppShell';
import { ActivityPage } from '../features/activity/ActivityPage';
import { FinancialPage } from '../features/financial/FinancialPage';
import { InvoicePrintPage } from '../features/invoices/InvoicePrintPage';
import { InvoicesPage } from '../features/invoices/InvoicesPage';
import { MissionFormPage } from '../features/missions/MissionFormPage';
import { MissionsPage } from '../features/missions/MissionsPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { OptionsPage } from '../features/options/OptionsPage';
import { PharmacieAddPage } from '../features/pharmacies/PharmacieAddPage';
import { PharmacienNewPage } from '../features/pharmaciens/PharmacienNewPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';
import { RouteErrorPage } from '../pages/errors/RouteErrorPage';

function shell(element: ReactElement) {
  return <AppShell>{element}</AppShell>;
}

function route(path: string, element: ReactElement) {
  return { path, element, errorElement: <RouteErrorPage /> };
}

export const router = createBrowserRouter([
  route('/', shell(<OnboardingPage />)),
  route('/welcome', shell(<OnboardingPage />)),
  route('/activity', shell(<ActivityPage />)),
  route('/mission/new', shell(<MissionFormPage mode="create" />)),
  route('/missions/new', shell(<MissionFormPage mode="create" />)),
  route('/missions/:missionId/edit', shell(<MissionFormPage mode="edit" />)),
  route('/missions', <MissionsPage />),
  route('/invoices', shell(<InvoicesPage />)),
  route('/invoices/:invoiceId/print', <InvoicePrintPage />),
  route('/financial', shell(<FinancialPage />)),
  route('/options', shell(<OptionsPage />)),
  route('/settings', shell(<SettingsPage />)),
  route('/pharmacy/add', shell(<PharmacieAddPage />)),
  route('/pharmacien/new', shell(<PharmacienNewPage />)),
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorPage /> },
]);
