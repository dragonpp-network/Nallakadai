import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { listCustomers, saveCustomer, importCustomers, listBranches } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBranchScope } from "@/lib/branch-context";
import { csv, download } from "@/lib/csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers | Fresh Nalla Kadai" },
      {
        name: "description",
        content: "Add, edit and bulk import the approved customers allowed to place orders.",
      },
      { property: "og:title", content: "Customers | Fresh Nalla Kadai" },
      { property: "og:description", content: "Manage approved ordering customers per branch." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomersPage,
});

const EMPTY = {
  id: undefined as string | undefined,
  name: "",
  mobile: "",
  alt_mobile: "",
  branch_id: "",
  delivery_mode: "Door Delivery" as "Door Delivery" | "Customer Pickup",
  address: "",
  area: "",
  map_link: "",
  preferred_delivery_time: "",
  active: true,
};

type ImportRow = {
  name: string;
  mobile: string;
  alt_mobile: string;
  area: string;
  address: string;
  delivery_mode: string;
};

type Rejected = { row: number; name: string; mobile: string; reason: string };

const TEMPLATE = "name,mobile,alt_mobile,area,address,delivery_mode";

function splitLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseRows(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const first = splitLine(lines[0]!).map((c) => c.trim().toLowerCase());
  const hasHeader = first.includes("mobile") || first.includes("name");
  const cols = hasHeader ? first : ["name", "mobile", "alt_mobile", "area", "address", "delivery_mode"];
  const idx = (k: string) => cols.indexOf(k);
  return lines.slice(hasHeader ? 1 : 0).map((line) => {
    const c = splitLine(line).map((v) => v.trim().replace(/^"|"$/g, ""));
    const at = (k: string, fallback: number) => {
      const i = idx(k);
      return (i >= 0 ? c[i] : c[fallback]) ?? "";
    };
    return {
      name: at("name", 0),
      mobile: at("mobile", 1),
      alt_mobile: at("alt_mobile", 2),
      area: at("area", 3),
      address: at("address", 4),
      delivery_mode: /pickup/i.test(at("delivery_mode", 5)) ? "Customer Pickup" : "Door Delivery",
    };
  });
}

function CustomersPage() {
  const [q, setQ] = useState("");
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [paste, setPaste] = useState("");
  const [importBranch, setImportBranch] = useState("");
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { branchId } = useBranchScope();
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => listBranches() });
  const customers = useQuery({
    queryKey: ["customers", q, branchId],
    queryFn: () => listCustomers({ data: branchId ? { q, branchId } : { q } }),
  });

  function openEdit(c: {
    id: string;
    name: string;
    mobile: string;
    alt_mobile: string | null;
    branch_id: string;
    delivery_mode: string;
    address: string | null;
    area: string | null;
    map_link?: string | null;
    preferred_delivery_time?: string | null;
    active: boolean;
  }) {
    setForm({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      alt_mobile: c.alt_mobile ?? "",
      branch_id: c.branch_id,
      delivery_mode: c.delivery_mode as "Door Delivery" | "Customer Pickup",
      address: c.address ?? "",
      area: c.area ?? "",
      map_link: c.map_link ?? "",
      preferred_delivery_time: c.preferred_delivery_time ?? "",
      active: c.active,
    });
  }

  async function submit() {
    if (!form) return;
    if (!form.name.trim()) return void toast.error("Name is required.");
    if (form.mobile.replace(/\D/g, "").length < 10)
      return void toast.error("Enter a valid 10-digit mobile number.");
    if (!form.branch_id) return void toast.error("Choose a branch.");
    if (form.delivery_mode === "Door Delivery" && !form.address.trim())
      return void toast.error("A delivery address is required for door delivery.");
    setBusy(true);
    try {
      const res = await saveCustomer({ data: { ...form, alt_mobile: form.alt_mobile || null } });
      if ("duplicate" in res && res.duplicate) {
        const dup = res.duplicate;
        toast.error(`${dup.mobile} is already registered as ${dup.name}.`, {
          action: {
            label: "Open record",
            onClick: () => {
              setQ(dup.mobile);
              setForm(null);
            },
          },
        });
        return;
      }
      toast.success("Customer saved");
      setForm(null);
      customers.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runImport(text: string) {
    if (!importBranch) return void toast.error("Choose a branch for the import.");
    const rows = parseRows(text);
    if (!rows.length) return void toast.error("No rows found in the file.");
    setBusy(true);
    try {
      const res = await importCustomers({ data: { branchId: importBranch, rows } });
      setRejected(res.errors as Rejected[]);
      toast.success(`Imported ${res.imported}. Rejected ${res.errors.length}.`);
      setPaste("");
      customers.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="font-display text-3xl">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Customers cannot self-register. Call to confirm details, then create the record here.
          </p>
        </div>
        <Input
          placeholder="Search name or mobile"
          className="w-60 bg-card"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          onClick={() => setForm({ ...EMPTY, branch_id: branchId || branches.data?.[0]?.id || "" })}
        >
          Add customer
        </Button>
      </div>

      {form && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="font-display text-xl">{form.id ? "Edit customer" : "New customer"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Full name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Mobile number * (login, unique)</Label>
              <Input
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alternate mobile (contact only)</Label>
              <Input
                inputMode="numeric"
                placeholder="Optional"
                value={form.alt_mobile}
                onChange={(e) => setForm({ ...form, alt_mobile: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Used for calls and WhatsApp only. Customers cannot sign in with this number.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Branch *</Label>
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
              <Label>Default delivery mode *</Label>
              <Select
                value={form.delivery_mode}
                onValueChange={(v) =>
                  setForm({ ...form, delivery_mode: v as typeof form.delivery_mode })
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
              <Label>Area or landmark</Label>
              <Input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>
                Delivery address {form.delivery_mode === "Door Delivery" ? "*" : "(optional)"}
              </Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Map location link</Label>
              <Input
                placeholder="Paste a Google Maps pin link"
                value={form.map_link}
                onChange={(e) => setForm({ ...form, map_link: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Saved once here and forwarded to the Rapido / Porter rider with every delivery — the
                customer is never asked again.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Preferred delivery time</Label>
              <Input
                placeholder="e.g. 6–8 pm"
                value={form.preferred_delivery_time}
                onChange={(e) => setForm({ ...form, preferred_delivery_time: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              Customer active (deactivating keeps order history)
            </label>
          </div>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy}>
              Save
            </Button>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="card-warm divide-y overflow-hidden">
        {(customers.data ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="w-48">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.area || "No area"}</div>
            </div>
            <div className="w-44 text-muted-foreground">
              {c.mobile}
              {c.alt_mobile ? (
                <div className="text-xs">alt {c.alt_mobile}</div>
              ) : null}
            </div>
            <div className="text-muted-foreground">
              {(c.branches as { name: string } | null)?.name}
            </div>
            <Badge variant="outline">{c.delivery_mode}</Badge>
            {!c.active && <Badge variant="secondary">Inactive</Badge>}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" asChild>
                <a href={`tel:${c.mobile}`}>Call</a>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a
                  href={`https://wa.me/91${c.mobile.replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                Edit
              </Button>
            </div>
          </div>
        ))}
        {!customers.data?.length && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No customers found.</p>
        )}
      </section>

      <section className="card-warm space-y-3 p-5">
        <h2 className="font-display text-xl">Bulk import</h2>
        <p className="text-sm text-muted-foreground">
          Upload a CSV (or paste rows) with columns: <code>{TEMPLATE}</code>. A header row is
          optional. Duplicate or invalid rows are rejected and listed below.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={importBranch} onValueChange={setImportBranch}>
            <SelectTrigger className="w-64 bg-card">
              <SelectValue placeholder="Import into branch" />
            </SelectTrigger>
            <SelectContent>
              {(branches.data ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await runImport(await file.text());
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            Upload CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              download(
                "customer-import-template.csv",
                csv([
                  TEMPLATE.split(","),
                  ["Muthu Selvam", "9876543210", "", "Perundurai Road", "12 Kongu Nagar", "Door Delivery"],
                ]),
              )
            }
          >
            Download template
          </Button>
        </div>
        <Textarea
          rows={5}
          placeholder="…or paste rows here"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <Button disabled={busy || !paste.trim()} onClick={() => runImport(paste)}>
          Import pasted rows
        </Button>

        {rejected.length > 0 && (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium">Rejected rows ({rejected.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  download(
                    "rejected-customers.csv",
                    csv([
                      ["row", "name", "mobile", "reason"],
                      ...rejected.map((r) => [r.row, r.name, r.mobile, r.reason]),
                    ]),
                  )
                }
              >
                Download error report
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejected([])}>
                Clear
              </Button>
            </div>
            <div className="max-h-56 overflow-auto text-sm">
              {rejected.map((r) => (
                <div key={r.row} className="flex gap-3 border-b py-1 last:border-0">
                  <span className="w-10 text-muted-foreground">#{r.row}</span>
                  <span className="w-40">{r.name || "—"}</span>
                  <span className="w-32 text-muted-foreground">{r.mobile || "—"}</span>
                  <span className="text-destructive">{r.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
