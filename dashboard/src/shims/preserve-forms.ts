/** React resets action forms after an action resolves, including failed saves. */
export function preserveSubmittedForms(root: Document) {
  const submitted = new WeakSet<HTMLFormElement>();
  const onSubmit = (event: Event) => {
    if (event.target instanceof HTMLFormElement) submitted.add(event.target);
  };
  const onReset = (event: Event) => {
    if (!(event.target instanceof HTMLFormElement) || !submitted.has(event.target)) return;
    submitted.delete(event.target);
    event.preventDefault();
  };
  root.addEventListener("submit", onSubmit, true);
  root.addEventListener("reset", onReset, true);
  return () => {
    root.removeEventListener("submit", onSubmit, true);
    root.removeEventListener("reset", onReset, true);
  };
}
