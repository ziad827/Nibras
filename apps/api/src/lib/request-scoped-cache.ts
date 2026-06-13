import { AsyncLocalStorage } from 'node:async_hooks';

type RequestCacheStore = Map<string, unknown>;

export const requestCacheStorage = new AsyncLocalStorage<RequestCacheStore>();

export function getRequestCache(): RequestCacheStore {
  const store = requestCacheStorage.getStore();
  if (!store) {
    return new Map();
  }
  return store;
}

export function getRequestCached<T>(key: string): T | undefined {
  return getRequestCache().get(key) as T | undefined;
}

export function setRequestCached<T>(key: string, value: T): void {
  const store = requestCacheStorage.getStore();
  if (store) {
    store.set(key, value);
  }
}

export async function withRequestCache<T>(fn: () => Promise<T>): Promise<T> {
  if (requestCacheStorage.getStore()) {
    return fn();
  }
  return requestCacheStorage.run(new Map(), fn);
}

export function programBundleCacheKey(studentProgramId: string): string {
  return `programBundle:${studentProgramId}`;
}
