import Link from "next/link";
import { PageHeader } from "@/components/app-shell";
import { getActions } from "@/lib/data";
import { effectiveStatus, formatDate } from "@/lib/utils";

export default async function ArchivePage() {
  const allActions = await getActions();
  const actions = allActions.filter(
    (a) => Boolean(a.completed_at || a.signoffs?.length || effectiveStatus(a) === "Completed")
  );

  return (
    <>
      <PageHeader
        title="Completed Actions"
        description="Actions completed and signed off by leadership."
      />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Action</th>
              <th>Owner</th>
              <th>Workstream</th>
              <th>Signed off by</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const owner =
                a.participants.find((p) => p.responsibility_type !== "Support")?.manager.name ||
                a.participants[0]?.manager.name ||
                "—";
              const signer =
                a.signoffs?.[0]?.signed_off_by_name ||
                (owner !== "—" ? `${owner} / Joel Samuel` : "Joel Samuel");
              const date = a.signoffs?.[0]?.signed_off_at?.slice(0, 10) || a.completed_at;

              return (
                <tr key={a.id}>
                  <td>
                    <Link
                      className="font-mono font-bold text-blue-800 hover:underline"
                      href={`/actions/${a.id}`}
                    >
                      {a.reference}
                    </Link>
                  </td>
                  <td className="font-semibold text-slate-900">{a.title}</td>
                  <td className="text-sm font-medium text-slate-700">{owner}</td>
                  <td className="text-sm text-slate-600">{a.workstream?.name}</td>
                  <td>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                      {signer}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-sm text-slate-600">
                    {formatDate(date)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!actions.length && (
          <div className="p-12 text-center">
            <h2 className="font-bold text-slate-900">No completed actions yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Completed and signed-off actions will appear here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
