const pending = new Map<string, Promise<unknown>>();
export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let value = pending.get(key) as Promise<T> | undefined;
  if (!value) {
    value = load().catch(error => { pending.delete(key); throw error; });
    pending.set(key, value);
  }
  return value;
}
export function clearDataCache() { pending.clear(); }
