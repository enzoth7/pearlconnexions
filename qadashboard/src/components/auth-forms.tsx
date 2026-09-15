"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound, Loader2, LogIn, Mail } from "lucide-react";
import { login, requestPasswordReset, updatePassword, type ActionState } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

function Message({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <Alert variant={state.ok ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert>;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="space-y-5">
      <Message state={state} />
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(state.errors?.email)} />
        {state.errors?.email ? <p className="text-sm text-destructive">{state.errors.email[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(state.errors?.password)} />
        {state.errors?.password ? <p className="text-sm text-destructive">{state.errors.password[0]}</p> : null}
      </div>
      <Button className="h-11 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="space-y-5">
      <Message state={state} />
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email address</Label>
        <Input id="reset-email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button className="h-11 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Mail />}
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Button asChild variant="link" className="w-full"><Link href="/login">Back to sign in</Link></Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="space-y-5">
      <Message state={state} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Button className="h-11 w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        {pending ? "Updating…" : "Set password"}
      </Button>
      {state.ok ? <Button asChild variant="outline" className="h-11 w-full"><Link href="/">Continue</Link></Button> : null}
    </form>
  );
}
