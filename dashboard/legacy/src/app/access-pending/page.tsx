import { Clock3 } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

export default function AccessPendingPage() {
  return (
    <AuthShell title="Access pending" description="Your account is signed in, but your workspace access has not been assigned. Contact your director to request access.">
      <div className="mb-6 flex items-center gap-3 rounded-lg border bg-muted/60 p-4 text-sm">
        <Clock3 className="size-5 text-amber-700" aria-hidden="true" />
        Your workspace areas will appear once access is assigned.
      </div>
      <form action="/auth/sign-out" method="post"><Button type="submit" variant="outline" className="h-11 w-full">Sign out</Button></form>
    </AuthShell>
  );
}
