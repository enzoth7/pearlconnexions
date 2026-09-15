import { UpdatePasswordForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";

export default function UpdatePasswordPage() {
  return <AuthShell title="Choose a password" description="Use at least eight characters. Your QA access remains limited to assigned homes."><UpdatePasswordForm /></AuthShell>;
}
