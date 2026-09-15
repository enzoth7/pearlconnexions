import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top_left,#dbeafe_0,transparent_38%),var(--background)] px-4 py-10">
      <Card className="w-full max-w-md shadow-lg shadow-blue-950/5">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck aria-hidden="true" /></span>
            <div><p className="font-bold">Pearl Connexions</p><p className="text-xs text-muted-foreground">Private QA portal</p></div>
          </div>
          <div><CardTitle className="text-2xl">{title}</CardTitle><CardDescription className="mt-2 leading-6">{description}</CardDescription></div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
