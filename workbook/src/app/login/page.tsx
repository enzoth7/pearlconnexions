import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8fafc] px-4 py-10">
      <section className="card w-full max-w-md p-7 sm:p-9 shadow-lg border border-slate-200">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center">
            <Image
              src="/LogoTransp.png"
              alt="Pearl Connexions"
              width={240}
              height={140}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
          <span className="inline-block rounded-full bg-[#E0F7FA] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#007A91] border border-[#0097B2]/30">
            Leadership Workspace
          </span>
          <p className="mt-2 text-xs font-medium italic text-slate-500">
            &ldquo;Where Every Connexion Counts&rdquo;
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review leadership actions, deadlines and monthly progress.
          </p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          Private access. Accounts are invitation only.
        </p>
      </section>
    </main>
  );
}

