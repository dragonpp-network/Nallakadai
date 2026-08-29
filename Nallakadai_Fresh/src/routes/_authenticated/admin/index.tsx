import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { listCycles, cycleDashboard } from "@/lib/admin.functions";
import { useBranchScope } from "@/lib/branch-context";
import { csv, download, money } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Cycle dashboard | Nalla Kadai" },
      {
        name: "description",
        content:
          "Live view of orders, quantities and pending customers for every open ordering cycle.",
      },
      { property: "og:title", content: "Cycle dashboard | Nalla Kadai" },
      { property: "og:description", content: "Live ordering cycle overview for branch staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { branchId } = useBranchScope();
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: () => listCycles() });

  const visible = (cycles.data ?? [])
    .filter((c) => (branchId ? c.branch_id === branchId : true))
    .filter((c) => c.status !== "Delivered")
    .slice(0, 6);

  const dashboards = useQueries({
    queries: visible.map((c) => ({
      queryKey: ["dash", c.id],
      queryFn: () => cycleDashboard({ data: { cycleId: c.id } }),
    })),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live status of every ordering window that is not yet delivered.
        </p>
      </div>

      {!visible.length && (
        <div className="card-warm p-8 text-center text-sm text-muted-foreground">
          No active cycles.{" "}
          <Link to="/admin/cycles" className="underline">
            Create a cycle
          </Link>{" "}
          to start taking orders.
        </div>
      )}

      {dashboards.map((q, i) => {
        const d = q.data;
        const c = visible[i]!;
        if (!d)
          return (
            <div key={c.id} className="card-warm p-6 text-sm text-muted-foreground">
              Loading {(c.branches as { name: string } | null)?.name} · Cycle {c.cycle_no}…
            </div>
          );
        const closeIn = (() => {
          if (!d.cycle.closeAt) return null;
          const ms = new Date(d.cycle.closeAt).getTime() - Date.now();
          if (ms <= 0) return "Window closed";
          const h = Math.floor(ms / 3_600_000);
          return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`;
        })();

        return (
          <section key={c.id} className="card-warm overflow-hidden">
            <header className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
              <div className="mr-auto">
                <h2 className="font-display text-xl">
                  {d.cycle.branchName} · Cycle {d.cycle.cycleNo}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {d.cycle.deliveryDate ? `Delivery ${d.cycle.deliveryDate}` : "No delivery date"}
                  {closeIn ? ` · ${closeIn}` : ""}
                </p>
              </div>
              <Badge variant={d.cycle.isOpen ? "default" : "secondary"}>
                {d.cycle.isOpen ? "Open for orders" : d.cycle.status}
              </Badge>
            </header>

            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">
              {[
                ["Customers ordered", `${d.stats.customersOrdered}/${d.stats.registered}`],
                ["Orders", d.stats.totalOrders],
                ["Total quantity", d.stats.totalQty.toFixed(2)],
                ["Order value", money(d.stats.totalValue)],
                ["Yet to order", d.stats.notOrdered],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-card px-5 py-4">
                  <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {label}
                  </div>
                  <div className="mt-1 font-display text-2xl">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t px-5 py-3">
              <h3 className="mr-auto text-sm font-medium">
                Not yet ordered ({d.notYetOrdered.length})
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download(
                    `not-ordered-cycle-${d.cycle.cycleNo}.csv`,
                    csv([
                      ["Name", "Mobile"],
                      ...d.notYetOrdered.map((n) => [n.name, n.mobile]),
                    ]),
                  )
                }
              >
                Export Excel
              </Button>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <th className="px-5 py-2">Customer</th>
                    <th className="px-5 py-2">Mobile</th>
                    <th className="px-5 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {d.notYetOrdered.map((n) => (
                    <tr key={n.id} className="border-t">
                      <td className="px-5 py-2">{n.name}</td>
                      <td className="px-5 py-2 text-muted-foreground">{n.mobile}</td>
                      <td className="px-5 py-2 text-right">
                        <a
                          href={`tel:${n.mobile}`}
                          className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                        >
                          Call
                        </a>
                      </td>
                    </tr>
                  ))}
                  {!d.notYetOrdered.length && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-muted-foreground">
                        Everyone has ordered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!!d.itemTotals.length && (
              <div className="border-t">
                <h3 className="px-5 py-3 text-sm font-medium">Running item totals</h3>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="px-5 py-2">Item</th>
                        <th className="px-5 py-2">Unit</th>
                        <th className="px-5 py-2 text-right">Quantity</th>
                        <th className="px-5 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.itemTotals.map((i) => (
                        <tr key={i.nameEn} className="border-t">
                          <td className="px-5 py-2">
                            {i.nameEn} <span className="ta text-muted-foreground">{i.nameTa}</span>
                          </td>
                          <td className="px-5 py-2">{i.unit}</td>
                          <td className="px-5 py-2 text-right">{i.qty}</td>
                          <td className="px-5 py-2 text-right">{money(i.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
