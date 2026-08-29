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

export const Route = createFileRoute("/_authenticated/admin/farm-order")({
  head: () => ({
    meta: [
      { title: "Farm order | Nalla Kadai" },
      {
        name: "description",
        content: "Aggregated item quantities per cycle, grouped by supplier and ready to export.",
      },
      { property: "og:title", content: "Farm order | Nalla Kadai" },
      { property: "og:description", content: "Aggregated procurement list per farm." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FarmOrderPage,
});

function FarmOrderPage() {
  const { branchId } = useBranchScope();
  const [cycleId, setCycleId] = useState("");
  const [supplierId, setSupplierId] = useState("all");
  const supKey = supplierId === "unassigned" ? "" : supplierId;
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: () => listCycles() });
  const list = (cycles.data ?? []).filter((c) => (branchId ? c.branch_id === branchId : true));
  const active = cycleId || list[0]?.id || "";
  const proc = useQuery({
    queryKey: ["proc", active],
    queryFn: () => procurement({ data: { cycleId: active } }),
    enabled: !!active,
  });

  const all = proc.data?.farmOrder ?? [];
  const rows = supplierId === "all" ? all : all.filter((r) => (r.supplierId || "") === supKey);
  const supplierName =
    supplierId === "all"
      ? "All suppliers"
      : (proc.data?.suppliers.find((s) => s.id === supKey)?.name ?? "Unassigned");

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, r) => {
    (acc[`${r.supplier} · ${r.category}`] ??= []).push(r);
    return acc;
  }, {});

  const exportCsv = () => {
    if (!proc.data) return;
    download(
      `farm-order-cycle-${proc.data.cycle.cycleNo}-${supplierName.replace(/\W+/g, "-").toLowerCase()}.csv`,
      csv([
        ["Supplier", "Category", "Item", "Tamil", "Unit", "Quantity", "Value"],
        ...rows.map((f) => [
          f.supplier,
          f.category,
          f.nameEn,
          f.nameTa,
          f.unit,
          f.qty,
          f.value.toFixed(2),
        ]),
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Farm order</h1>
          <p className="text-sm text-muted-foreground">
            {proc.data
              ? `${proc.data.cycle.branch} · Cycle ${proc.data.cycle.cycleNo}${
                  proc.data.cycle.deliveryDate ? ` · Delivery ${proc.data.cycle.deliveryDate}` : ""
                }`
              : "Select a cycle"}
          </p>
        </div>
        <Select value={active} onValueChange={setCycleId}>
          <SelectTrigger className="w-64 bg-card">
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
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-56 bg-card">
            <SelectValue placeholder="All suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {(proc.data?.suppliers ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          Export Excel
        </Button>
        <Button variant="secondary" onClick={() => window.print()} disabled={!rows.length}>
          Print / Save as PDF
        </Button>
      </div>

      <div className="print-root space-y-6">
        <header className="hidden print:block">
          <h1 className="font-display text-2xl">Farm order — {supplierName}</h1>
          {proc.data && (
            <p className="text-sm">
              {proc.data.cycle.branch} · Cycle {proc.data.cycle.cycleNo}
              {proc.data.cycle.deliveryDate ? ` · Delivery ${proc.data.cycle.deliveryDate}` : ""}
            </p>
          )}
        </header>

        {Object.entries(grouped).map(([heading, list2]) => (
          <section key={heading} className="card-warm overflow-hidden">
            <h2 className="border-b px-5 py-3 font-display text-lg">{heading}</h2>
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
                {list2.map((f) => (
                  <tr key={f.nameEn} className="border-t">
                    <td className="px-5 py-2">
                      {f.nameEn} <span className="ta text-muted-foreground">{f.nameTa}</span>
                    </td>
                    <td className="px-5 py-2">{f.unit}</td>
                    <td className="px-5 py-2 text-right">{f.qty}</td>
                    <td className="px-5 py-2 text-right">{money(f.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {!rows.length && (
          <p className="card-warm p-8 text-center text-sm text-muted-foreground">
            Nothing to procure for this cycle and supplier yet.
          </p>
        )}
      </div>
    </div>
  );
}
