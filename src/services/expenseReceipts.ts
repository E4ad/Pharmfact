import type { ExpenseReceipt } from '../storage/schema';
import { createId } from './ids';
import { getPlatform } from './platformService';

export const RECEIPT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const RECEIPT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;

type ReceiptFileType = ExpenseReceipt['fileType'];

export function validateReceiptFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!RECEIPT_ALLOWED_TYPES.includes(file.type as ReceiptFileType)) return 'Format refusé. Utilisez JPG, PNG ou PDF.';
  if (file.size > RECEIPT_MAX_SIZE_BYTES) return 'Fichier trop lourd. Limite: 10 Mo.';
  return null;
}

export function createLocalReceipt(params: { file: File; expenseId: string; missionId: string; missionDayId?: string }): ExpenseReceipt {
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const id = createId('rcpt');
  return {
    id,
    expenseId: params.expenseId,
    missionId: params.missionId,
    missionDayId: params.missionDayId,
    fileName: safeName,
    fileType: params.file.type as ReceiptFileType,
    fileSizeBytes: params.file.size,
    storageUrl: `receipts/${params.missionId}/${params.expenseId}/${id}-${safeName}`,
    uploadedAt: new Date().toISOString(),
    ocrStatus: 'NOT_PROCESSED',
  };
}

export function removeReceiptFromState<T extends { expenseReceipts: ExpenseReceipt[]; missions: Array<{ days: Array<{ expenses?: Array<{ id: string; receiptIds?: string[] }> }> }> }>(state: T, receiptId: string): T {
  return {
    ...state,
    expenseReceipts: state.expenseReceipts.filter((receipt) => receipt.id !== receiptId),
    missions: state.missions.map((mission) => ({
      ...mission,
      days: mission.days.map((day) => ({
        ...day,
        expenses: day.expenses?.map((expense) => ({ ...expense, receiptIds: expense.receiptIds?.filter((id) => id !== receiptId) })) ?? [],
      })),
    })),
  };
}

export async function uploadExpenseReceipt(params: { file: File; expenseId: string; missionId: string; missionDayId?: string }): Promise<ExpenseReceipt> {
  const error = validateReceiptFile(params.file);
  if (error) throw new Error(error);
  
  // Utiliser l'adapter de plateforme
  return getPlatform().api.uploadExpenseReceipt(params.expenseId, params.file);
}

export async function listExpenseReceipts(expenseId: string): Promise<ExpenseReceipt[]> {
  // Utiliser l'adapter de plateforme
  return getPlatform().api.getExpenseReceipts(expenseId);
}

export async function deleteExpenseReceipt(receiptId: string): Promise<void> {
  // Utiliser l'adapter de plateforme
  return getPlatform().api.deleteExpenseReceipt(receiptId);
}

export function expenseReceiptDownloadUrl(receiptId: string): string {
  // Utiliser l'adapter de plateforme
  return getPlatform().api.getReceiptDownloadUrl(receiptId);
}
