import { chromium as defaultChromium } from 'playwright';

export function findInvoice(state, invoiceId) {
  console.log('[DEBUG] findInvoice called with:', { state, invoiceId });
  const invoice = state?.invoices?.find((invoice) => invoice.id === invoiceId);
  console.log('[DEBUG] findInvoice result:', invoice);
  return invoice;
}

export function findPharmacien(state, id) {
  return state?.pharmaciens?.find((pharmacien) => pharmacien.id === id);
}

export function sanitizeFilename(value) {
  return String(value || 'facture').replace(/[^a-z0-9-_]+/gi, '_');
}

export function buildInvoiceFooterTemplate(invoice, pharmacien) {
  const collectsTaxes = pharmacien?.taxStatus === 'REGISTERED';
  const taxText = collectsTaxes
    ? `TPS/TVQ applicables.${pharmacien?.gstNumber ? `<br/>TPS : ${pharmacien.gstNumber}` : ''}${pharmacien?.qstNumber ? `<br/>TVQ : ${pharmacien.qstNumber}` : ''}`
    : 'TPS/TVQ non applicables — petit fournisseur.';

  return `
    <div style="
      width: 100%;
      font-size: 7px;
      color: #6b7280;
      padding: 0 10mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e5e7eb;
      padding-top: 4px;
      font-family: Arial, sans-serif;
      box-sizing: border-box;
    ">
      <div>${taxText}<br/>Facture générée électroniquement — aucune signature requise.</div>
      <div>Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>
    </div>
  `;
}

export async function generateInvoicePdf(invoiceId, state, options = {}) {
  const invoice = findInvoice(state, invoiceId);
  if (!invoice) {
    const error = new Error(`Invoice not found: ${invoiceId}`);
    error.status = 404;
    error.code = 'INVOICE_NOT_FOUND';
    throw error;
  }

  const chromium = options.chromium ?? defaultChromium;
  const appBaseUrl = options.appBaseUrl;
  const storageKey = options.storageKey ?? 'mission-app:v1';
  const pharmacien = findPharmacien(state, invoice.pharmacienId);
  const url = `${appBaseUrl}/invoices/${encodeURIComponent(invoiceId)}/print`;
  let browser;

  try {
    console.log('[DEBUG] Launching browser...');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    console.log('[DEBUG] Setting localStorage...');
    await page.addInitScript(({ key, snapshot }) => {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    }, { key: storageKey, snapshot: state });
    console.log('[DEBUG] Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    console.log('[DEBUG] Emulating print media...');
    await page.emulateMedia({ media: 'print' });
    console.log('[DEBUG] Generating PDF...');
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: buildInvoiceFooterTemplate(invoice, pharmacien),
      margin: { top: '10mm', right: '10mm', bottom: '20mm', left: '10mm' },
    });
  } catch (error) {
    console.error('[PDF_GENERATION_ERROR]', { invoiceId, url, timestamp: new Date().toISOString(), error });
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}
