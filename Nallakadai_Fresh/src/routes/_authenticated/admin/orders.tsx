import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listCycles,
  cycleDashboard,
  adminOrderAction,
  adminSaveOrder,
  getAvailability,
  listCatalog,
  listCustomers,
} from "@/lib/admin.functions";
import { useBranchScope } from "@/lib/branch-context";
import { csv, download, money } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders | Nalla Kadai" },
      {
        name: "description",
        content: "Search, edit, cancel and enter orders on behalf of customers for any cycle.",
      },
      { property: "og:title", content: "Orders | Nalla Kadai" },
      { property: "og:description", content: "Order management for the ordering cycle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

type Editor = {
  orderId?: string;
  customerId: string;
  deliveryMode: "Door Delivery" | "Customer Pickup";
  address: string;
  note: string;
  preferredTime: string;
  lines: Record<string, string>;
};

function OrdersPage() {
  const { branchId } = useBranchScope();
  const [cycleId, setCycleId] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editor, setEditor] = useState<Editor | null>(null);

  const cycles = useQuery({ queryKey: ["cycles"], queryFn: () => listCycles() });
  const list = (cycles.data ?? []).filter((c) => (branchId ? c.branch_id === branchId : true));
  const active = cycleId || list[0]?.id || "";
  const dash = useQuery({
    queryKey: ["dash", active],
    queryFn: () => cycleDashboard({ data: { cycleId: active } }),
    enabled: !!active,
  });
  const avail = useQuery({
    queryKey: ["avail", active],
    queryFn: () => getAvailability({ data: { cycleId: active } }),
    enabled: !!active && !!editor,
  });
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => listCatalog(),
    enabled: !!editor,
  });
  const customers = useQuery({
    queryKey: ["customers", "orders"],
    queryFn: () => listCustomers({ data: {} }),
    enabled: !!editor,
  });

  const orders = useMemo(() => {
    const all = dash.data?.orders ?? [];
    return all.filter((o) => {
      if (status === "placed" && o.status !== "Placed") return false;
      if (status === "cancelled" && o.status !== "Cancelled") return false;
      if (status === "non_collected" && !o.nonCollected) return false;
      if (!q) return true;
      const t = q.toLowerCase();
      return (
        o.orderNo.toLowerCase().includes(t) ||
        (o.customer?.name ?? "").toLowerCase().includes(t) ||
        (o.customer?.mobile ?? "").includes(t)
      );
    });
  }, [dash.data, q, status]);

  async function mark(orderId: string, action: "cancel" | "non_collect" | "clear_non_collect") {
    const reason =
      action === "clear_non_collect"
        ? null
        : window.prompt(action === "cancel" ? "Reason for cancelling?" : "Reason not collected?");
    if (action !== "clear_non_collect" && reason === null) return;
    await adminOrderAction({ data: { orderId, action, reason } });
    toast.success("Order updated");
    dash.refetch();
  }

  async function saveOrder() {
    if (!editor) return;
    if (!editor.customerId) return void toast.error("Choose a customer.");
    const lines = Object.entries(editor.lines)
      .map(([itemId, v]) => ({ itemId, qty: Number(v) }))
      .filter((l) => l.qty > 0);
    if (!lines.length) return void toast.error("Add at least one item.");
    try {
      await adminSaveOrder({
        data: {
          orderId: editor.orderId,
          cycleId: active,
          customerId: editor.customerId,
          deliveryMode: editor.deliveryMode,
          address: editor.address,
          note: editor.note || null,
          preferredTime: editor.preferredTime,
          override: false,
          lines,
        },
      });
      toast.success("Order saved");
      setEditor(null);
      dash.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const itemById = new Map((catalog.data?.items ?? []).map((i) => [i.id, i]));
  const availItems = (avail.data ?? []).flatMap((a) => {
    const it = itemById.get(a.item_id);
    if (!it) return [];
    return [
      {
        id: it.id,
        nameEn: it.name_en,
        nameTa: it.name_ta,
        unit: it.unit,
        price: Number(a.price),
      },
    ];
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {orders.length} order{orders.length === 1 ? "" : "s"} in view
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
        <Button
          onClick={() =>
            setEditor({
              customerId: "",
              deliveryMode: "Door Delivery",
              address: "",
              note: "",
              preferredTime: "",
              lines: {},
            })
          }
          disabled={!active}
        >
          New order
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="w-60 bg-card"
          placeholder="Search order no, name or mobile"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="non_collected">Not collected</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() =>
            download(
              "orders.csv",
              csv([
                ["Order", "Customer", "Mobile", "Mode", "Items", "Value", "Status"],
                ...orders.map((o) => [
                  o.orderNo,
                  o.customer?.name ?? "",
                  o.customer?.mobile ?? "",
                  o.deliveryMode,
                  o.itemCount,
                  o.value.toFixed(2),
                  o.status,
                ]),
              ]),
            )
          }
        >
          Export Excel
        </Button>
      </div>

      {editor && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="font-display text-xl">{editor.orderId ? "Edit order" : "New order"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={editor.customerId}
                onValueChange={(v) => {
                  const c = customers.data?.find((x) => x.id === v);
                  setEditor({
                    ...editor,
                    customerId: v,
                    address: c?.address ?? editor.address,
                    preferredTime:
                      editor.preferredTime || (c?.preferred_delivery_time ?? ""),
                    deliveryMode:
                      (c?.delivery_mode as Editor["deliveryMode"]) ?? editor.deliveryMode,
                  });
                }}
                disabled={!!editor.orderId}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  {(customers.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.mobile}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery mode</Label>
              <Select
                value={editor.deliveryMode}
                onValueChange={(v) =>
                  setEditor({ ...editor, deliveryMode: v as Editor["deliveryMode"] })
                }
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Door Delivery">Door Delivery</SelectItem>
                  <SelectItem value="Customer Pickup">Customer Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Input
                value={editor.note}
                onChange={(e) => setEditor({ ...editor, note: e.target.value })}
              />
            </div>
            {editor.deliveryMode === "Door Delivery" && (
              <div className="space-y-2">
                <Label>Preferred delivery time</Label>
                <Input
                  placeholder="e.g. 6–8 pm"
                  value={editor.preferredTime}
                  onChange={(e) => setEditor({ ...editor, preferredTime: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2 md:col-span-3">
              <Label>Delivery address</Label>
              <Textarea
                value={editor.address}
                onChange={(e) => setEditor({ ...editor, address: e.target.value })}
              />
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 text-left">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {availItems.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-3 py-2">
                      {it.nameEn} <span className="ta text-muted-foreground">{it.nameTa}</span>
                    </td>
                    <td className="px-3 py-2">{it.unit}</td>
                    <td className="px-3 py-2">{money(it.price)}</td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 w-24"
                        inputMode="decimal"
                        value={editor.lines[it.id] ?? ""}
                        onChange={(e) =>
                          setEditor({
                            ...editor,
                            lines: { ...editor.lines, [it.id]: e.target.value },
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
                {!availItems.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No items are available in this cycle yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveOrder}>Save order</Button>
            <Button variant="outline" onClick={() => setEditor(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="card-warm divide-y overflow-hidden">
        {orders.map((o) => (
          <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
            <div className="min-w-44">
              <div className="font-medium">{o.customer?.name}</div>
              <div className="text-muted-foreground">{o.customer?.mobile}</div>
            </div>
            <div className="text-muted-foreground">{o.orderNo}</div>
            <div className="text-muted-foreground">{o.deliveryMode}</div>
            <div>{o.itemCount} items</div>
            <div>{money(o.value)}</div>
            {o.adminEntered && <Badge variant="outline">Admin entered</Badge>}
            {o.status === "Cancelled" && <Badge variant="destructive">Cancelled</Badge>}
            {o.nonCollected && <Badge variant="secondary">Not collected</Badge>}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setEditor({
                    orderId: o.id,
                    customerId: o.customer?.id ?? "",
                    deliveryMode: o.deliveryMode as Editor["deliveryMode"],
                    address: o.address ?? "",
                    note: o.note ?? "",
                    preferredTime: o.preferredTime ?? "",
                    lines: Object.fromEntries(o.lines.map((l) => [l.itemId, String(l.qty)])),
                  })
                }
              >
                Edit
              </Button>
              {o.status !== "Cancelled" && (
                <Button size="sm" variant="outline" onClick={() => mark(o.id, "cancel")}>
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => mark(o.id, o.nonCollected ? "clear_non_collect" : "non_collect")}
              >
                {o.nonCollected ? "Clear flag" : "Not collected"}
              </Button>
            </div>
          </div>
        ))}
        {!orders.length && (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">No orders found.</p>
        )}
      </section>
    </div>
  );
}
