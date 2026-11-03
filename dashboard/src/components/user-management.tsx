"use client";

import { useActionState } from "react";
import { Loader2, MailPlus } from "lucide-react";
import { inviteMember, type ActionState } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Home } from "@/lib/types";

export function InviteMemberForm({ homes }: { homes: Home[] }) {
  const [state, action, pending] = useActionState(inviteMember, {} as ActionState);
  return <form action={action} className="space-y-4">
    {state.message ? <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="display_name">Full name</Label><Input id="display_name" name="display_name" required /></div>
      <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
    </div>
    <fieldset><legend className="mb-2 text-sm font-semibold">Assigned homes</legend><div className="grid gap-2 sm:grid-cols-2">{homes.map((home) => <Label key={home.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3"><Checkbox name="home_ids" value={home.id} />{home.name}</Label>)}</div></fieldset>
    <Button type="submit" className="h-11" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <MailPlus />}{pending ? "Sending invitation…" : "Invite House Lead"}</Button>
  </form>;
}
