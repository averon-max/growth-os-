import { AsyncLocalStorage } from "node:async_hooks";

/*
 * "Refresh" buttons: code run inside withFreshData() skips saved DataForSEO answers and buys new ones.
 * Kept on globalThis so the fetch cache in instrumentation.ts and the app share one store.
 */
type G = typeof globalThis & { __dfsFresh?: AsyncLocalStorage<boolean> };

export function freshStore(): AsyncLocalStorage<boolean> {
  const g = globalThis as G;
  g.__dfsFresh ??= new AsyncLocalStorage<boolean>();
  return g.__dfsFresh;
}

export function withFreshData<T>(fn: () => Promise<T>): Promise<T> {
  return freshStore().run(true, fn);
}

export function wantsFresh(): boolean {
  return freshStore().getStore() === true;
}
