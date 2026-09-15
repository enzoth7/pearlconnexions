import { Building2 } from "lucide-react";
import { updateHome } from "@/app/actions";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requireDirector } from "@/lib/auth";
import type { Home } from "@/lib/types";

export default async function HomesPage() {
  const { supabase } = await requireDirector();
  const { data, error } = await supabase.from("qa_homes").select("*").order("code");
  if (error) throw new Error(error.message);
  const homes = data as Home[];
  return <div className="space-y-6">
    <PageHeader eyebrow="Director console" title="Homes" description="Maintain the home name, provision, bed capacity and whether it receives future monthly reports." />
    <div className="grid gap-4 xl:grid-cols-2">{homes.map((home) => <Card key={home.id}>
      <CardHeader><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-800"><Building2 className="size-5" /></span><div><CardTitle>{home.name}</CardTitle><CardDescription>{home.code}</CardDescription></div></div><Badge variant="outline" className={home.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : ""}>{home.active ? "Active" : "Inactive"}</Badge></div></CardHeader>
      <CardContent><form action={updateHome} className="space-y-4"><input type="hidden" name="home_id" value={home.id} /><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`name-${home.id}`}>Home name</Label><Input id={`name-${home.id}`} name="name" defaultValue={home.name} required /></div><div className="space-y-2"><Label htmlFor={`beds-${home.id}`}>Total beds</Label><Input id={`beds-${home.id}`} name="total_beds" type="number" min="0" step="any" defaultValue={home.total_beds ?? ""} /></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Provision</Label><Select name="provision" defaultValue={home.provision}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{["Children's Home", "Supported Living", "Supported Accommodation"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Status</Label><Select name="active" defaultValue={String(home.active)}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent></Select></div></div><Button type="submit" variant="outline" className="h-11">Save home</Button></form></CardContent>
    </Card>)}</div>
  </div>;
}
