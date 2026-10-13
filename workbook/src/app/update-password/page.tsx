import Image from "next/image";
import { UpdatePasswordForm } from "@/components/update-password-form";

export default function UpdatePasswordPage() {
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
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use at least 8 characters and avoid reusing a password from another service.
          </p>
        </div>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
