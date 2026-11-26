import { ArchiveTable } from "@/workbook/components/archive-table";
import { getActions } from "@/workbook/lib/data";
import { isActionClosed } from "@/workbook/lib/utils";

export default async function ArchivePage() {
  const allActions = await getActions();
  return <ArchiveTable actions={allActions.filter((a) => isActionClosed(a))} />;
}
