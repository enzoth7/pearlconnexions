import Image from "next/image";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f8fafc] px-4 py-10">
      <section className="card w-full max-w-md border border-slate-200 p-7 shadow-lg sm:p-9">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/LogoTransp.png"
            alt="Pearl Connexions"
            width={240}
            height={140}
            className="h-16 w-auto object-contain"
            priority
          />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your login email and we will send you a secure recovery link.
          </p>
        </div>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
