import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCatalog, saveItem, saveCategory, listSuppliers } from "@/lib/admin.functions";
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
import { toast } from "sonner";
import { categoryIcon, searchCategoryIcons } from "@/lib/category-icons";

export const Route = createFileRoute("/_authenticated/admin/items")({
  head: () => ({
    meta: [
      { title: "Catalogue | Fresh Nalla Kadai" },
      {
        name: "description",
        content: "Maintain the master list of produce, units, quantity limits and Tamil names.",
      },
      { property: "og:title", content: "Catalogue | Fresh Nalla Kadai" },
      { property: "og:description", content: "Master produce catalogue with units and limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CatalogPage,
});

const UNITS = ["Kg", "Gram", "Nos", "Litre", "Ml"] as const;

/** Default weight / quantity buttons offered per unit in the item master. */
const DEFAULT_WEIGHTS: Record<(typeof UNITS)[number], number[]> = {
  Kg: [0.25, 0.5, 0.75, 1, 2, 5],
  Gram: [100, 250, 500, 750, 1000],
  Nos: [1, 2, 3, 5, 10, 12],
  Litre: [0.5, 1, 2, 5],
  Ml: [100, 200, 500, 1000],
};

const EMPTY_ITEM = {
  id: undefined as string | undefined,
  name_en: "",
  name_ta: "",
  category_id: "",
  supplier_id: "",
  unit: "Kg" as (typeof UNITS)[number],
  presets: "0.25, 0.5, 1, 2",
  min_qty: "0.25",
  max_qty: "10",
  active: true,
};

const parsePresets = (s: string) =>
  s
    .split(",")
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

type CatDraft = { id?: string; name: string; name_ta: string; tint: string; icon: string };

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState("");
  const results = searchCategoryIcons(q);
  return (
    <div className="space-y-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search icons — greens, fruit, milk, spices…"
      />
      <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-xl border bg-card p-2 sm:grid-cols-10">
        {results.map(({ name, Icon }) => (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(name)}
            className={`grid aspect-square place-items-center rounded-lg border transition-colors ${
              value === name ? "border-primary bg-primary text-primary-foreground" : "bg-background"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.5} />
          </button>
        ))}
        {!results.length && (
          <p className="col-span-full py-3 text-center text-xs text-muted-foreground">
            No icon matches that word.
          </p>
        )}
      </div>
    </div>
  );
}

function CatalogPage() {
  const catalog = useQuery({ queryKey: ["catalog"], queryFn: () => listCatalog() });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: () => listSuppliers() });
  const [item, setItem] = useState<typeof EMPTY_ITEM | null>(null);
  const [cat, setCat] = useState<CatDraft | null>(null);

  async function submitItem() {
    if (!item) return;
    if (!item.category_id) return void toast.error("Choose a category.");
    try {
      await saveItem({
        data: {
          id: item.id,
          name_en: item.name_en,
          name_ta: item.name_ta,
          category_id: item.category_id,
          supplier_id: item.supplier_id || null,
          unit: item.unit,
          presets: parsePresets(item.presets).slice(0, 6),
          min_qty: Number(item.min_qty),
          max_qty: Number(item.max_qty),
          image_url: null,
          active: item.active,
        },
      });
      toast.success("Item saved");
      setItem(null);
      catalog.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submitCat() {
    if (!cat) return;
    await saveCategory({
      data: {
        id: cat.id,
        name: cat.name,
        name_ta: cat.name_ta,
        tint: cat.tint,
        icon: cat.icon,
        sort_order: catalog.data?.categories.length ?? 0,
        active: true,
      },
    });
    toast.success("Category saved");
    setCat(null);
    catalog.refetch();
  }

  const catName = new Map((catalog.data?.categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-3xl">Catalogue</h1>
        <Button
          variant="outline"
          onClick={() => setCat({ name: "", name_ta: "", tint: "#EAF3DD", icon: "leaf" })}
        >
          Add category
        </Button>
        <Button
          onClick={() =>
            setItem({ ...EMPTY_ITEM, category_id: catalog.data?.categories[0]?.id ?? "" })
          }
        >
          Add item
        </Button>
      </div>

      {cat && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="text-xl">{cat.id ? "Edit category" : "New category"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tamil name</Label>
              <Input
                className="ta"
                value={cat.name_ta}
                onChange={(e) => setCat({ ...cat, name_ta: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Section tint</Label>
              <Input value={cat.tint} onChange={(e) => setCat({ ...cat, tint: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Category icon</Label>
            <IconPicker value={cat.icon} onChange={(icon) => setCat({ ...cat, icon })} />
            <p className="text-xs text-muted-foreground">
              Chosen icon: <span className="font-medium">{cat.icon}</span> — this line icon appears
              on the customer app category tiles.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={submitCat}>Save category</Button>
            <Button variant="outline" onClick={() => setCat(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="flex flex-wrap gap-2">
        {(catalog.data?.categories ?? []).map((c) => {
          const Icon = categoryIcon((c as { icon?: string }).icon);
          return (
            <button
              key={c.id}
              onClick={() =>
                setCat({
                  id: c.id,
                  name: c.name,
                  name_ta: c.name_ta ?? "",
                  tint: c.tint ?? "#EAF3DD",
                  icon: (c as { icon?: string }).icon ?? "leaf",
                })
              }
              className="card-warm flex items-center gap-2 px-3 py-2 text-sm"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {c.name}
            </button>
          );
        })}
      </section>


      {item && (
        <section className="card-warm space-y-4 p-5">
          <h2 className="text-xl">{item.id ? "Edit item" : "New item"}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>English name</Label>
              <Input
                value={item.name_en}
                onChange={(e) => setItem({ ...item, name_en: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tamil name</Label>
              <Input
                className="ta"
                value={item.name_ta}
                onChange={(e) => setItem({ ...item, name_ta: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={item.category_id}
                onValueChange={(v) => setItem({ ...item, category_id: v })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {(catalog.data?.categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={item.unit}
                onValueChange={(v) => setItem({ ...item, unit: v as (typeof UNITS)[number] })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier / farm</Label>
              <Select
                value={item.supplier_id || "none"}
                onValueChange={(v) => setItem({ ...item, supplier_id: v === "none" ? "" : v })}
              >
                <SelectTrigger className="bg-card">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(suppliers.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Default weight buttons</Label>
              <div className="flex flex-wrap items-center gap-2">
                {DEFAULT_WEIGHTS[item.unit].map((w) => {
                  const chosen = parsePresets(item.presets);
                  const on = chosen.includes(w);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        const next = on
                          ? chosen.filter((c) => c !== w)
                          : [...chosen, w].sort((a, b) => a - b).slice(0, 6);
                        setItem({ ...item, presets: next.join(", ") });
                      }}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        on ? "bg-secondary text-secondary-foreground" : "bg-card"
                      }`}
                    >
                      {w} {item.unit}
                    </button>
                  );
                })}
              </div>
              <Input
                value={item.presets}
                onChange={(e) => setItem({ ...item, presets: e.target.value })}
                placeholder="Or type your own, comma separated"
              />
              <p className="text-xs text-muted-foreground">
                Up to 6 buttons. These appear as one-tap quantities on the customer app.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Minimum</Label>
                <Input
                  value={item.min_qty}
                  onChange={(e) => setItem({ ...item, min_qty: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum</Label>
                <Input
                  value={item.max_qty}
                  onChange={(e) => setItem({ ...item, max_qty: e.target.value })}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Minimum and maximum protect against unit mistakes — a customer cannot order 500 when
            they meant 0.5.
          </p>
          <div className="flex gap-2">
            <Button onClick={submitItem}>Save item</Button>
            <Button variant="outline" onClick={() => setItem(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      <section className="card-warm divide-y overflow-hidden">
        {(catalog.data?.items ?? []).map((it) => (
          <div key={it.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="w-52">
              <div className="font-medium">{it.name_en}</div>
              <div className="ta text-xs text-muted-foreground">{it.name_ta}</div>
            </div>
            <div className="text-muted-foreground">{catName.get(it.category_id)}</div>
            <div>{it.unit}</div>
            <div className="text-muted-foreground">
              {it.min_qty}–{it.max_qty} {it.unit}
            </div>
            {!it.active && <Badge variant="secondary">Inactive</Badge>}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() =>
                setItem({
                  id: it.id,
                  name_en: it.name_en,
                  name_ta: it.name_ta ?? "",
                  category_id: it.category_id,
                  supplier_id: it.supplier_id ?? "",
                  unit: it.unit as (typeof UNITS)[number],
                  presets: (it.presets ?? []).join(", "),
                  min_qty: String(it.min_qty),
                  max_qty: String(it.max_qty),
                  active: it.active,
                })
              }
            >
              Edit
            </Button>
          </div>
        ))}
        {!catalog.data?.items.length && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No items yet.</p>
        )}
      </section>
    </div>
  );
}
