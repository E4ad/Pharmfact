export type UndoAction = {
  id: string;
  description: string;
  undo: () => void;
  redo?: () => void;
  createdAt: string;
};

function createUndoId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }
  return `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class UndoManager {
  private stack: UndoAction[] = [];

  constructor(private readonly maxSize = 10) {}

  add(action: Omit<UndoAction, 'id' | 'createdAt'>): string {
    const id = createUndoId();
    this.stack = [{ ...action, id, createdAt: new Date().toISOString() }, ...this.stack].slice(0, this.maxSize);
    return id;
  }

  undo(id: string): boolean {
    const action = this.stack.find((item) => item.id === id);
    if (!action) return false;
    action.undo();
    this.remove(id);
    return true;
  }

  remove(id: string): void {
    this.stack = this.stack.filter((item) => item.id !== id);
  }

  clear(): void {
    this.stack = [];
  }

  size(): number {
    return this.stack.length;
  }
}

export const undoManager = new UndoManager();
