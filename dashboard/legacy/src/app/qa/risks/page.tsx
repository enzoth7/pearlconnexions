import { QaCaseRegister } from "@/components/qa-case-register";
import { loadCases } from "@/lib/qa-cases-client";
export default async function Page({ searchParams = Promise.resolve({}) }: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const params = await searchParams;
  return <QaCaseRegister key="risks" kind="risks" initialRecordId={typeof params.record === "string" ? params.record : ""} {...await loadCases("risks")} />;
}
