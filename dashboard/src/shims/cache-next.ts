let queued = false;
export function revalidatePath(_path: string) {
  if (queued) return;
  queued = true;
  queueMicrotask(() => { queued = false; window.dispatchEvent(new Event("pearl:refresh")); });
}
