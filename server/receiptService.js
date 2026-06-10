import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const RECEIPT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
export const RECEIPT_ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'pdf']);

function safeFileName(value) {
  return String(value || 'receipt').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120) || 'receipt';
}

function metadataPath(storageRoot) {
  return path.join(storageRoot, 'metadata.json');
}

async function readMetadata(storageRoot) {
  try {
    return JSON.parse(await readFile(metadataPath(storageRoot), 'utf8'));
  } catch {
    return [];
  }
}

async function writeMetadata(storageRoot, receipts) {
  await mkdir(storageRoot, { recursive: true });
  await writeFile(metadataPath(storageRoot), JSON.stringify(receipts, null, 2));
}

export async function validateReceiptUpload({ fileType, fileSizeBytes, buffer }) {
  // Vérification de la taille
  if (fileSizeBytes > RECEIPT_MAX_SIZE_BYTES) return { error: 'RECEIPT_TOO_LARGE', message: 'Fichier trop lourd. Limite: 10 Mo.' };

  // Vérification du type MIME déclaré
  if (!RECEIPT_ALLOWED_TYPES.has(fileType)) return { error: 'UNSUPPORTED_RECEIPT_TYPE', message: 'Format refusé. Utilisez JPG, PNG ou PDF.' };

  // Vérification des magic bytes pour valider le type réel du fichier
  if (buffer && Buffer.isBuffer(buffer)) {
    try {
      const detectedType = await fileTypeFromBuffer(buffer);
      if (detectedType) {
        const detectedMime = detectedType.mime;
        if (!RECEIPT_ALLOWED_TYPES.has(detectedMime)) {
          return { error: 'INVALID_FILE_TYPE', message: `Type de fichier détecté non autorisé: ${detectedMime}. Utilisez JPG, PNG ou PDF.` };
        }
      } else {
        // Si le type ne peut pas être détecté, refusons par sécurité
        return { error: 'UNRECOGNIZED_FILE_TYPE', message: 'Type de fichier non reconnu. Utilisez JPG, PNG ou PDF.' };
      }
    } catch (error) {
      // En cas d'erreur de détection, on se base sur le type déclaré
      // mais on logge l'erreur pour investigation
      logger.warn({ error: error.message }, 'Erreur de détection du type de fichier');
    }
  }

  return null;
}

export async function createReceiptStorage(options = {}) {
  const storageRoot = options.storageRoot ?? path.resolve(process.cwd(), 'data/receipts');
  await mkdir(storageRoot, { recursive: true });
  return { storageRoot };
}

export async function saveReceipt(storage, params) {
  const fileName = safeFileName(params.fileName);
  const fileType = String(params.fileType || '');
  const fileSizeBytes = params.buffer?.length ?? 0;
  const validation = await validateReceiptUpload({ fileType, fileSizeBytes, buffer: params.buffer });
  if (validation) {
    const error = new Error(validation.message);
    error.status = validation.error === 'RECEIPT_TOO_LARGE' ? 413 : validation.error === 'INVALID_FILE_TYPE' || validation.error === 'UNRECOGNIZED_FILE_TYPE' ? 415 : 415;
    error.payload = validation;
    throw error;
  }

  const id = `rcpt_${randomUUID()}`;
  const missionId = safeFileName(params.missionId || 'unassigned');
  const expenseId = safeFileName(params.expenseId);
  const storedFileName = `${id}-${fileName}`;
  const relativePath = path.join('receipts', missionId, expenseId, storedFileName);
  const absolutePath = path.join(storage.storageRoot, missionId, expenseId, storedFileName);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, params.buffer);

  const receipt = {
    id,
    expenseId: params.expenseId,
    missionId: params.missionId,
    missionDayId: params.missionDayId || undefined,
    fileName,
    fileType,
    fileSizeBytes,
    storageUrl: `/api/expense-receipts/${id}/download`,
    uploadedAt: new Date().toISOString(),
    ocrStatus: 'NOT_PROCESSED',
    relativePath,
  };

  const receipts = await readMetadata(storage.storageRoot);
  receipts.push(receipt);
  await writeMetadata(storage.storageRoot, receipts);
  return publicReceipt(receipt);
}

export async function listReceipts(storage, expenseId) {
  const receipts = await readMetadata(storage.storageRoot);
  return receipts.filter((receipt) => receipt.expenseId === expenseId).map(publicReceipt);
}

export async function findReceipt(storage, receiptId) {
  const receipts = await readMetadata(storage.storageRoot);
  return receipts.find((receipt) => receipt.id === receiptId) ?? null;
}

export async function deleteReceipt(storage, receiptId) {
  const receipts = await readMetadata(storage.storageRoot);
  const receipt = receipts.find((item) => item.id === receiptId);
  if (!receipt) return false;
  await rm(path.join(storage.storageRoot, receipt.relativePath.replace(/^receipts[\\/]/, '')), { force: true });
  await writeMetadata(storage.storageRoot, receipts.filter((item) => item.id !== receiptId));
  return true;
}

export function streamReceiptFile(storage, receipt) {
  return createReadStream(path.join(storage.storageRoot, receipt.relativePath.replace(/^receipts[\\/]/, '')));
}

export function publicReceipt(receipt) {
  const { relativePath, ...publicFields } = receipt;
  return publicFields;
}
