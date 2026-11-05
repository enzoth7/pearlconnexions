import { QaCaseRegister } from "@/components/qa-case-register";
import { loadCases } from "@/lib/qa-cases-client";
export default async function Page({ searchParams = Promise.resolve({}) }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const params = await searchParams;
  return <QaCaseRegister key="incidents" kind="incidents" initialRecordId={typeof params.record === "string" ? params.record : ""} initialSafeguardingFilter={typeof params.safeguarding === "string" ? params.safeguarding : ""} {...await loadCases("incidents")} />;
}
