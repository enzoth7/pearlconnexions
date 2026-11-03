"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveQaAccount } from "@/app/actions";
import { InviteMemberForm } from "@/components/user-management";
import type { ConfigPerson } from "@/lib/config-directory";
import type { Home } from "@/lib/types";
import { createManager, updateManagerCredentials } from "@/workbook/actions";
import type { ManagerWithProfile } from "@/workbook/lib/data";

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition-colors hover:border-slate-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-800";
const buttonClass = "min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60";
const saveResponseError = "The server could not confirm this change. Your entries are still here. Refresh the page and check the user before trying again.";

function AccountHeading({ name, description, status }: { name: string; description: string; status: string }) {
  return <header className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">{name}</h2>
      <div className="mt-1 text-sm text-slate-600">{description}</div>
    </div>
    <div className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">{status}</div>
  </header>;
}

function ManagerAccount({ person, managers, currentUserId, teamHierarchyReady }: {
  person: ConfigPerson;
  managers: ManagerWithProfile[];
  currentUserId: string;
  teamHierarchyReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const manager = person.manager!;
  const isDirector = manager.profile?.role === "director";
  const isSelf = manager.profile_id === currentUserId;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm_password")) {
      setFeedback("Passwords do not match.");
      return;
    }
    data.set("manager_id", manager.id);
    data.delete("confirm_password");
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await updateManagerCredentials(data);
        setFeedback(result.ok ? "User saved." : result.message || "Could not save this user.");
        if (result.ok) router.refresh();
      } catch {
        setFeedback(saveResponseError);
      }
    });
  }

  return <div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-5 shadow-sm sm:p-7">
    <AccountHeading name={manager.name} description="Login details and reporting line." status={manager.profile_id ? "Login active" : "No login yet"} />
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="account-name" className={labelClass}>Full name</label>
        <input id="account-name" name="name" className={fieldClass} defaultValue={manager.name} required minLength={2} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="account-email" className={labelClass}>Login email</label>
          <input id="account-email" name="email" type="email" autoComplete="email" className={fieldClass} defaultValue={manager.email || ""} />
        </div>
        <div>
          <label htmlFor="account-role-title" className={labelClass}>Role / workbook</label>
          <input id="account-role-title" name="role_title" className={fieldClass} defaultValue={manager.role_title || ""} />
        </div>
      </div>
      {teamHierarchyReady && !isDirector && <div>
        <label htmlFor="account-reports-to" className={labelClass}>Reports to</label>
        <select id="account-reports-to" name="parent_manager_id" className={fieldClass} defaultValue={manager.parent_manager_id || ""}>
          <option value="">No manager</option>
          {managers.filter(item => item.id !== manager.id && item.profile?.role !== "director").map(item =>
            <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>}
      <div className="border-t border-slate-200 pt-5">
        <div className="mb-4 text-sm font-semibold text-slate-800">{manager.profile_id ? "Change password" : "Activate login"}</div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="account-password" className={labelClass}>New password</label>
            <input id="account-password" name="password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="account-confirm" className={labelClass}>Confirm password</label>
            <input id="account-confirm" name="confirm_password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} />
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500">{manager.profile_id ? "Leave both fields blank to keep the current password." : "Enter an email and password to activate this login."}</div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Saving…" : "Save user"}</button>
        {feedback && <div role="status" className="text-sm text-slate-700">{feedback}</div>}
      </div>
      {isSelf && <div className="text-xs text-slate-500">Your director role stays active.</div>}
    </form>
  </div>;
}

function HouseLeadAccount({ person }: { person: ConfigPerson }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const user = person.user!;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm_password")) {
      setFeedback("Passwords do not match.");
      return;
    }
    data.set("member_id", user.qaMemberId!);
    data.delete("confirm_password");
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await saveQaAccount(data);
        setFeedback(result.ok ? "User saved." : result.message || "Could not save this user.");
        if (result.ok) router.refresh();
      } catch {
        setFeedback(saveResponseError);
      }
    });
  }

  return <div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-5 shadow-sm sm:p-7">
    <AccountHeading name={person.name} description="House Lead login details. Home access is set in Permissions." status={user.qaMemberActive ? "Login configured" : "QA inactive"} />
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="qa-account-name" className={labelClass}>Full name</label>
        <input id="qa-account-name" name="display_name" className={fieldClass} defaultValue={person.name} required minLength={2} />
      </div>
      <div>
        <label htmlFor="qa-account-email" className={labelClass}>Login email</label>
        <input id="qa-account-email" name="email" type="email" autoComplete="email" className={fieldClass} defaultValue={person.email} required />
      </div>
      <div className="grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
        <div>
          <label htmlFor="qa-account-password" className={labelClass}>New password</label>
          <input id="qa-account-password" name="password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="qa-account-confirm" className={labelClass}>Confirm password</label>
          <input id="qa-account-confirm" name="confirm_password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} />
        </div>
      </div>
      <div className="text-xs text-slate-500">Leave password fields blank to keep the current password.</div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Saving…" : "Save user"}</button>
        {feedback && <div role="status" className="text-sm text-slate-700">{feedback}</div>}
      </div>
    </form>
  </div>;
}

function NewManagerAccount({ managers }: { managers: ManagerWithProfile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm_password")) {
      setFeedback("Passwords do not match.");
      return;
    }
    data.delete("confirm_password");
    data.set("system_role", "manager");
    setFeedback("");
    startTransition(async () => {
      try {
        const result = await createManager(data);
        if (result.ok && result.managerId) {
          router.push(`/config/users?user=${encodeURIComponent(`manager:${result.managerId}`)}`);
          router.refresh();
        } else setFeedback(result.message || "Could not add this user.");
      } catch {
        setFeedback(saveResponseError);
      }
    });
  }

  return <form onSubmit={submit} className="space-y-5">
    <div>
      <label htmlFor="new-account-name" className={labelClass}>Full name</label>
      <input id="new-account-name" name="name" className={fieldClass} required minLength={2} />
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor="new-account-email" className={labelClass}>Login email</label>
        <input id="new-account-email" name="email" type="email" autoComplete="email" className={fieldClass} required />
      </div>
      <div>
        <label htmlFor="new-account-role" className={labelClass}>Role / workbook</label>
        <input id="new-account-role" name="role_title" className={fieldClass} />
      </div>
    </div>
    <div>
      <label htmlFor="new-account-parent" className={labelClass}>Reports to</label>
      <select id="new-account-parent" name="parent_manager_id" className={fieldClass} defaultValue="">
        <option value="">No manager</option>
        {managers.filter(manager => manager.profile?.role !== "director").map(manager =>
          <option key={manager.id} value={manager.id}>{manager.name}</option>)}
      </select>
    </div>
    <div className="grid gap-5 border-t border-slate-200 pt-5 sm:grid-cols-2">
      <div>
        <label htmlFor="new-account-password" className={labelClass}>Password</label>
        <input id="new-account-password" name="password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} required />
      </div>
      <div>
        <label htmlFor="new-account-confirm" className={labelClass}>Confirm password</label>
        <input id="new-account-confirm" name="confirm_password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} required />
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Adding…" : "Add user"}</button>
      {feedback && <div role="status" className="text-sm text-red-700">{feedback}</div>}
    </div>
  </form>;
}

function NewUserAccount({ managers, homes }: { managers: ManagerWithProfile[]; homes: Home[] }) {
  const [kind, setKind] = useState<"manager" | "house-lead">("manager");
  return <div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-5 shadow-sm sm:p-7">
    <AccountHeading name="Add user" description="Choose the type of account to create." status="New" />
    <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Account type">
      {([ ["manager", "Manager"], ["house-lead", "House Lead"] ] as const).map(([value, label]) =>
        <button key={value} type="button" onClick={() => setKind(value)} aria-pressed={kind === value}
          className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${kind === value ? "border-teal-700 bg-teal-800 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-400"}`}>
          {label}
        </button>)}
    </div>
    <div className="mt-6">{kind === "manager" ? <NewManagerAccount managers={managers} /> : <InviteMemberForm homes={homes.filter(home => home.active)} />}</div>
  </div>;
}

export function ConfigAccountEditor({ person, managers, homes, currentUserId, teamHierarchyReady }: {
  person: ConfigPerson | null;
  managers: ManagerWithProfile[];
  homes: Home[];
  currentUserId: string;
  teamHierarchyReady: boolean;
}) {
  if (!person) return <NewUserAccount managers={managers} homes={homes} />;
  if (person.manager) return <ManagerAccount key={person.key} person={person} managers={managers} currentUserId={currentUserId} teamHierarchyReady={teamHierarchyReady} />;
  if (person.user?.qaMemberId) return <HouseLeadAccount key={person.key} person={person} />;
  return <div className="rounded-2xl border border-slate-200 bg-[#faf9f6] p-7 shadow-sm">
    <AccountHeading name={person.name} description={person.email || "No email on record"} status="Pending" />
    <div className="mt-6 text-sm text-slate-600">This account is not linked to a manager or House Lead record yet.</div>
  </div>;
}
