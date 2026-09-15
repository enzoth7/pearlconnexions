import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  return (
    <AuthShell title="Sign in" description="Use your invited account to access the monthly QA portal.">
      {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <LoginForm />
    </AuthShell>
  );
}
