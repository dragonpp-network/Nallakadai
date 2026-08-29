import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listSuppliers, saveSupplier } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers | Nalla Kadai" },
      {
        name: "description",
        content: "Maintain the farm and supplier master used to split procurement lists.",
      },
      { property: "og:title", content: "Suppliers | Nalla Kadai" },
      { property: "og:description", content: "Farm and supplier master for procurement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuppliersPage,
});

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  contact_person: "",
  phone: "",
  address: "",
  notes: "",
  active: true,
};

function SuppliersPage() {
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => listSuppliers() });
  const [form, setForm] = useState<typeof EMPTY | null>(null);

  async function submit() {
    if (!form) return;
    if (!form.name.trim()) return void toast.error("Give the farm or supplier a name.");
    try {
      await saveSupplier({ data: form });
      toast.success("Supplier saved");
      setForm(null);
      suppliers.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Farms and vendors you buy from. Each catalogue item can be tagged to one supplier so the
            farm order can be split and sent separately.
          </p>
        </div>
        <Button onClick={() => setForm({ ...EMPTY })}>Add supplier</Button>
      </div>

      {form && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="font-display text-xl">{form.id ? "Edit supplier" : "New supplier"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Farm / supplier name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contact person</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            Supplier active
          </label>
          <div className="flex gap-2">
            <Button onClick={submit}>Save supplier</Button>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="card-warm divide-y overflow-hidden">
        {(suppliers.data ?? []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="w-52 font-medium">{s.name}</div>
            <div className="text-muted-foreground">{s.contact_person || "—"}</div>
            <div className="text-muted-foreground">{s.phone || "—"}</div>
            {!s.active && <Badge variant="secondary">Inactive</Badge>}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() =>
                setForm({
                  id: s.id,
                  name: s.name,
                  contact_person: s.contact_person ?? "",
                  phone: s.phone ?? "",
                  address: s.address ?? "",
                  notes: s.notes ?? "",
                  active: s.active,
                })
              }
            >
              Edit
            </Button>
          </div>
        ))}
        {!suppliers.data?.length && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No suppliers yet. Add your farms so the farm order can be grouped per supplier.
          </p>
        )}
      </section>
    </div>
  );
}
