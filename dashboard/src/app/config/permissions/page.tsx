import { ConfigPeopleFrame } from "@/components/config-people-frame";
import { ConfigPermissionDetail } from "@/components/config-permission-detail";
import { getConfigDirectory } from "@/lib/config-directory";

export default async function PermissionsPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { people, homes, permissionsReady } = await getConfigDirectory();
  const requested = (await searchParams).user;
  const selected = people.find(person => person.key === requested) ?? people[0] ?? null;

  return <ConfigPeopleFrame people={people} selectedKey={selected?.key ?? ""} view="permissions">
    {selected ? <ConfigPermissionDetail person={selected} homes={homes} permissionsReady={permissionsReady} /> :
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Add a user to configure access.</div>}
  </ConfigPeopleFrame>;
}
