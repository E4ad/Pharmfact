import { describe, expect, it } from 'vitest';
import { UndoManager } from './undoManager';

describe('UndoManager', () => {
  it('runs and removes an undo action', () => {
    const manager = new UndoManager();
    let value = 'updated';

    const id = manager.add({
      description: 'restore value',
      undo: () => {
        value = 'restored';
      },
    });

    expect(manager.size()).toBe(1);
    expect(manager.undo(id)).toBe(true);
    expect(value).toBe('restored');
    expect(manager.size()).toBe(0);
  });

  it('caps the stack size', () => {
    const manager = new UndoManager(2);

    manager.add({ description: 'one', undo: () => {} });
    manager.add({ description: 'two', undo: () => {} });
    manager.add({ description: 'three', undo: () => {} });

    expect(manager.size()).toBe(2);
  });
});
