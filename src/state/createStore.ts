/**
 * Minimalny magazyn stanu z subskrypcją (pub/sub).
 * Tiny observable store.
 */

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

export function createStore<T extends object>(initial: T, onChange?: (state: T) => void): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T, prev: T) => void>();

  return {
    get: () => state,
    set(patch) {
      const prev = state;
      state = { ...state, ...patch };
      onChange?.(state);
      listeners.forEach((l) => l(state, prev));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
