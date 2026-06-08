import { expect, test } from '@playwright/test';

test('le proxy frontend expose le healthcheck backend', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('la route PDF retourne un vrai PDF', async ({ request }) => {
  const response = await request.get('/api/invoices/inv_seed_1/pdf');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  expect(response.headers()['content-disposition']).toContain('.pdf');

  const body = await response.body();
  expect(body.subarray(0, 4).toString()).toBe('%PDF');
  expect(body.length).toBeGreaterThan(10_000);
});

test('l’utilisateur peut télécharger le PDF d’une facture', async ({ page }) => {
  await page.goto('/invoices');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Télécharger PDF/i }).first().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('l’utilisateur peut ouvrir les options depuis l’activité', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Entrer avec ce profil').first().click();
  await page.getByRole('button', { name: /Options Profils, pharmacies et paramètres par défaut/i }).click();

  await expect(page).toHaveURL(/\/options$/);
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Profil actif' })).toBeVisible();
});

test('l’utilisateur peut ouvrir l’état financier depuis l’activité', async ({ page }) => {
  await page.goto('/activity');

  await expect(page.getByRole('button', { name: /État financier Revenus, acomptes, taxes et réserve fiscale/i })).toBeVisible();
  await page.getByRole('button', { name: /État financier Revenus, acomptes, taxes et réserve fiscale/i }).click();

  await expect(page).toHaveURL(/\/financial$/);
  await expect(page.getByRole('heading', { name: 'Pilotage fiscal' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pilotage fiscal' })).toBeVisible();
  await page.getByRole('button', { name: 'Accueil' }).click();
  await expect(page).toHaveURL(/\/activity$/);
});

test('les réglages financiers persistent et pilotent l’état financier', async ({ page }) => {
  await page.goto('/options');
  await page.getByRole('button', { name: 'Financier & fiscalité' }).click();
  await page.getByRole('spinbutton', { name: 'Réserve fiscale recommandée (%)' }).fill('25');
  await page.getByLabel('Trimestriel').uncheck();
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await page.goto('/options');
  await page.getByRole('button', { name: 'Financier & fiscalité' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Réserve fiscale recommandée (%)' })).toHaveValue('25');

  await page.goto('/financial');
  await expect(page.getByText('25 % du bénéfice estimé')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trimestriel' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Options' })).toHaveCount(0);
});

test('les frais de mission typés remontent dans l’état financier avec justificatifs', async ({ page }) => {
  await page.addInitScript(() => {
    const base = JSON.parse(window.localStorage.getItem('mission-app:v1') || '{}');
    window.localStorage.setItem('mission-app:v1', JSON.stringify({ ...base, version: 1, activePharmacienId: 'ph_1', pharmaciens: [{ id: 'ph_1', nom: 'QA Pharmacien', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 8000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }], pharmacies: [{ id: 'pha_1', nom: 'QA Pharmacie', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 60 }], invoices: [], taxPayments: [], deductibleExpenses: [], distanceReferences: [], options: base.options, fiscalSettings: { ...base.fiscalSettings, currentYear: 2026, currentFiscalYear: 2026, includeMissionDeductibleExpenses: true, enableExpenseTracking: true, trackExpenseReceipts: true, warnMissingExpenseReceipts: true }, expenseReceipts: [{ id: 'rcpt_1', expenseId: 'fee_parking', missionId: 'mis_e2e', missionDayId: 'day_1', fileName: 'recu-stationnement.jpg', fileType: 'image/jpeg', fileSizeBytes: 1000, storageUrl: 'receipts/mis_e2e/fee_parking/rcpt_1-recu-stationnement.jpg', uploadedAt: new Date().toISOString() }], missions: [{ id: 'mis_e2e', missionCode: 'MIS-E2E', pharmacienId: 'ph_1', pharmacieId: 'pha_1', status: 'COMPLETED', dateDebut: '2026-06-05', dateFin: '2026-06-05', days: [{ id: 'day_1', dateService: '2026-06-05', startTime: '08:00', endTime: '17:00', unpaidBreakMinutes: 60, description: 'Mission', hours: 8, expenses: [{ id: 'fee_parking', typeKey: 'PARKING', label: 'Stationnement', amountCents: 1200, billable: true, createsDeductibleExpense: true, deductibleCategory: 'PARKING', deductibleRate: 1, receiptIds: ['rcpt_1'], source: 'MISSION_EXPENSE' }, { id: 'fee_hotel', typeKey: 'LODGING', label: 'Hôtel', amountCents: 15000, billable: true, createsDeductibleExpense: true, deductibleCategory: 'LODGING', deductibleRate: 1, receiptIds: [], source: 'MISSION_EXPENSE' }, { id: 'fee_other', typeKey: 'OTHER_NON_DEDUCTIBLE', label: 'Autre non déductible', amountCents: 2500, billable: true, createsDeductibleExpense: false, deductibleCategory: 'NON_DEDUCTIBLE', deductibleRate: 0, receiptIds: [], source: 'MISSION_EXPENSE' }] }], hourlyRateCents: 8000, mealFeeCents: 0, mileageKm: 0, mileageRateCents: 61, totalHours: 8, subtotalCents: 64000, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 82700, events: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], ui: { missionFilters: {} } }));
  });
  await page.goto('/financial');

  await expect(page.getByText('Dépenses issues des missions')).toBeVisible();
  await expect(page.getByText('Stationnement')).toBeVisible();
  await expect(page.getByText('✓ reçu')).toBeVisible();
  await expect(page.getByText('Reçus obligatoires manquants')).toBeVisible();
  await expect(page.getByText('Autre non déductible')).toHaveCount(0);
});

test('une route inconnue affiche une page 404 propre', async ({ page }) => {
  await page.goto('/route-inconnue-qa');

  await expect(page.getByText('Page introuvable')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cette page n’existe pas.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retour à l’accueil' })).toBeVisible();
  await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
});
