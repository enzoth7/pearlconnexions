"use client";

import { useActionState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { repairPeriod, type ActionState } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RepairPeriodForm({ defaultMonth }: { defaultMonth: string }) {
  const [state, action, pending] = useActionState(repairPeriod, {} as ActionState);
  return <form action={action} className="space-y-4">
    {state.message ? <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}
    <div className="space-y-2"><Label htmlFor="month">Reporting month</Label><Input id="month" name="month" type="month" defaultValue={defaultMonth} required className="h-11 max-w-xs" /></div>
    <Button type="submit" variant="outline" className="h-11" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Wrench />}{pending ? "Checking…" : "Create or repair period"}</Button>
  </form>;
}
