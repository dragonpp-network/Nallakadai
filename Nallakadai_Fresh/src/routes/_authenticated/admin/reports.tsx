import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { reports, auditLog, adminMe } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports | Fresh Nalla Kadai" },
      {
        name: "description",
        content:
          "Customer value, item movement, cycle summaries, lapsed customers and the admin audit trail.",
      },
      { property: "og:title", content: "Reports | Fresh Nalla Kadai" },
      { property: "og:description", content: "Ordering analytics and audit trail for staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

const money = (n: number) => `₹${n.toFixed(2)}`;

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="card-warm overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={head.length} className="px-4 py-6 text-center text-muted-foreground">
                No data for these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportsPage() {
  const [filters, setFilters] = useState({ from: "", to: "", customerQ: "", itemQ: "" });
  const me = useQuery({ queryKey: ["adminMe"], queryFn: () => adminMe() });
  const data = useQuery({
    queryKey: ["reports", filters],
    queryFn: () =>
      reports({
        data: {
          from: filters.from || null,
          to: filters.to || null,
          customerQ: filters.customerQ,
          itemQ: filters.itemQ,
          branchIds: [],
          cycleNo: null,
          lapsedCycles: 3,
        },
      }),
  });
  const audit = useQuery({
    queryKey: ["audit"],
    queryFn: () => auditLog(),
    enabled: !!me.data?.isSuper,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Reports</h1>

      <section className="card-warm grid gap-4 p-5 md:grid-cols-4">
        <div className="space-y-2">
          <Label>From</Label>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Customer</Label>
          <Input
            value={filters.customerQ}
            onChange={(e) => setFilters({ ...filters, customerQ: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Item</Label>
          <Input
            value={filters.itemQ}
            onChange={(e) => setFilters({ ...filters, itemQ: e.target.value })}
          />
        </div>
      </section>

      <Tabs defaultValue="customers">
        <TabsList className="flex-wrap">
          <TabsTrigger value="customers">Customer value</TabsTrigger>
          <TabsTrigger value="items">Item movement</TabsTrigger>
          <TabsTrigger value="pairs">Customer × item</TabsTrigger>
          <TabsTrigger value="cycles">Cycle summary</TabsTrigger>
          <TabsTrigger value="lapsed">Lapsed</TabsTrigger>
          {me.data?.isSuper && <TabsTrigger value="branches">Branches</TabsTrigger>}
          {me.data?.isSuper && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>

        <TabsContent value="customers">
          <Table
            head={["Customer", "Mobile", "Orders", "Quantity", "Value", "Average", "Last order"]}
            rows={(data.data?.customerValue ?? []).map((c) => [
              c.name,
              c.mobile,
              c.orders,
              c.qty.toFixed(2),
              money(c.value),
              money(c.avg),
              new Date(c.last).toLocaleDateString(),
            ])}
          />
        </TabsContent>
        <TabsContent value="items">
          <Table
            head={["Item", "Tamil", "Unit", "Quantity", "Value", "Times ordered"]}
            rows={(data.data?.itemMovement ?? []).map((i) => [
              i.nameEn,
              i.nameTa,
              i.unit,
              i.qty.toFixed(2),
              money(i.value),
              i.orders,
            ])}
          />
        </TabsContent>
        <TabsContent value="pairs">
          <Table
            head={["Customer", "Mobile", "Item", "Quantity", "Times"]}
            rows={(data.data?.customerItem ?? []).map((c) => [
              c.customer,
              c.mobile,
              c.item,
              c.qty.toFixed(2),
              c.times,
            ])}
          />
        </TabsContent>
        <TabsContent value="cycles">
          <Table
            head={["Cycle", "Customers", "Orders", "Items", "Quantity", "Value"]}
            rows={(data.data?.cycleSummary ?? []).map((c) => [
              c.label,
              c.customers,
              c.orders,
              c.items,
              c.qty.toFixed(2),
              money(c.value),
            ])}
          />
        </TabsContent>
        <TabsContent value="lapsed" className="space-y-4">
          <Table
            head={["Customer", "Mobile"]}
            rows={(data.data?.lapsed ?? []).map((c) => [c.name, c.mobile])}
          />
          <h2 className="text-xl">Non-collection</h2>
          <Table
            head={["Order", "Customer", "Mobile", "Cycle"]}
            rows={(data.data?.nonCollection ?? []).map((n) => [
              n.orderNo,
              n.customer,
              n.mobile,
              n.cycle,
            ])}
          />
        </TabsContent>
        {me.data?.isSuper && (
          <TabsContent value="branches">
            <Table
              head={["Branch", "Orders", "Customers", "Quantity", "Value"]}
              rows={(data.data?.branchComparison ?? []).map((b) => [
                b.name,
                b.orders,
                b.customers,
                b.qty.toFixed(2),
                money(b.value),
              ])}
            />
          </TabsContent>
        )}
        {me.data?.isSuper && (
          <TabsContent value="audit">
            <Table
              head={["When", "Who", "Action", "Entity"]}
              rows={(audit.data ?? []).map((a) => [
                new Date(a.created_at).toLocaleString(),
                a.actor_label ?? "",
                a.action,
                `${a.entity} ${a.entity_id ?? ""}`,
              ])}
            />
          </TabsContent>
        )}
      </Tabs>

      <div className="no-print">
        <Button variant="outline" onClick={() => data.refetch()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
