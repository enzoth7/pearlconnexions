import { ResetRequestForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  return <AuthShell title="Reset password" description="We will send a secure link to your registered email address."><ResetRequestForm /></AuthShell>;
}
