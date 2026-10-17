// Persists this browser's device identity in IndexedDB. CryptoKeys are stored as non-extractable
// objects, so the private key can sign but is never readable by page script.
const DB_NAME = "atla-device-auth";
const STORE = "identities";

export type StoredIdentity = {
  /** Keyed per user: the server enrolls a device to exactly one account. */
  userId: string;
  deviceId: string;
  keys: CryptoKeyPair;
  certificatePem: string;
  /** CA chain received at enrollment; response signing certificates must chain to it. */
  caPem: string;
  enrolledAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser context"));
      return;
    }
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: "userId" });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("could not open IndexedDB"));
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = op(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadIdentity(userId: string): Promise<StoredIdentity | undefined> {
  return run("readonly", (store) => store.get(userId) as IDBRequest<StoredIdentity | undefined>);
}

export async function saveIdentity(identity: StoredIdentity): Promise<void> {
  await run("readwrite", (store) => store.put(identity));
}

export async function deleteIdentity(userId: string): Promise<void> {
  await run("readwrite", (store) => store.delete(userId));
}
