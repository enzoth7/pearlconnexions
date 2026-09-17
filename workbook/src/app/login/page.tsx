import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8fafc] px-4 py-10">
      <section className="card w-full max-w-md p-7 sm:p-9 shadow-lg border border-slate-200">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center">
            <Image
              src="/LogoTransp.png"
              alt="Pearl Connexions"
              width={240}
              height={140}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Sign in to your account
          </h1>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-slate-500">
          Private access. Accounts are invitation only.
        </p>
      </section>
    </main>
  );
}

