const DB_NAME = 'FontStorage';
const STORE_NAME = 'fonts';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const initDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };
    });
    return dbPromise;
};

export const saveFont = async (name: string, buffer: ArrayBuffer): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ name, buffer });

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const getAllFonts = async (): Promise<{ name: string; buffer: ArrayBuffer }[]> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

export const clearAllFonts = async (): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
