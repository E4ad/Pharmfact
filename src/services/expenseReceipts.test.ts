import { describe, expect, it } from 'vitest';
import { validateReceiptFile, createLocalReceipt, removeReceiptFromState, expenseReceiptDownloadUrl } from './expenseReceipts';
import type { ExpenseReceipt } from '../storage/schema';

describe('expenseReceipts', () => {
  it('validates allowed receipt types', () => {
    expect(validateReceiptFile({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateReceiptFile({ type: 'image/png', size: 1000 })).toBeNull();
    expect(validateReceiptFile({ type: 'application/pdf', size: 1000 })).toBeNull();
  });

  it('rejects unsupported mime types', () => {
    expect(validateReceiptFile({ type: 'text/plain', size: 1000 })).toBe('Format refusé. Utilisez JPG, PNG ou PDF.');
  });

  it('rejects oversized files', () => {
    expect(validateReceiptFile({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toBe('Fichier trop lourd. Limite: 10 Mo.');
  });

  it('creates local receipt with sanitized filename', () => {
    const receipt = createLocalReceipt({ file: { name: 'my file.jpg', type: 'image/jpeg', size: 5000 } as File, expenseId: 'exp1', missionId: 'mis1' });

    expect(receipt.expenseId).toBe('exp1');
    expect(receipt.missionId).toBe('mis1');
    expect(receipt.fileName).toBe('my-file.jpg');
    expect(receipt.fileType).toBe('image/jpeg');
    expect(receipt.ocrStatus).toBe('NOT_PROCESSED');
    expect(receipt.id).toBeDefined();
  });

  it('removes receipt from state and linked mission expenses', () => {
    const state = {
      expenseReceipts: [{ id: 'rcpt1', expenseId: 'exp1', missionId: 'mis1', receiptIds: [] }] as unknown as ExpenseReceipt[],
      missions: [
        {
          id: 'mis1',
          days: [
            {
              id: 'day1',
              expenses: [
                { id: 'exp1', receiptIds: ['rcpt1'] },
              ],
            },
          ],
        },
      ],
    } as unknown as any;

    const result = removeReceiptFromState(state, 'rcpt1');

    expect(result.expenseReceipts).toHaveLength(0);
    expect(result.missions[0].days[0].expenses[0].receiptIds).toHaveLength(0);
  });

  it('builds correct download url', () => {
    expect(expenseReceiptDownloadUrl('rcpt-123')).toBe('/api/expense-receipts/rcpt-123/download');
  });
});
