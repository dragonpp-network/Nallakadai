import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { auditLog, adminMe } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit log | Nalla Kadai" },
      {
        name: "description",
        content: "Every admin change to orders, cycles, items, branches and customers.",
      },
      { property: "og:title", content: "Audit log | Nalla Kadai" },
      { property: "og:description", content: "Full trail of back-office changes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const me = useQuery({ queryKey: ["adminMe"], queryFn: () => adminMe() });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditLog(),
    enabled: !!me.data?.isSuper,
  });

  if (me.data && !me.data.isSuper)
    return (
      <p className="card-warm p-8 text-center text-sm text-muted-foreground">
        The audit log is visible to super admins only.
      </p>
    );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Audit log</h1>
      <section className="card-warm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Reference</th>
            </tr>
          </thead>
          <tbody>
            {(audit.data ?? []).map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-2 whitespace-nowrap">
                  {new Date(a.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">{a.actor_label}</td>
                <td className="px-4 py-2">{a.action}</td>
                <td className="px-4 py-2">{a.entity}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.entity_id}</td>
              </tr>
            ))}
            {!audit.data?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
