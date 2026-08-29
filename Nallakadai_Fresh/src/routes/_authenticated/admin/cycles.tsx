import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  listCycles,
  saveCycle,
  listBranches,
  nonCollectionAlerts,
} from "@/lib/admin.functions";
import { useBranchScope } from "@/lib/branch-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateField, DateTimeField } from "@/components/admin/DateTimeField";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/cycles")({
  head: () => ({
    meta: [
      { title: "Ordering cycles | Fresh Nalla Kadai" },
      {
        name: "description",
        content: "Open and close ordering windows and set item availability and pricing per cycle.",
      },
      { property: "og:title", content: "Ordering cycles | Fresh Nalla Kadai" },
      { property: "og:description", content: "Manage ordering windows, availability and prices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CyclesPage,
});

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function CyclesPage() {
  const { branchId } = useBranchScope();
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => listBranches() });
  const cycles = useQuery({ queryKey: ["cycles"], queryFn: () => listCycles() });

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    branch_id: "",
    cycle_no: 1,
    open_at: "",
    close_at: "",
    delivery_date: "",
    status: "Draft" as "Draft" | "Open" | "Closed" | "Delivered",
    manual_override: "" as "" | "force_open" | "force_closed",
  });

  const alerts = useQuery({
    queryKey: ["alerts", form.branch_id],
    queryFn: () => nonCollectionAlerts({ data: { branchId: form.branch_id } }),
    enabled: !!form.branch_id,
  });

  function startNew() {
    const branch = branchId || branches.data?.[0]?.id || "";
    const last = (cycles.data ?? []).filter((c) => c.branch_id === branch)[0];
    setEditing("new");
    setForm({
      branch_id: branch,
      cycle_no: (last?.cycle_no ?? 0) + 1,
      open_at: "",
      close_at: "",
      delivery_date: "",
      status: "Draft",
      manual_override: "",
    });
  }

  async function submit() {
    if (!form.branch_id) return void toast.error("Choose a branch.");
    await saveCycle({
      data: {
        id: editing && editing !== "new" ? editing : undefined,
        branch_id: form.branch_id,
        cycle_no: Number(form.cycle_no),
        open_at: toIso(form.open_at),
        close_at: toIso(form.close_at),
        delivery_date: form.delivery_date || null,
        status: form.status,
        manual_override: form.manual_override || null,
      },
    });
    toast.success("Cycle saved");
    setEditing(null);
    cycles.refetch();
  }

  const list = (cycles.data ?? []).filter((c) => (branchId ? c.branch_id === branchId : true));

  return (
    <div className="space-y-8">
      <div className="flex items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Cycles</h1>
          <p className="text-sm text-muted-foreground">
            Ordering windows per branch. Item availability and pricing live on the{" "}
            <Link to="/admin/availability" className="underline">
              Cycle Availability
            </Link>{" "}
            page.
          </p>
        </div>
        <Button onClick={startNew}>New cycle</Button>
      </div>

      <section className="card-warm divide-y overflow-hidden">
        {list.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="w-40 font-medium">
              {(c.branches as { name: string } | null)?.name} · Cycle {c.cycle_no}
            </div>
            <Badge variant={c.isOpen ? "default" : "secondary"}>
              {c.isOpen ? "Open" : c.status}
            </Badge>
            <span className="text-muted-foreground">
              {c.open_at ? new Date(c.open_at).toLocaleString() : "—"} →{" "}
              {c.close_at ? new Date(c.close_at).toLocaleString() : "—"}
            </span>
            {c.delivery_date && (
              <span className="text-muted-foreground">Delivery {c.delivery_date}</span>
            )}
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(c.id);
                  setForm({
                    branch_id: c.branch_id,
                    cycle_no: c.cycle_no,
                    open_at: toLocal(c.open_at),
                    close_at: toLocal(c.close_at),
                    delivery_date: c.delivery_date ?? "",
                    status: c.status as "Draft" | "Open" | "Closed" | "Delivered",
                    manual_override: (c.manual_override ?? "") as "" | "force_open" | "force_closed",
                  });
                }}
              >
                Edit
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link to="/admin/availability">Availability</Link>
              </Button>
            </div>
          </div>
        ))}
        {!list.length && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No cycles yet.</p>
        )}
      </section>

      {editing && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="text-xl">{editing === "new" ? "New cycle" : "Edit cycle"}</h2>
          {!!alerts.data?.length && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <strong>Non-collection alerts:</strong>{" "}
              {alerts.data
                .map((a) => (a.customers as { name: string } | null)?.name)
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={form.branch_id}
                onValueChange={(v) => setForm({ ...form, branch_id: v })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branches.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cycle number</Label>
              <Input
                type="number"
                value={form.cycle_no}
                onChange={(e) => setForm({ ...form, cycle_no: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Draft", "Open", "Closed", "Delivered"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Order window opens</Label>
              <DateTimeField
                value={form.open_at}
                onChange={(v) => setForm({ ...form, open_at: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Order window closes</Label>
              <DateTimeField
                value={form.close_at}
                onChange={(v) => setForm({ ...form, close_at: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery date</Label>
              <DateField
                value={form.delivery_date}
                onChange={(v) => setForm({ ...form, delivery_date: v })}
                placeholder="Pick delivery date"
              />
            </div>
            <div className="space-y-2">
              <Label>Manual override</Label>
              <Select
                value={form.manual_override || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, manual_override: v === "none" ? "" : (v as "force_open") })
                }
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Follow schedule</SelectItem>
                  <SelectItem value="force_open">Force open</SelectItem>
                  <SelectItem value="force_closed">Force closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={submit}>Save cycle</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

    </div>
  );
}

