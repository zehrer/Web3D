import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { afterEach, beforeEach } from "vitest";

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
