import { ConfigAccountEditor } from "@/components/config-account-editor";
import { ConfigPeopleFrame } from "@/components/config-people-frame";
import { getConfigDirectory } from "@/lib/config-directory";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const { people, managers, homes, currentUserId, teamHierarchyReady, actor } = await getConfigDirectory();
  const requested = (await searchParams).user;
  const selected = requested === "new" ? null : people.find(person => person.key === requested) ?? people[0] ?? null;
  const selectedKey = requested === "new" ? "new" : selected?.key ?? "new";

  return <ConfigPeopleFrame people={people} selectedKey={selectedKey} view="users">
    <ConfigAccountEditor person={selected} managers={managers} homes={homes} currentUserId={currentUserId} teamHierarchyReady={teamHierarchyReady} actor={actor} />
  </ConfigPeopleFrame>;
}
