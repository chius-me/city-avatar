import type { ModelId, SubjectType } from '../data/presets';

export interface SavedAvatarItem {
  id: string;
  sourceThumbUrl: string;
  imageDataUrl: string;
  bgId: string;
  styleId: string;
  expressionId: string;
  subjectType: SubjectType;
  modelId: ModelId;
  modelName: string;
  customPrompt: string;
  prompt: string;
  seed: number;
  durationMs: number;
  createdAt: number;
}

const DB_NAME = 'city-avatar-studio-db';
const STORE_NAME = 'stylized_avatars';
const DB_VERSION = 2;
const MAX_ITEMS = 24;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains('avatars')) {
        db.deleteObjectStore('avatars');
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadGalleryItems(): Promise<SavedAvatarItem[]> {
  try {
    const db = await openDb();
    return await new Promise<SavedAvatarItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as SavedAvatarItem[]).sort(
          (a, b) => b.createdAt - a.createdAt
        );
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveGalleryItem(item: SavedAvatarItem): Promise<SavedAvatarItem[]> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    const all = await loadGalleryItems();
    if (all.length > MAX_ITEMS) {
      const toDelete = all.slice(MAX_ITEMS);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const old of toDelete) {
        store.delete(old.id);
      }
    }
    return all.slice(0, MAX_ITEMS);
  } catch {
    return [item];
  }
}

export async function deleteGalleryItem(id: string): Promise<SavedAvatarItem[]> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return await loadGalleryItems();
  } catch {
    return [];
  }
}

export async function clearGalleryItems(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
