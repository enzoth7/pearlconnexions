"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-950"><AlertTriangle className="mb-3 size-6" /><h2 className="text-lg font-bold">The dashboard could not load</h2><p className="mt-2 text-sm">Try again. If the problem continues, check the Supabase connection.</p><Button onClick={reset} className="mt-4">Try again</Button></div>;
}
