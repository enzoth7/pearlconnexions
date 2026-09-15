import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="grid min-h-dvh place-items-center px-4 py-10"><section className="card w-full max-w-md p-7 sm:p-9"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-lg font-black text-white">P</div><p className="mt-8 text-sm font-bold text-blue-800">Pearl Connexions</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Leadership workspace</h1><p className="mt-3 leading-6 text-slate-600">Sign in to review actions, deadlines and monthly progress.</p><LoginForm/><p className="mt-6 text-center text-xs text-slate-500">Private access. Accounts are invitation only.</p></section></main>;
}
