import { describe, expect, it } from 'vitest';
import { mapError } from './errorMapper';

describe('errorMapper', () => {
  it('hides cancellation errors', () => {
    const error = mapError(new Error('save canceled'));

    expect(error.code).toBe('PDF_SAVE_CANCELED');
    expect(error.shouldDisplay).toBe(false);
  });

  it('maps pdf errors to a user-facing message', () => {
    const error = mapError(new Error('Invalid PDF header'));

    expect(error.code).toBe('PDF_GENERATION_FAILED');
    expect(error.shouldDisplay).toBe(true);
    expect(error.message).toContain('PDF');
  });
});
