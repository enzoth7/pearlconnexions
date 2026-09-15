import { Clock3 } from "lucide-react";
import { signOut } from "@/app/actions";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

export default function AccessPendingPage() {
  return (
    <AuthShell title="Access pending" description="Your account is signed in, but it does not have an active QA home assignment. Ask Joel to activate your access.">
      <div className="mb-6 flex items-center gap-3 rounded-lg border bg-muted/60 p-4 text-sm">
        <Clock3 className="size-5 text-amber-700" aria-hidden="true" />
        No QA information is available to this account.
      </div>
      <form action={signOut}><Button type="submit" variant="outline" className="h-11 w-full">Sign out</Button></form>
    </AuthShell>
  );
}
