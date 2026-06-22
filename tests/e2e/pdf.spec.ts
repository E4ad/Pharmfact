import { expect, test } from '@playwright/test';

async function installSingleInvoiceState(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('mission-app:v1', JSON.stringify({
      version: 3,
      activePharmacienId: 'ph_pdf_single',
      pharmaciens: [{ id: 'ph_pdf_single', nom: 'QA Pharmacien', adresse: '1 rue Test', ville: 'Montréal', codePostal: 'H2X 1A1', telephone: '', email: '', hourlyRateCents: 8000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
      pharmacies: [{ id: 'pha_pdf_single', nom: 'QA Pharmacie', adresse: '2 rue Client', ville: 'Québec', codePostal: 'G1A 0A2', telephone: '', email: '', defaultBreakMinutes: 60 }],
      missions: [{ id: 'mis_pdf_single', missionCode: 'MIS-PDF', pharmacienId: 'ph_pdf_single', pharmacieId: 'pha_pdf_single', status: 'COMPLETED', actType: 'REMPLACEMENT_OFFICINE', dateDebut: '2026-06-05', dateFin: '2026-06-05', days: [{ id: 'day_pdf_single', dateService: '2026-06-05', startTime: '08:00', endTime: '17:00', unpaidBreakMinutes: 60, description: 'Mission', hours: 8, expenses: [] }], hourlyRateCents: 8000, mealFeeCents: 0, mileageKm: 0, mileageRateCents: 61, totalHours: 8, subtotalCents: 64000, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 64000, events: [], createdAt: '2026-06-05T00:00:00.000Z', updatedAt: '2026-06-05T00:00:00.000Z', invoiceId: 'inv_pdf_single' }],
      invoices: [{ id: 'inv_pdf_single', numero: 'FAC-2026-SINGLE', missionId: 'mis_pdf_single', missionIds: ['mis_pdf_single'], pharmacienId: 'ph_pdf_single', pharmacieId: 'pha_pdf_single', dateFacture: '2026-06-06', dateEcheance: '2026-07-06', status: 'GENERATED', hours: 8, amountCents: 64000, createdAt: '2026-06-06T00:00:00.000Z' }],
      taxPayments: [],
      deductibleExpenses: [],
      expenseReceipts: [],
      distanceReferences: [],
      ui: { missionFilters: {} },
    }));
  });
}

test('le proxy frontend expose le healthcheck backend', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});

test('l’utilisateur peut télécharger le PDF d’une facture', async ({ page }) => {
  await installSingleInvoiceState(page);
  await page.goto('/invoices');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Télécharger PDF/i }).first().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});

test('une facture multi-missions avec frais refacturés se télécharge en PDF', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('mission-app:v1', JSON.stringify({
      version: 3,
      activePharmacienId: 'ph_pdf',
      pharmaciens: [{ id: 'ph_pdf', nom: 'Petit Fournisseur QA', adresse: '1 rue Test', ville: 'Montréal', codePostal: 'H2X 1A1', telephone: '514-555-0101', email: 'qa@example.com', hourlyRateCents: 9000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
      pharmacies: [{ id: 'pha_pdf', nom: 'Pharmacie Multi QA', adresse: '2 rue Client', ville: 'Québec', codePostal: 'G1A 0A2', telephone: '418-555-0101', email: 'client@example.com', defaultBreakMinutes: 60 }],
      missions: [
        { id: 'mis_pdf_1', missionCode: 'MIS-PDF-1', pharmacienId: 'ph_pdf', pharmacieId: 'pha_pdf', status: 'COMPLETED', actType: 'REMPLACEMENT_OFFICINE', dateDebut: '2026-06-01', dateFin: '2026-06-01', days: [{ id: 'day_pdf_1', dateService: '2026-06-01', startTime: '08:00', endTime: '17:00', unpaidBreakMinutes: 60, description: 'Mission', hours: 8, expenses: [{ id: 'fee_pdf_1', typeKey: 'PARKING', label: 'Stationnement', amountCents: 1200, billable: true, createsDeductibleExpense: true, source: 'MISSION_EXPENSE' }] }], hourlyRateCents: 9000, mealFeeCents: 0, mileageKm: 0, mileageRateCents: 61, totalHours: 8, subtotalCents: 72000, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 73200, events: [], createdAt: '2026-06-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z', invoiceId: 'inv_pdf_multi' },
        { id: 'mis_pdf_2', missionCode: 'MIS-PDF-2', pharmacienId: 'ph_pdf', pharmacieId: 'pha_pdf', status: 'COMPLETED', actType: 'REMPLACEMENT_OFFICINE', dateDebut: '2026-06-02', dateFin: '2026-06-02', days: [{ id: 'day_pdf_2', dateService: '2026-06-02', startTime: '09:00', endTime: '17:00', unpaidBreakMinutes: 30, description: 'Mission', hours: 7.5, expenses: [{ id: 'fee_pdf_2', typeKey: 'MEAL', label: 'Repas', amountCents: 2000, billable: true, createsDeductibleExpense: false, source: 'MISSION_EXPENSE' }] }], hourlyRateCents: 9000, mealFeeCents: 0, mileageKm: 0, mileageRateCents: 61, totalHours: 7.5, subtotalCents: 67500, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 69500, events: [], createdAt: '2026-06-02T00:00:00.000Z', updatedAt: '2026-06-02T00:00:00.000Z', invoiceId: 'inv_pdf_multi' },
      ],
      invoices: [{ id: 'inv_pdf_multi', numero: 'FAC-2026-PDF', missionId: 'mis_pdf_1', missionIds: ['mis_pdf_1', 'mis_pdf_2'], pharmacienId: 'ph_pdf', pharmacieId: 'pha_pdf', dateFacture: '2026-06-03', dateEcheance: '2026-07-03', status: 'GENERATED', hours: 15.5, amountCents: 142700, smallSupplierMention: 'Petit fournisseur: TPS/TVQ non applicables.', createdAt: '2026-06-03T00:00:00.000Z' }],
      taxPayments: [],
      deductibleExpenses: [],
      expenseReceipts: [],
      distanceReferences: [],
      ui: { missionFilters: {} },
    }));
  });

  await page.goto('/invoices');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Télécharger PDF/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/FAC-2026-PDF.*\.pdf$/);
});

test('la route print reste consultable comme aperçu', async ({ page }) => {
  await installSingleInvoiceState(page);
  await page.goto('/invoices/inv_pdf_single/print');

  await expect(page.locator('.invoice-document')).toBeVisible();
  await expect(page.getByText(/Facture nº/i)).toBeVisible();
});

test('rééditer une mission facturée télécharge le nouveau PDF et persiste les montants', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('mission-app:v1', JSON.stringify({
      version: 3,
      activePharmacienId: 'ph_regen',
      pharmaciens: [{ id: 'ph_regen', nom: 'QA Pharmacien', adresse: '', ville: '', codePostal: '', telephone: '', email: '', hourlyRateCents: 8000, distanceKmDomicile: 0, taxStatus: 'SMALL_SUPPLIER' }],
      pharmacies: [{ id: 'pha_regen', nom: 'QA Pharmacie', adresse: '', ville: '', codePostal: '', telephone: '', email: '', defaultBreakMinutes: 60 }],
      missions: [{ id: 'mis_regen', missionCode: 'MIS-REGEN', pharmacienId: 'ph_regen', pharmacieId: 'pha_regen', status: 'COMPLETED', actType: 'REMPLACEMENT_OFFICINE', dateDebut: '2026-06-05', dateFin: '2026-06-05', days: [{ id: 'day_regen', dateService: '2026-06-05', startTime: '08:00', endTime: '17:00', unpaidBreakMinutes: 60, description: 'Mission', hours: 8, expenses: [] }], hourlyRateCents: 8000, mealFeeCents: 0, mileageKm: 0, mileageRateCents: 61, totalHours: 8, subtotalCents: 64000, mealTotalCents: 0, mileageTotalCents: 0, totalCents: 64000, events: [], createdAt: '2026-06-05T00:00:00.000Z', updatedAt: '2026-06-05T00:00:00.000Z', invoiceId: 'inv_regen' }],
      invoices: [{ id: 'inv_regen', numero: 'FAC-2026-REGEN', missionId: 'mis_regen', missionIds: ['mis_regen'], pharmacienId: 'ph_regen', pharmacieId: 'pha_regen', dateFacture: '2026-06-06', dateEcheance: '2026-07-06', status: 'SENT', hours: 8, amountCents: 64000, createdAt: '2026-06-06T00:00:00.000Z' }],
      taxPayments: [],
      deductibleExpenses: [],
      expenseReceipts: [],
      distanceReferences: [],
      ui: { missionFilters: {} },
    }));
  });

  await page.goto('/missions/mis_regen/edit');
  await page.locator('.mission-day-button').first().click({ force: true });
  await page.getByLabel('Fin').last().fill('18:00');
  await expect(page.getByLabel('Fin').last()).toHaveValue('18:00');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sauvegarder et télécharger le nouveau PDF' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/FAC-2026-REGEN.*\.pdf$/);
  await expect.poll(async () => page.evaluate(async () => {
    const localState = JSON.parse(window.localStorage.getItem('mission-app:v1') || '{}');
    const localAmount = localState.invoices?.find((invoice: { id: string }) => invoice.id === 'inv_regen')?.amountCents;
    const indexedAmount = await new Promise<number | undefined>((resolve) => {
      const request = indexedDB.open('missionAppDB', 1);
      request.onerror = () => resolve(undefined);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('appState', 'readonly');
        const get = tx.objectStore('appState').get('missionAppState');
        get.onerror = () => resolve(undefined);
        get.onsuccess = () => resolve(get.result?.invoices?.find((invoice: { id: string }) => invoice.id === 'inv_regen')?.amountCents);
      };
    });
    return { localAmount, indexedAmount };
  })).toEqual({ localAmount: 72000, indexedAmount: 72000 });
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
