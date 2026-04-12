import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";

function createLocalStorageMock(): Storage {
  let store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

Object.defineProperty(globalThis, "localStorage", {
  value: createLocalStorageMock(),
  configurable: true,
});

function resetIndexedDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("web3d-designer");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to reset IndexedDB"));
    request.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  localStorage.clear();
  await resetIndexedDb();
});

afterEach(async () => {
  localStorage.clear();
  await resetIndexedDb();
});
