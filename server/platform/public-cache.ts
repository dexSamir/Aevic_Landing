// Warm-instance cache only. Other instances converge within the 30-second TTL.
const stores = new WeakMap<object, Map<string, { expires: number; value: Promise<unknown> }>>();
export function invalidatePublicReads(pool: object, family?: string) {
 const store = stores.get(pool);
 if (!family) { stores.delete(pool); return; }
 for (const key of store?.keys() ?? []) if (key.startsWith(family)) store!.delete(key);
}
export async function publicRead<T>(pool: object, key: string, read: () => Promise<T>): Promise<T> {
 let store = stores.get(pool);
 if (!store) { store = new Map(); stores.set(pool, store); }
 const cached = store.get(key);
 if (cached && cached.expires > Date.now()) return cached.value as Promise<T>;
 for (const [id, entry] of store) if (entry.expires <= Date.now()) store.delete(id);
 // Do not evict in-flight work and thereby create another stampede.
 if (store.size >= 100) return read();
 const entry = { expires: Infinity, value: Promise.resolve().then(read) };
 store.set(key, entry);
 try { const value = await entry.value; entry.expires = Date.now() + 30_000; return value; }
 catch (error) { if (store.get(key) === entry) store.delete(key); throw error; }
}
