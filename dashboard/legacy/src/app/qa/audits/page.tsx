import { GovernanceRegister } from "@/components/governance-register";
import { loadRegister } from "@/lib/governance-server";
export default async function Page(){const data=await loadRegister("audits");return <GovernanceRegister kind="audits" homes={data.homes} records={data.records} canManageMaintenance={Boolean(data.context.managesMaintenance)} />;}
