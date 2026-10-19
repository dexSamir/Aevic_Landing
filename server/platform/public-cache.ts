// Anonymous projections only; each warm runtime converges within its bounded TTL.
type Entry = { expires: number; value: Promise<unknown>; tags: Set<string>; pending: boolean };
const stores = new WeakMap<object, Map<string, Entry>>();
export function invalidatePublicReads(pool: object, family?: string) {
 const store = stores.get(pool);
 if (!family) { stores.delete(pool); return; }
 for (const key of store?.keys() ?? []) if (key.startsWith(family)) store!.delete(key);
}
export function invalidatePublicTags(pool: object, tags: string[]) {
 const store = stores.get(pool);
 for (const [key, entry] of store ?? []) {
  // A slug's canonical ID is only known after resolution. Never let that pending
  // read repopulate a profile invalidated while its database work was running.
  if (tags.some(tag => entry.tags.has(tag)) || entry.pending && (key.startsWith('profile:') || key.startsWith('wrapped:')) && tags.some(tag => tag.startsWith('team:'))) store!.delete(key);
 }
}
export async function publicRead<T>(pool: object, key: string, read: () => Promise<T>, options: { ttl?: number; tags?: string[]; tagsFor?: (value: T) => string[] } = {}): Promise<T> {
 let store = stores.get(pool);
 if (!store) { store = new Map(); stores.set(pool, store); }
 const cached = store.get(key);
 if (cached && cached.expires > Date.now()) return cached.value as Promise<T>;
 for (const [id, entry] of store) if (entry.expires <= Date.now()) store.delete(id);
 // Do not evict in-flight work and thereby create another stampede.
 if (store.size >= 100) return read();
 const entry: Entry = { expires: Infinity, value: Promise.resolve().then(read), tags: new Set(options.tags), pending: true };
 store.set(key, entry);
 try {
  const value = await entry.value as T;
  for (const tag of options.tagsFor?.(value) ?? []) entry.tags.add(tag);
  entry.pending = false; entry.expires = Date.now() + Math.max(0, Math.min(30_000, options.ttl ?? 30_000));
  return value;
 } catch (error) { if (store.get(key) === entry) store.delete(key); throw error; }
}

/** Reuse a richer projection only if it already exists; never make a lean read load it. */
export function existingPublicRead<T>(pool: object, key: string): Promise<T> | undefined {
 const entry = stores.get(pool)?.get(key);
 return entry && entry.expires > Date.now() ? entry.value as Promise<T> : undefined;
}
