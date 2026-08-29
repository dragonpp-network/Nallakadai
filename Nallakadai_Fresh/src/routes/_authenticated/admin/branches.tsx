import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listBranches, saveBranch, adminMe } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BranchQrDialog, type QrBranch } from "@/components/admin/BranchQr";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/branches")({
  head: () => ({
    meta: [
      { title: "Branches | Nalla Kadai" },
      {
        name: "description",
        content:
          "Create and edit branches with pickup address, collection timing and support numbers.",
      },
      { property: "og:title", content: "Branches | Nalla Kadai" },
      { property: "og:description", content: "Branch setup for the ordering back office." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BranchesPage,
});

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  address: "",
  whatsapp_number: "",
  support_number: "",
  pickup_address: "",
  collection_timing: "",
  show_prices: true,
  next_opening_note: "",
  active: true,
};

function BranchesPage() {
  const me = useQuery({ queryKey: ["adminMe"], queryFn: () => adminMe() });
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => listBranches() });
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [qrBranch, setQrBranch] = useState<QrBranch | null>(null);

  async function submit() {
    if (!form) return;
    if (!form.name.trim()) return void toast.error("Branch name is required.");
    try {
      await saveBranch({
        data: { ...form, next_opening_note: form.next_opening_note || null },
      });
      toast.success("Branch saved");
      setForm(null);
      branches.refetch();
      me.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Each branch has its own cycles, customers and support numbers.
          </p>
        </div>
        {me.data?.isSuper && <Button onClick={() => setForm({ ...EMPTY })}>Add branch</Button>}
      </div>

      {!me.data?.isSuper && (
        <p className="text-sm text-muted-foreground">
          Only a super admin can create or edit branches.
        </p>
      )}

      {form && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="font-display text-xl">{form.id ? "Edit branch" : "New branch"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Branch name</Label>
              <Input
                value={form.name}
                placeholder="Erode Main"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Collection timing</Label>
              <Input
                value={form.collection_timing}
                placeholder="Saturday 7am – 11am"
                onChange={(e) => setForm({ ...form, collection_timing: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp enquiry number</Label>
              <Input
                inputMode="numeric"
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Support number</Label>
              <Input
                inputMode="numeric"
                value={form.support_number}
                onChange={(e) => setForm({ ...form, support_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Branch address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Pickup address</Label>
              <Textarea
                value={form.pickup_address}
                onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Next opening note (shown when the store is closed)</Label>
              <Input
                value={form.next_opening_note}
                placeholder="Orders open Thursday 6pm"
                onChange={(e) => setForm({ ...form, next_opening_note: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={form.show_prices}
                onCheckedChange={(v) => setForm({ ...form, show_prices: v })}
              />
              Show prices to customers
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              Branch active
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={submit}>Save branch</Button>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="card-warm divide-y overflow-hidden">
        {(branches.data ?? []).map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm">
            <div className="min-w-48">
              <div className="font-medium">{b.name}</div>
              <div className="text-muted-foreground">{b.address || "No address"}</div>
            </div>
            <div className="text-muted-foreground">Support {b.support_number || "—"}</div>
            <div className="text-muted-foreground">WhatsApp {b.whatsapp_number || "—"}</div>
            <div className="text-muted-foreground">{b.collection_timing || "No timing set"}</div>
            {!b.show_prices && <Badge variant="outline">Prices hidden</Badge>}
            {!b.active && <Badge variant="secondary">Inactive</Badge>}
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto"
              onClick={() =>
                setQrBranch({ id: b.id, name: b.name, whatsapp_number: b.whatsapp_number })
              }
            >
              Enquiry QR
            </Button>
            {me.data?.isSuper && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    id: b.id,
                    name: b.name,
                    address: b.address ?? "",
                    whatsapp_number: b.whatsapp_number ?? "",
                    support_number: b.support_number ?? "",
                    pickup_address: b.pickup_address ?? "",
                    collection_timing: b.collection_timing ?? "",
                    show_prices: b.show_prices,
                    next_opening_note: b.next_opening_note ?? "",
                    active: b.active,
                  })
                }
              >
                Edit
              </Button>
            )}
          </div>
        ))}
        {!branches.data?.length && (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">
            No branches yet — add your first one.
          </p>
        )}
      </section>

      <BranchQrDialog branch={qrBranch} onOpenChange={(o) => !o && setQrBranch(null)} />
    </div>
  );
}
