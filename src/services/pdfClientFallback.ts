/**
 * Service de génération de PDF côté client comme fallback.
 * Utilisé lorsque le serveur est indisponible.
 */

import { jsPDF } from 'jspdf';
import type { Mission, Invoice } from '../storage/schema';

/**
 * Génère un PDF de facture côté client avec jspdf.
 * C'est une version simplifiée, utilisée comme fallback lorsque le serveur est indisponible.
 */
export function generateClientInvoicePdf(
  invoice: Invoice,
  mission: Mission,
  options: {
    pharmacienNom?: string;
    pharmacieNom?: string;
    appBaseUrl?: string;
  } = {}
): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { pharmacienNom = 'Pharmacien', pharmacieNom = 'Pharmacie', appBaseUrl = '' } = options;

  // Configuration de base
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const lineHeight = 7;
  let y = margin;

  // Style
  doc.setFont('helvetica', 'bold');

  // En-tête
  doc.setFontSize(18);
  doc.text('FACTURE', pageWidth / 2, y, { align: 'center' });
  y += lineHeight * 1.5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Numéro: ${invoice.numero}`, pageWidth / 2, y, { align: 'center' });
  y += lineHeight;
  doc.text(`Date: ${new Date(invoice.dateFacture).toLocaleDateString('fr-CA')}`, pageWidth / 2, y, { align: 'center' });
  y += lineHeight * 1.5;

  // Informations du pharmacien et de la pharmacie
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Pharmacien:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(pharmacienNom, margin + 30, y);
  y += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Pharmacie:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(pharmacieNom, margin + 30, y);
  y += lineHeight * 1.5;

  // Informations de la mission
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Détails de la mission', margin, y);
  y += lineHeight;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Date de la mission
  const missionDate = mission.dateDebut;
  doc.text(`Date: ${new Date(missionDate).toLocaleDateString('fr-CA')}`, margin, y);
  y += lineHeight;

  // Heures travaillées
  doc.text(`Heures: ${mission.totalHours.toFixed(2)} h`, margin, y);
  y += lineHeight;

  // Taux horaire
  const rate = (mission.hourlyRateCents / 100).toFixed(2);
  doc.text(`Taux horaire: ${rate} $/h`, margin, y);
  y += lineHeight;

  // Sous-total
  const subtotal = (mission.subtotalCents / 100).toFixed(2);
  doc.text(`Sous-total: ${subtotal} $`, margin, y);
  y += lineHeight;

  // Frais supplémentaires
  const mealTotal = (mission.mealTotalCents / 100).toFixed(2);
  const mileageTotal = (mission.mileageTotalCents / 100).toFixed(2);
  
  if (mission.mealTotalCents > 0 || mission.mileageTotalCents > 0) {
    doc.text('Frais supplémentaires:', margin, y);
    y += lineHeight;
    
    if (mission.mealTotalCents > 0) {
      doc.text(`  Repas: ${mealTotal} $`, margin + 5, y);
      y += lineHeight * 0.8;
    }
    
    if (mission.mileageTotalCents > 0) {
      doc.text(`  Kilométrage: ${mileageTotal} $`, margin + 5, y);
      y += lineHeight * 0.8;
    }
    y += lineHeight * 0.2;
  }

  // Total
  y += lineHeight * 0.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const total = (mission.totalCents / 100).toFixed(2);
  doc.text(`Total: ${total} $`, margin, y);
  y += lineHeight;

  // Conditions de paiement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (invoice.dateEcheance) {
    doc.text(`Échéance: ${new Date(invoice.dateEcheance).toLocaleDateString('fr-CA')}`, margin, y);
    y += lineHeight;
  }

  // Pied de page
  y = pageHeight - margin - lineHeight;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Généré par Mission App - Version client', pageWidth / 2, y, { align: 'center' });
  if (appBaseUrl) {
    doc.text(appBaseUrl, pageWidth / 2, y + lineHeight * 0.7, { align: 'center' });
  }

  // Retourner le PDF comme Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Télécharge le PDF généré côté client.
 * Crée un blob et déclenche le téléchargement.
 */
export function downloadClientInvoicePdf(
  invoice: Invoice,
  mission: Mission,
  options: {
    pharmacienNom?: string;
    pharmacieNom?: string;
    appBaseUrl?: string;
    fileName?: string;
  } = {}
): void {
  try {
    const pdfBytes = generateClientInvoicePdf(invoice, mission, options);
    // Convertir Uint8Array en ArrayBuffer pour Blob
    const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    const blob = new Blob([arrayBuffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.fileName ?? `Facture_${invoice.numero}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Échec de la génération du PDF côté client:', error);
    alert('Impossible de générer le PDF côté client. Veuillez réessayer plus tard.');
  }
}

/**
 * Vérifie si le serveur PDF est disponible.
 * Utilise une requête ping pour vérifier.
 */
export async function isPdfServerAvailable(baseUrl: string = ''): Promise<boolean> {
  try {
    const url = baseUrl ? `${baseUrl}/api/health` : '/api/health';
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000), // Timeout de 2 secondes
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Génère et télécharge un PDF avec fallback client.
 * Tente d'abord le serveur, puis utilise le client si le serveur échoue.
 */
export async function generateAndDownloadPdfWithFallback(
  invoice: Invoice,
  mission: Mission,
  options: {
    pharmacienNom?: string;
    pharmacieNom?: string;
    appBaseUrl?: string;
    serverEndpoint?: string;
  } = {}
): Promise<void> {
  const { serverEndpoint = '', ...clientOptions } = options;
  
  try {
    // Essayer le serveur d'abord
    const serverAvailable = await isPdfServerAvailable(serverEndpoint || options.appBaseUrl);
    
    if (serverAvailable) {
      // Le serveur est disponible, utiliser l'endpoint normal
      const response = await fetch(`${serverEndpoint}/api/invoices/${invoice.id}/pdf`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Facture_${invoice.numero}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }
    
    // Fallback vers le client
    console.warn('Serveur PDF indisponible, utilisation du fallback client');
    downloadClientInvoicePdf(invoice, mission, clientOptions);
  } catch (error) {
    console.error('Échec de la génération du PDF:', error);
    // Fallback vers le client
    downloadClientInvoicePdf(invoice, mission, clientOptions);
  }
}
