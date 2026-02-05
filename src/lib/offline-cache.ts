/**
 * Offline cache for poor connectivity: profiles, chats, messages, my profile.
 * Uses IndexedDB so users can browse cached content when offline or on slow networks.
 */

const DB_NAME = 'nueflirt-offline';
const DB_VERSION = 1;
const STORES = {
  profiles: 'profiles',
  profileList: 'profile_list', // list of profile ids for discover (last N fetched)
  chats: 'chats',
  chatList: 'chat_list',
  messages: 'messages', // key: chatId, value: Message[]
  myProfile: 'my_profile',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB only in browser'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.profiles)) {
        db.createObjectStore(STORES.profiles, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.profileList)) {
        db.createObjectStore(STORES.profileList, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.chats)) {
        db.createObjectStore(STORES.chats, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.chatList)) {
        db.createObjectStore(STORES.chatList, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.messages)) {
        db.createObjectStore(STORES.messages, { keyPath: 'chatId' });
      }
      if (!db.objectStoreNames.contains(STORES.myProfile)) {
        db.createObjectStore(STORES.myProfile, { keyPath: 'key' });
      }
    };
  });
  return dbPromise;
}

const MAX_CACHED_PROFILES = 100;
const MAX_CACHED_CHATS = 50;
const MAX_MESSAGES_PER_CHAT = 500;

export async function cacheProfiles(profiles: { id: string; [k: string]: unknown }[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORES.profiles, STORES.profileList], 'readwrite');
  const store = tx.objectStore(STORES.profiles);
  const listStore = tx.objectStore(STORES.profileList);
  for (const p of profiles) {
    store.put(p);
  }
  const ids = profiles.map((p) => p.id);
  listStore.put({ key: 'list', ids, updatedAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedProfiles(): Promise<{ id: string; [k: string]: unknown }[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const listTx = db.transaction(STORES.profileList, 'readonly');
    const listReq = listTx.objectStore(STORES.profileList).get('list');
    listReq.onsuccess = () => {
      const list = listReq.result as { ids: string[] } | undefined;
      if (!list?.ids?.length) {
        resolve(null);
        return;
      }
      const ids = list.ids.slice(0, MAX_CACHED_PROFILES);
      const tx = db.transaction(STORES.profiles, 'readonly');
      const store = tx.objectStore(STORES.profiles);
      const results: { id: string; [k: string]: unknown }[] = [];
      let done = 0;
      ids.forEach((id) => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) results.push(req.result);
          done++;
          if (done === ids.length) {
            resolve(results);
          }
        };
      });
      if (ids.length === 0) resolve([]);
      tx.onerror = () => reject(tx.error);
    };
    listReq.onerror = () => reject(listReq.error);
  });
}

export async function cacheMyProfile(profile: { id: string; [k: string]: unknown } | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.myProfile, 'readwrite');
    tx.objectStore(STORES.myProfile).put({ key: 'me', ...profile, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedMyProfile(): Promise<{ id: string; [k: string]: unknown } | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.myProfile, 'readonly');
    const req = tx.objectStore(STORES.myProfile).get('me');
    req.onsuccess = () => {
      const row = req.result;
      if (row && row.id) {
        const { key, updatedAt, ...profile } = row;
        resolve(profile as { id: string; [k: string]: unknown });
      } else resolve(null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function cacheChats(chats: { id: string; [k: string]: unknown }[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([STORES.chats, STORES.chatList], 'readwrite');
  const store = tx.objectStore(STORES.chats);
  const listStore = tx.objectStore(STORES.chatList);
  for (const c of chats.slice(0, MAX_CACHED_CHATS)) {
    store.put(c);
  }
  listStore.put({ key: 'list', ids: chats.map((c) => c.id), updatedAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedChats(): Promise<{ id: string; [k: string]: unknown }[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const listTx = db.transaction(STORES.chatList, 'readonly');
    const listReq = listTx.objectStore(STORES.chatList).get('list');
    listReq.onsuccess = () => {
      const list = listReq.result as { ids: string[] } | undefined;
      if (!list?.ids?.length) {
        resolve(null);
        return;
      }
      const tx = db.transaction(STORES.chats, 'readonly');
      const store = tx.objectStore(STORES.chats);
      const results: { id: string; [k: string]: unknown }[] = [];
      let done = 0;
      const ids = list.ids.slice(0, MAX_CACHED_CHATS);
      ids.forEach((id) => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) results.push(req.result);
          done++;
          if (done === ids.length) resolve(results);
        };
      });
      if (ids.length === 0) resolve([]);
      tx.onerror = () => reject(tx.error);
    };
    listReq.onerror = () => reject(listReq.error);
  });
}

export async function cacheMessages(chatId: string, messages: { id: string; [k: string]: unknown }[]): Promise<void> {
  const db = await openDB();
  const trimmed = messages.slice(-MAX_MESSAGES_PER_CHAT);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readwrite');
    tx.objectStore(STORES.messages).put({ chatId, messages: trimmed, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedMessages(chatId: string): Promise<{ id: string; [k: string]: unknown }[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readonly');
    const req = tx.objectStore(STORES.messages).get(chatId);
    req.onsuccess = () => {
      const row = req.result as { messages: { id: string; [k: string]: unknown }[] } | undefined;
      resolve(row?.messages ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}
