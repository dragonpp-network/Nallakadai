import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  listCycles,
  listCatalog,
  getAvailability,
  setAvailability,
  copyAvailability,
} from "@/lib/admin.functions";
import { useBranchScope } from "@/lib/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/availability")({
  head: () => ({
    meta: [
      { title: "Cycle availability | Nalla Kadai" },
      {
        name: "description",
        content: "Choose which items are available in a cycle and set price, cap and quantity limits.",
      },
      { property: "og:title", content: "Cycle availability | Nalla Kadai" },
      { property: "og:description", content: "Per-cycle item availability and pricing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AvailabilityPage,
});

type Row = { on: boolean; price: string; cap: string; min: string; max: string };

function AvailabilityPage() {
  const { branchId } = useBranchScope();
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: () => listCycles() });
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => listCatalog() });
  const [cycleId, setCycleId] = useState("");
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [q, setQ] = useState("");

  const list = (cycles.data ?? []).filter((c) => (branchId ? c.branch_id === branchId : true));
  const active = cycleId || list[0]?.id || "";

  const avail = useQuery({
    queryKey: ["avail", active],
    queryFn: () => getAvailability({ data: { cycleId: active } }),
    enabled: !!active,
  });

  useEffect(() => {
    if (!catalog.data) return;
    const map: Record<string, Row> = {};
    for (const it of catalog.data.items) {
      const existing = avail.data?.find((a) => a.item_id === it.id);
      map[it.id] = {
        on: !!existing,
        price: existing ? String(existing.price) : "",
        cap: existing?.cap_qty != null ? String(existing.cap_qty) : "",
        min: existing?.min_qty != null ? String(existing.min_qty) : String(it.min_qty),
        max: existing?.max_qty != null ? String(existing.max_qty) : String(it.max_qty),
      };
    }
    setRows(map);
  }, [avail.data, catalog.data]);

  async function save() {
    const payload = Object.entries(rows)
      .filter(([, r]) => r.on)
      .map(([item_id, r]) => ({
        item_id,
        price: Number(r.price || 0),
        cap_qty: r.cap ? Number(r.cap) : null,
        min_qty: r.min ? Number(r.min) : null,
        max_qty: r.max ? Number(r.max) : null,
      }));
    const res = await setAvailability({ data: { cycleId: active, rows: payload } });
    if (res.affected.length)
      toast.warning(
        `${res.affected.length} placed order line(s) reference removed items: ${res.affected
          .slice(0, 4)
          .map((a) => `${a.order_no} ${a.name}`)
          .join(", ")}`,
      );
    else toast.success("Availability saved");
    avail.refetch();
  }

  const catName = new Map((catalog.data?.categories ?? []).map((c) => [c.id, c.name]));
  const items = (catalog.data?.items ?? []).filter(
    (it) =>
      !q ||
      it.name_en.toLowerCase().includes(q.toLowerCase()) ||
      (it.name_ta ?? "").includes(q),
  );
  const onCount = Object.values(rows).filter((r) => r.on).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Cycle availability</h1>
        <p className="text-sm text-muted-foreground">
          {onCount} item{onCount === 1 ? "" : "s"} switched on for this cycle.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        <Select
          onValueChange={async (from) => {
            const res = await copyAvailability({ data: { fromCycleId: from, toCycleId: active } });
            toast.success(`Copied ${res.copied} items`);
            avail.refetch();
          }}
        >
          <SelectTrigger className="w-56 bg-card">
            <SelectValue placeholder="Copy from cycle…" />
          </SelectTrigger>
          <SelectContent>
            {list
              .filter((c) => c.id !== active)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {(c.branches as { name: string } | null)?.name} · Cycle {c.cycle_no}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Input
          className="w-52 bg-card"
          placeholder="Search item"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button className="ml-auto" onClick={save} disabled={!active}>
          Save availability
        </Button>
      </div>

      <section className="card-warm overflow-hidden">
        <div className="max-h-[34rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 text-left">
              <tr>
                <th className="px-3 py-2">On</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Cap</th>
                <th className="px-3 py-2">Min</th>
                <th className="px-3 py-2">Max</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const r = rows[it.id];
                if (!r) return null;
                const patch = (p: Partial<Row>) => setRows({ ...rows, [it.id]: { ...r, ...p } });
                return (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">
                      <Checkbox checked={r.on} onCheckedChange={(v) => patch({ on: v === true })} />
                    </td>
                    <td className="px-3 py-2">
                      <div>{it.name_en}</div>
                      <div className="ta text-xs text-muted-foreground">
                        {it.name_ta} · {catName.get(it.category_id)}
                      </div>
                    </td>
                    <td className="px-3 py-2">{it.unit}</td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 w-24"
                        value={r.price}
                        onChange={(e) => patch({ price: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 w-20"
                        value={r.cap}
                        placeholder="∞"
                        onChange={(e) => patch({ cap: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 w-20"
                        value={r.min}
                        onChange={(e) => patch({ min: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 w-20"
                        value={r.max}
                        onChange={(e) => patch({ max: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No items match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
