import { QaCaseRegister } from "@/components/qa-case-register";
import { loadCases } from "@/lib/qa-cases-client";
export default async function Page() { return <QaCaseRegister key="incidents" kind="incidents" {...await loadCases("incidents")} />; }
