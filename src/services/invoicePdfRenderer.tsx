import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { invoiceMissionIds } from './businessRules';
import type { AppState, Invoice, Mission } from '../storage/schema';
import { findMission, findPharmacien, findPharmacie } from '../storage/selectors';
import { InvoiceTemplate } from '../features/invoices/InvoiceTemplate';

function resolveInvoiceTemplateProps(invoice: Invoice, state: AppState) {
  const missions = invoiceMissionIds(invoice)
    .map((id) => findMission(state, id))
    .filter((item): item is Mission => Boolean(item));

  return {
    invoice,
    state,
    mission: missions[0],
    missions,
    pharmacien: findPharmacien(state, invoice.pharmacienId),
    pharmacie: findPharmacie(state, invoice.pharmacieId),
  };
}

async function waitForLayout(): Promise<void> {
  await document.fonts?.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function renderInvoiceOffscreen(invoice: Invoice, state: AppState): Promise<{ element: HTMLElement; root: Root; container: HTMLElement }> {
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '900px';
  container.style.minHeight = '1400px';
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);
  flushSync(() => {
    root.render(<InvoiceTemplate {...resolveInvoiceTemplateProps(invoice, state)} />);
  });

  await waitForLayout();
  const element = container.querySelector<HTMLElement>('.invoice-document');
  if (!element) {
    root.unmount();
    container.remove();
    throw new Error('Template de facture introuvable.');
  }

  return { element, root, container };
}

async function htmlInvoiceToPdfBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: Math.min(window.devicePixelRatio || 2, 2),
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const image = canvas.toDataURL('image/jpeg', 0.98);

  // Subtract 1mm before ceiling to absorb floating-point rounding (297mm CSS → ~297.01mm after pixel conversion)
  const pageCount = Math.max(1, Math.ceil((imgHeight - 1) / pageHeight));

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage();
    pdf.addImage(image, 'JPEG', 0, -page * pageHeight, imgWidth, imgHeight);
  }

  return pdf.output('blob');
}

export async function renderInvoicePdfBlob(invoice: Invoice, state: AppState): Promise<Blob> {
  const rendered = await renderInvoiceOffscreen(invoice, state);
  try {
    return await htmlInvoiceToPdfBlob(rendered.element);
  } finally {
    rendered.root.unmount();
    rendered.container.remove();
  }
}
