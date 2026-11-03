import { workspaceReturnPath } from "@/lib/workspace-return";
import Image from "next/image";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  return (
    <AuthShell title={params.switch === "1" ? "Switch account" : "Sign in"} description="Use your invited account to open your Pearl Connexions workspace."
      brand={<Image src="/pearl-login-logo.jpg" alt="Pearl Connexions — Where every connexion counts" width={1080} height={678} preload className="mx-auto h-auto w-full max-w-[280px]" />}>
      {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <LoginForm next={workspaceReturnPath(params.next)} />
    </AuthShell>
  );
}
