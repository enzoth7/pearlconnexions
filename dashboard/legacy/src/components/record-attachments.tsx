"use client";

import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "../../../src/shims/supabase";

export type AttachmentEntity = "expense" | "incident" | "invoice" | "payroll";
export type Attachment = { id: string; file_name: string; storage_path: string; size_bytes: number | null; created_at: string };

const MAX_BYTES = 20 * 1024 * 1024;

function size(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-120) || "file";
}

/** Upload, list, open and remove files attached to an expense or incident report. */
export function RecordAttachments({ entity, entityId, canEdit = true, onChange }: {
  entity: AttachmentEntity;
  entityId: string;
  canEdit?: boolean;
  onChange?: (files: Attachment[]) => void;
}) {
  const inputId = useId();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.from("record_attachments")
      .select("id,file_name,storage_path,size_bytes,created_at")
      .eq("entity", entity).eq("entity_id", entityId).order("created_at");
    if (loadError) { setError(loadError.message); return; }
    const next = (data ?? []) as Attachment[];
    setFiles(next);
    onChange?.(next);
    // Lists that show a paperclip per record refresh their counts on this event.
    window.dispatchEvent(new Event("pearl:attachments"));
  }, [entity, entityId, onChange]);

  useEffect(() => { void load(); }, [load]);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true); setError("");
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) { setError(`${file.name} is larger than 20 MB.`); continue; }
      const path = `${entity}/${entityId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const stored = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type || undefined });
      if (stored.error) { setError(stored.error.message); continue; }
      const saved = await supabase.from("record_attachments").insert({ entity, entity_id: entityId, storage_path: path, file_name: file.name.slice(0, 255), content_type: file.type || null, size_bytes: file.size });
      if (saved.error) { await supabase.storage.from("attachments").remove([path]); setError(saved.error.message); }
    }
    setBusy(false);
    await load();
  }

  async function open(file: Attachment) {
    const { data, error: urlError } = await supabase.storage.from("attachments").createSignedUrl(file.storage_path, 300);
    if (urlError || !data) { setError(urlError?.message ?? "Could not open the file."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(file: Attachment) {
    if (!window.confirm(`Remove ${file.file_name}?`)) return;
    setBusy(true);
    const removed = await supabase.from("record_attachments").delete().eq("id", file.id);
    if (!removed.error) await supabase.storage.from("attachments").remove([file.storage_path]);
    setBusy(false);
    if (removed.error) setError(removed.error.message);
    await load();
  }

  return <section aria-label="Attachments" className="rounded-xl border border-slate-200 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#102c39]"><Paperclip size={16} aria-hidden />Attachments{files.length ? ` (${files.length})` : ""}</h3>
      {canEdit && <label htmlFor={inputId} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-teal-800 ${busy ? "pointer-events-none opacity-50" : ""}`}>
        <Upload size={16} aria-hidden />{busy ? "Uploading…" : "Upload files"}
        <input id={inputId} type="file" multiple className="sr-only" disabled={busy} onChange={event => { void upload(event.target.files); event.target.value = ""; }} />
      </label>}
    </div>
    {files.length ? <ul className="mt-3 divide-y divide-slate-200">{files.map(file => <li key={file.id} className="flex items-center justify-between gap-3 py-2 text-sm">
      <button type="button" className="flex min-h-11 min-w-0 items-center gap-2 text-left font-medium text-teal-800 underline" onClick={() => void open(file)}>
        <Download size={15} aria-hidden className="shrink-0" /><small className="truncate">{file.file_name}</small>
      </button>
      <small className="flex shrink-0 items-center gap-2 text-xs text-slate-500">{size(file.size_bytes)}
        {canEdit && <button type="button" aria-label={`Remove ${file.file_name}`} className="inline-flex size-10 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-50" disabled={busy} onClick={() => void remove(file)}><Trash2 size={16} aria-hidden /></button>}
      </small>
    </li>)}</ul> : <div className="mt-2 text-sm text-slate-600">No files attached yet. Invoices, receipts and photos up to 20 MB each.</div>}
    {error && <div role="alert" className="mt-2 text-sm text-rose-800">{error}</div>}
  </section>;
}
