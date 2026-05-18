import { deserializeProject, serializeProject } from "./serialization";
import { createInitialMaterials, summarizeProject } from "./project";
import type { MaterialLibraryDocument, ProjectDocument, ProjectSummary } from "../types/model";

const DB_NAME = "web3d-designer";
const STORE_NAME = "projects";
const GLOBAL_MATERIAL_LIBRARY_STORE_NAME = "globalMaterialLibrary";
const GLOBAL_MATERIAL_LIBRARY_KEY = "default";
const LAST_PROJECT_KEY = "web3d:last-project-id";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(GLOBAL_MATERIAL_LIBRARY_STORE_NAME)) {
        database.createObjectStore(GLOBAL_MATERIAL_LIBRARY_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));

    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
  });
}

export async function saveProjectDocument(project: ProjectDocument): Promise<void> {
  const serialized = serializeProject(project);
  await withStore(STORE_NAME, "readwrite", (store) =>
    store.put({
      id: project.id,
      name: project.name,
      updatedAt: project.updatedAt,
      createdAt: project.createdAt,
      serialized,
    }),
  );

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LAST_PROJECT_KEY, project.id);
  }
}

export async function deleteProjectDocument(projectId: string): Promise<void> {
  await withStore(STORE_NAME, "readwrite", (store) => store.delete(projectId));

  if (typeof localStorage !== "undefined" && localStorage.getItem(LAST_PROJECT_KEY) === projectId) {
    localStorage.removeItem(LAST_PROJECT_KEY);
  }
}

export async function loadProjectDocument(projectId: string): Promise<ProjectDocument | null> {
  const record = await withStore<{ serialized: string } | undefined>(STORE_NAME, "readonly", (store) => store.get(projectId));
  return record ? deserializeProject(record.serialized) : null;
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  const rows = await withStore<Array<{ serialized: string }>>(STORE_NAME, "readonly", (store) => store.getAll());

  return rows
    .map((row) => summarizeProject(deserializeProject(row.serialized)))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function createDefaultGlobalMaterialLibrary(): MaterialLibraryDocument {
  const { materialGroups, materials } = createInitialMaterials();
  return { materialGroups, materials };
}

export async function saveGlobalMaterialLibrary(library: MaterialLibraryDocument): Promise<void> {
  await withStore(GLOBAL_MATERIAL_LIBRARY_STORE_NAME, "readwrite", (store) =>
    store.put({
      id: GLOBAL_MATERIAL_LIBRARY_KEY,
      serialized: JSON.stringify(library),
    }),
  );
}

export async function loadGlobalMaterialLibrary(): Promise<MaterialLibraryDocument> {
  const record = await withStore<{ serialized: string } | undefined>(
    GLOBAL_MATERIAL_LIBRARY_STORE_NAME,
    "readonly",
    (store) => store.get(GLOBAL_MATERIAL_LIBRARY_KEY),
  );

  if (record) {
    return JSON.parse(record.serialized) as MaterialLibraryDocument;
  }

  const library = createDefaultGlobalMaterialLibrary();
  await saveGlobalMaterialLibrary(library);
  return library;
}

export async function getLastProjectId(): Promise<string | null> {
  if (typeof localStorage === "undefined") {
    return null;
  }

  return localStorage.getItem(LAST_PROJECT_KEY);
}

export async function loadMostRecentProject(): Promise<ProjectDocument | null> {
  const lastProjectId = await getLastProjectId();

  if (lastProjectId) {
    const explicit = await loadProjectDocument(lastProjectId);
    if (explicit) {
      return explicit;
    }
  }

  const summaries = await listProjectSummaries();
  if (!summaries.length) {
    return null;
  }

  return loadProjectDocument(summaries[0].id);
}
