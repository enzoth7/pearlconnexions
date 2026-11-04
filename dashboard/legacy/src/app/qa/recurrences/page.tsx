import { QaRecurrences } from "@/components/qa-recurrences";
import { loadCases } from "@/lib/qa-cases-client";

export default async function Page() {
  const { homes, records, people } = await loadCases("incidents");
  const allowedHomes = new Set(homes.map(home => home.id));
  return <QaRecurrences homes={homes} records={records.filter(record => allowedHomes.has(record.home_id))} people={people.filter(person => allowedHomes.has(person.home_id))} />;
}
