import { UserRoundCog, Users } from "lucide-react";
import { updateMember } from "@/app/actions";
import { PageHeader } from "@/components/app-shell";
import { InviteMemberForm } from "@/components/user-management";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requireDirector } from "@/lib/auth";
import type { Home } from "@/lib/types";

type MemberRow = {
  id: string;
  display_name: string;
  email: string | null;
  active: boolean;
  qa_member_homes: Array<{ home_id: string }>;
};

export default async function UsersPage() {
  const { supabase } = await requireDirector();
  const [homesResult, membersResult] = await Promise.all([
    supabase.from("qa_homes").select("*").order("name"),
    supabase.from("qa_members").select("id,display_name,email,active,qa_member_homes(home_id)").order("display_name"),
  ]);
  if (homesResult.error || membersResult.error) throw new Error(homesResult.error?.message || membersResult.error?.message);
  const homes = homesResult.data as Home[];
  const members = membersResult.data as MemberRow[];
  return <div className="space-y-6">
    <PageHeader eyebrow="Director console" title="Users and assignments" description="Invite House Leads, activate or pause QA access, and assign one or more homes. This does not grant access to the Leadership Dashboard." />
    <Card><CardHeader><CardTitle>Invite a House Lead</CardTitle><CardDescription>Supabase sends a secure invitation. A server-only secret key must be configured in Vercel.</CardDescription></CardHeader><CardContent><InviteMemberForm homes={homes.filter((home) => home.active)} /></CardContent></Card>
    <Card><CardHeader><CardTitle>House Lead accounts</CardTitle><CardDescription>{members.length} account{members.length === 1 ? "" : "s"} configured</CardDescription></CardHeader><CardContent className="space-y-4">{members.length ? members.map((member) => {
      const assigned = new Set(member.qa_member_homes.map((item) => item.home_id));
      return <form action={updateMember} key={member.id} className="rounded-xl border p-4"><input type="hidden" name="member_id" value={member.id} /><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-800"><UserRoundCog className="size-5" /></span><div><p className="font-bold">{member.display_name}</p><p className="text-sm text-muted-foreground">{member.email || "Email unavailable"}</p></div></div><Badge variant="outline" className={member.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-slate-100 text-slate-700"}>{member.active ? "Active" : "Inactive"}</Badge></div><div className="grid gap-4 lg:grid-cols-[1fr_180px]"><div className="space-y-2"><Label htmlFor={`name-${member.id}`}>Display name</Label><Input id={`name-${member.id}`} name="display_name" defaultValue={member.display_name} required /></div><div className="space-y-2"><Label>QA access</Label><Select name="active" defaultValue={String(member.active)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent></Select></div></div><fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold">Assigned homes</legend><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{homes.map((home) => <Label key={home.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3"><Checkbox name="home_ids" value={home.id} defaultChecked={assigned.has(home.id)} />{home.name}</Label>)}</div></fieldset><Button type="submit" variant="outline" className="mt-4 h-11">Save access</Button></form>;
    }) : <div className="py-10 text-center"><Users className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="font-semibold">No House Leads invited yet</p></div>}</CardContent></Card>
  </div>;
}
