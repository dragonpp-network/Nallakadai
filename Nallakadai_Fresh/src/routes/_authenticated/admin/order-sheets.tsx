import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCycles, procurement } from "@/lib/admin.functions";
import { useBranchScope } from "@/lib/branch-context";
import { csv, download, money } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/order-sheets")({
  head: () => ({
    meta: [
      { title: "Order sheets | Nalla Kadai" },
      {
        name: "description",
        content: "Printable per-customer picking sheets for a cycle, ready for A4 or A5 printing.",
      },
      { property: "og:title", content: "Order sheets | Nalla Kadai" },
      { property: "og:description", content: "Per-customer picking sheets for packing day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSheetsPage,
});

function OrderSheetsPage() {
  const { branchId } = useBranchScope();
  const [cycleId, setCycleId] = useState("");
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: () => listCycles() });
  const scoped = (cycles.data ?? []).filter((c) => (branchId ? c.branch_id === branchId : true));

  // Only the latest cycle per branch is offered — sheets are printed for the current run.
  const latestPerBranch = new Map<string, (typeof scoped)[number]>();
  for (const c of scoped) {
    const cur = latestPerBranch.get(c.branch_id);
    if (!cur || c.cycle_no > cur.cycle_no) latestPerBranch.set(c.branch_id, c);
  }
  const list = [...latestPerBranch.values()];
  const active = cycleId && list.some((c) => c.id === cycleId) ? cycleId : (list[0]?.id ?? "");

  const proc = useQuery({
    queryKey: ["proc", active],
    queryFn: () => procurement({ data: { cycleId: active } }),
    enabled: !!active,
  });
  const sheets = proc.data?.sheets ?? [];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Order sheets</h1>
          <p className="text-sm text-muted-foreground">
            {sheets.length} sheet{sheets.length === 1 ? "" : "s"} for the latest cycle.
          </p>
        </div>
        <Select value={active} onValueChange={setCycleId}>
          <SelectTrigger className="w-72 bg-card">
            <SelectValue placeholder="Choose cycle" />
          </SelectTrigger>
          <SelectContent>
            {list.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {(c.branches as { name: string } | null)?.name} · Cycle {c.cycle_no} ({c.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          disabled={!sheets.length}
          onClick={() =>
            proc.data &&
            download(
              `orders-cycle-${proc.data.cycle.cycleNo}.csv`,
              csv([
                [
                  "Order",
                  "Customer",
                  "Mobile",
                  "Mode",
                  "Area",
                  "Preferred time",
                  "Map link",
                  "Item",
                  "Unit",
                  "Qty",
                  "Price",
                  "Value",
                ],
                ...sheets.flatMap((s) =>
                  s.lines.map((l) => [
                    s.orderNo,
                    s.customer.name,
                    s.customer.mobile,
                    s.deliveryMode,
                    s.customer.area ?? "",
                    s.preferredTime ?? "",
                    s.customer.map_link ?? "",
                    l.nameEn,
                    l.unit,
                    l.qty,
                    l.price,
                    (l.qty * l.price).toFixed(2),
                  ]),
                ),
              ]),
            )
          }
        >
          Export Excel
        </Button>
        <Button onClick={() => window.print()} disabled={!sheets.length}>
          Print all sheets
        </Button>
      </div>

      <div className="print-root space-y-6">
        {sheets.map((s) => (
          <article key={s.orderNo} className="card-warm print-sheet p-6">
            <header className="flex flex-wrap items-start gap-3 border-b pb-3">
              <div className="mr-auto">
                <div className="font-display text-xl">{s.customer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {s.customer.mobile}
                  {s.customer.area ? ` · ${s.customer.area}` : ""}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-medium">{s.orderNo}</div>
                <div className="text-muted-foreground">{s.deliveryMode}</div>
                {proc.data && (
                  <div className="text-muted-foreground">
                    Cycle {proc.data.cycle.cycleNo}
                    {proc.data.cycle.deliveryDate ? ` · ${proc.data.cycle.deliveryDate}` : ""}
                  </div>
                )}
              </div>
            </header>
            {s.deliveryMode === "Door Delivery" ? (
              <div className="space-y-1 pt-3 text-sm text-muted-foreground">
                <p>{s.address}</p>
                {s.preferredTime && <p>Preferred time: {s.preferredTime}</p>}
                {s.customer.map_link && <p className="break-all">Map: {s.customer.map_link}</p>}
              </div>
            ) : (
              <p className="pt-3 text-sm text-muted-foreground">
                Pickup: {proc.data?.cycle.pickupAddress} · {proc.data?.cycle.collectionTiming}
              </p>
            )}
            <table className="mt-4 w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-center">Packed</th>
                </tr>
              </thead>
              <tbody>
                {s.lines.map((l) => (
                  <tr key={l.nameEn} className="border-t">
                    <td className="px-3 py-2">
                      {l.nameEn} <span className="ta text-muted-foreground">{l.nameTa}</span>
                    </td>
                    <td className="px-3 py-2">{l.unit}</td>
                    <td className="px-3 py-2 text-right">{l.qty}</td>
                    <td className="px-3 py-2 text-right">{money(l.qty * l.price)}</td>
                    <td className="px-3 py-2 text-center">☐</td>
                  </tr>
                ))}
                <tr className="border-t font-medium">
                  <td className="px-3 py-2" colSpan={3}>
                    Tentative total
                  </td>
                  <td className="px-3 py-2 text-right">
                    {money(s.lines.reduce((t, l) => t + l.qty * l.price, 0))}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
            {s.note && <p className="mt-3 text-sm">Note: {s.note}</p>}
          </article>
        ))}
        {!sheets.length && (
          <p className="card-warm p-8 text-center text-sm text-muted-foreground">
            No placed orders in this cycle yet.
          </p>
        )}
      </div>
    </div>
  );
}
