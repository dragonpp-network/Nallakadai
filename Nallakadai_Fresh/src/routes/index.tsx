import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { lookupCustomer, getStore, submitOrder, getOrderHistory } from "@/lib/store.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  LayoutGrid,
  Minus,
  Plus,
  IndianRupee,
  Receipt,

  RotateCcw,
  Search,
  ShoppingBasket,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg.asset.json";
import { BrandSplit, BrandFooter } from "@/components/brand/BrandSplit";
import { categoryIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fresh Nalla Kadai — Order this week's fresh produce" },
      {
        name: "description",
        content:
          "Registered Fresh Nalla Kadai customers can order naturally grown vegetables, greens and fruits during the weekly ordering window.",
      },
      { property: "og:title", content: "Fresh Nalla Kadai — Order this week's fresh produce" },
      {
        property: "og:description",
        content: "Weekly ordering for naturally grown vegetables, greens and fruits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerApp,
});

const KEY = "nk.customer.mobile";
const money = (n: number) => `₹${n.toFixed(2)}`;
const round = (n: number) => Math.round(n * 1000) / 1000;

function loadMobile() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as
      | { mobile: string; until: number }
      | null;
    if (raw && raw.until > Date.now()) return raw.mobile;
  } catch {
    /* ignore */
  }
  return "";
}

type View = "home" | "browse" | "cart" | "history";

function CustomerApp() {
  const [mobile, setMobile] = useState("");
  const [entry, setEntry] = useState("");
  const [cart, setCart] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("home");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [editingLine, setEditingLine] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"Door Delivery" | "Customer Pickup">("Door Delivery");
  const [address, setAddress] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [confirmed, setConfirmed] = useState<{
    orderNo: string;
    deliveryDate: string | null;
    replacedOrderNo?: string | null;
  } | null>(null);

  useEffect(() => setMobile(loadMobile()), []);

  const lookup = useQuery({
    queryKey: ["lookup", mobile],
    queryFn: () => lookupCustomer({ data: { mobile } }),
    enabled: mobile.length >= 10,
  });
  const open = lookup.data?.status === "ok";
  const store = useQuery({
    queryKey: ["store", mobile],
    queryFn: () => getStore({ data: { mobile } }),
    enabled: open,
  });
  const history = useQuery({
    queryKey: ["history", mobile],
    queryFn: () => getOrderHistory({ data: { mobile } }),
    enabled: mobile.length >= 10 && view === "history",
  });

  useEffect(() => {
    if (lookup.data?.status !== "ok") return;
    setMode(lookup.data.customer.deliveryMode as typeof mode);
    setAddress(lookup.data.customer.address ?? "");
    setPreferredTime(lookup.data.customer.preferredTime ?? "");
  }, [lookup.data]);

  // The cart is deliberately NOT pre-filled from an existing order: once an
  // order is placed the cart stays empty until the customer chooses to change
  // it from their order history.

  const items = store.data?.items ?? [];
  const categories = store.data?.categories ?? [];
  const showPrices = lookup.data?.status === "ok" ? lookup.data.branch.showPrices : true;

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([itemId, raw]) => ({ item: items.find((i) => i.itemId === itemId), qty: Number(raw) }))
        .filter((l) => l.item && Number.isFinite(l.qty) && l.qty > 0),
    [cart, items],
  );
  const total = lines.reduce((t, l) => t + l.qty * (l.item?.price ?? 0), 0);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (activeCat === "all" || i.categoryId === activeCat) &&
        (!q || i.nameEn.toLowerCase().includes(q) || (i.nameTa ?? "").toLowerCase().includes(q)),
    );
  }, [items, activeCat, search]);

  function signIn(e: React.FormEvent) {
    e.preventDefault();
    const digits = entry.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return void toast.error("Enter your 10-digit mobile number.");
    localStorage.setItem(KEY, JSON.stringify({ mobile: digits, until: Date.now() + 30 * 864e5 }));
    setMobile(digits);
  }

  function forget() {
    localStorage.removeItem(KEY);
    setMobile("");
    setEntry("");
    setCart({});
    setConfirmed(null);
    setView("home");
  }

  function setQty(itemId: string, v: string) {
    setCart((c) => ({ ...c, [itemId]: v }));
  }

  function removeLine(itemId: string) {
    setCart((c) => {
      const next = { ...c };
      delete next[itemId];
      return next;
    });
  }

  function repeatLast() {
    const last = store.data?.lastOrder;
    if (!last?.length) return;
    const next = { ...cart };
    let skipped = 0;
    for (const l of last) {
      if (items.some((i) => i.itemId === l.itemId && !i.soldOut)) next[l.itemId] = String(l.qty);
      else skipped++;
    }
    setCart(next);
    toast.success(
      skipped ? `Repeated last order — ${skipped} item(s) unavailable` : "Last order added",
    );
  }

  function changeOrder(o: { lines: { itemId: string; qty: number }[]; preferredTime: string }) {
    const next: Record<string, string> = {};
    let skipped = 0;
    for (const l of o.lines) {
      if (items.some((i) => i.itemId === l.itemId)) next[l.itemId] = String(l.qty);
      else skipped++;
    }
    setCart(next);
    if (o.preferredTime) setPreferredTime(o.preferredTime);
    setNote(store.data?.current?.note ?? "");
    setView("cart");
    if (skipped) toast.message(`${skipped} item(s) are no longer available this cycle.`);
  }

  async function place() {
    if (!lookup.data || lookup.data.status !== "ok") return;
    if (!lines.length) return void toast.error("Add at least one item.");
    for (const l of lines) {
      const it = l.item!;
      if (l.qty < it.min || l.qty > it.max)
        return void toast.error(
          `${it.nameEn} is sold in ${it.unit.toLowerCase()}. Enter between ${it.min} and ${it.max} ${it.unit.toLowerCase()}.`,
        );
    }
    if (mode === "Door Delivery" && address.trim().length < 8)
      return void toast.error("Please give a delivery address.");
    if (mode === "Door Delivery" && !preferredTime.trim())
      return void toast.error("Please choose your preferred delivery time.");
    try {
      const res = await submitOrder({
        data: {
          mobile,
          cycleId: lookup.data.cycle.id,
          deliveryMode: mode,
          address,
          note,
          preferredTime: mode === "Door Delivery" ? preferredTime : "",
          lines: lines.map((l) => ({ itemId: l.item!.itemId, qty: l.qty })),
        },
      });
      setConfirmed(res);
      setCart({});
      setNote("");
      store.refetch();
      history.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  /* ---------------------------------------------------------------- states */

  const brand = {
    variant: "village" as const,
    eyebrow: "Authentic herbal goodness",
    headline: "Order fresh from the farm",
    tamil: "நல்ல கடை — வாரந்தோறும் இயற்கை காய்கறிகள்",
  };

  if (!mobile)
    return (
      <BrandSplit {...brand}>
        <form onSubmit={signIn} className="glass w-full space-y-4 bg-card/90 p-6">
          <div>
            <h2 className="text-2xl">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in with your registered mobile number.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m">Your mobile number</Label>
            <Input
              id="m"
              inputMode="numeric"
              placeholder="10-digit mobile"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="text-lg"
            />
          </div>
          <Button type="submit" className="h-12 w-full text-base">
            Continue
          </Button>
          <p className="text-xs text-muted-foreground">
            Ordering is open to registered customers. We remember you on this device for 30 days.
          </p>
        </form>
      </BrandSplit>
    );

  if (lookup.isLoading)
    return (
      <BrandSplit {...brand}>
        <p className="py-20 text-center text-primary-foreground/80">Checking your number…</p>
      </BrandSplit>
    );

  if (lookup.data?.status === "alt")
    return (
      <BrandSplit {...brand}>
        <div className="glass mx-auto max-w-sm space-y-3 bg-card/90 p-6 text-center">
          <h1 className="text-2xl">Use your main number</h1>
          <p className="text-sm text-muted-foreground">
            This is registered as an alternate contact number. Please sign in with your main mobile
            number ending {lookup.data.primaryHint.slice(-2)}.
          </p>
          <button className="block w-full text-sm underline" onClick={forget}>
            Try another number
          </button>
        </div>
      </BrandSplit>
    );

  if (lookup.data?.status === "unknown")
    return (
      <BrandSplit {...brand}>
        <div className="glass mx-auto max-w-sm space-y-3 bg-card/90 p-6 text-center">
          <h1 className="text-2xl">We could not find you</h1>
          <p className="text-sm text-muted-foreground">
            This number is not registered yet. Message the store and our team will add you.
          </p>
          {lookup.data.whatsapp && (
            <a
              className="inline-block rounded-md bg-secondary px-4 py-2 text-secondary-foreground"
              href={`https://wa.me/${lookup.data.whatsapp.replace(/\D/g, "")}`}
            >
              Message on WhatsApp
            </a>
          )}
          <button className="block w-full text-sm underline" onClick={forget}>
            Try another number
          </button>
        </div>
      </BrandSplit>
    );

  if (lookup.data?.status === "closed")
    return (
      <BrandSplit {...brand}>
        <div className="glass mx-auto max-w-sm space-y-3 bg-card/90 p-6 text-center">
          <h1 className="text-2xl">Ordering is closed</h1>
          <p className="text-sm text-muted-foreground">
            Vanakkam {lookup.data.name}, this week's window has closed.
            {lookup.data.nextOpening ? ` ${lookup.data.nextOpening}` : ""}
          </p>
          {lookup.data.support && (
            <a className="block underline" href={`tel:${lookup.data.support}`}>
              Call the store: {lookup.data.support}
            </a>
          )}
          <button className="block w-full text-sm underline" onClick={forget}>
            Use a different number
          </button>
        </div>
      </BrandSplit>
    );

  const branch = lookup.data?.status === "ok" ? lookup.data.branch : null;
  const cycle = lookup.data?.status === "ok" ? lookup.data.cycle : null;
  const customerName = lookup.data?.status === "ok" ? lookup.data.customer.name : "";
  const deliveryDate = confirmed?.deliveryDate ?? cycle?.deliveryDate ?? null;

  const countByCat = new Map<string, number>();
  for (const it of items) countByCat.set(it.categoryId, (countByCat.get(it.categoryId) ?? 0) + 1);

  const shell = (children: React.ReactNode) => (
    <Shell
      name={customerName}
      onForget={forget}
      view={view}
      onView={setView}
      cartCount={lines.length}
    >
      {children}
    </Shell>
  );

  /* ------------------------------------------------------------ history */

  if (view === "history")
    return shell(
      <div className="space-y-4">
        <SectionTitle title="Order history" tamil="என் ஆர்டர்கள்" />
        {history.isLoading && <p className="text-sm text-muted-foreground">Loading your orders…</p>}
        {history.data && !history.data.orders.length && (
          <div className="glass p-8 text-center text-sm text-muted-foreground">
            You have not placed any orders yet.
          </div>
        )}
        {(history.data?.orders ?? []).map((o) => (
          <article key={o.id} className="glass overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 bg-accent px-4 py-3">
              <div className="mr-auto min-w-0">
                <div className="font-medium">{o.orderNo}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {o.cycleNo ? ` · Cycle ${o.cycleNo}` : ""}
                </div>
              </div>
              <Badge variant={o.status === "Placed" ? "default" : "secondary"}>{o.status}</Badge>
            </header>
            <ul className="divide-y">
              {o.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="mr-auto min-w-0 truncate">
                    {l.nameEn}
                    {l.nameTa ? <span className="ta ml-2 text-muted-foreground">{l.nameTa}</span> : null}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {l.qty} {l.unit}
                  </span>
                  {showPrices && (
                    <span className="w-20 shrink-0 text-right">{money(l.qty * l.price)}</span>
                  )}
                </li>
              ))}
            </ul>
            <footer className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Truck className="h-4 w-4" strokeWidth={1.5} /> {o.deliveryMode}
                {o.preferredTime ? ` · ${o.preferredTime}` : ""}
              </span>
              {showPrices && <span className="ml-auto font-medium">{money(o.total)}</span>}
            </footer>
            {o.status === "Placed" && store.data?.current?.id === o.id && (
              <div className="border-t px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => changeOrder(o)}
                >
                  <RotateCcw className="mr-1 h-4 w-4" strokeWidth={1.5} /> Change this order
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Changing issues a new order number and cancels this one. The store is notified.
                </p>
              </div>
            )}
          </article>
        ))}
      </div>,
    );

  /* --------------------------------------------------------------- cart */

  if (view === "cart")
    return shell(
      <div className="space-y-4">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground"
          onClick={() => setView("browse")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to shopping
        </button>
        <SectionTitle title="Your cart" tamil="கூடை" />

        {!lines.length && (
          <div className="glass p-8 text-center text-sm text-muted-foreground">
            Your cart is empty.
          </div>
        )}

        <div className="space-y-2">
          {lines.map((l) => {
            const it = l.item!;
            const editing = editingLine === it.itemId;
            const raw = cart[it.itemId] ?? "";
            const bad = Number(raw) < it.min || Number(raw) > it.max;
            const Icon = categoryIcon(categories.find((c) => c.id === it.categoryId)?.icon);
            return (
              <div key={it.itemId} className="glass p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <div className="mr-auto min-w-0">
                    <div className="truncate font-medium">{it.nameEn}</div>
                    <div className="ta truncate text-sm text-muted-foreground">{it.nameTa}</div>
                    <div className="text-sm text-muted-foreground">
                      {l.qty} {it.unit}
                      {showPrices ? ` · ${money(l.qty * it.price)}` : ""}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={editing ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={() => setEditingLine(editing ? null : it.itemId)}
                  >
                    {editing ? "Done" : "Edit"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-destructive"
                    onClick={() => removeLine(it.itemId)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Remove</span>
                  </Button>
                </div>
                {editing && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <QtyControl item={it} value={raw} onChange={(v) => setQty(it.itemId, v)} />
                    {bad && (
                      <p className="text-sm text-destructive">
                        Enter between {it.min} and {it.max} {it.unit.toLowerCase()}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!!lines.length && (
          <div className="glass space-y-4 p-4">
            {showPrices && (
              <div className="flex justify-between text-lg font-medium">
                <span>Tentative total</span>
                <span>{money(total)}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>How would you like it?</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["Door Delivery", "Customer Pickup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-2xl border px-3 py-3 text-sm transition-colors ${
                      mode === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-accent"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {mode === "Door Delivery" ? (
              <>
                <div className="space-y-2">
                  <Label>Delivery address</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} />
                  {lookup.data?.status === "ok" && lookup.data.customer.mapLink && (
                    <p className="text-xs text-muted-foreground">
                      Your saved map location is shared with the delivery rider automatically.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Preferred delivery time</Label>
                  <div className="flex flex-wrap gap-2">
                    {["7–9 am", "9–11 am", "4–6 pm", "6–8 pm"].map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setPreferredTime(slot)}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          preferredTime === slot
                            ? "border-secondary bg-secondary text-secondary-foreground"
                            : "bg-card hover:bg-accent"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {slot}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or type a time that suits you"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <p className="rounded-2xl bg-muted p-3 text-sm">
                Collect from {branch?.pickupAddress} · {branch?.collectionTiming}
              </p>
            )}

            <div className="space-y-2">
              <Label>Note for the store (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <Button className="h-12 w-full rounded-2xl text-base" onClick={place}>
              {store.data?.current ? "Confirm changed order" : "Place order"}
              {showPrices ? ` · ${money(total)}` : ""}
            </Button>
          </div>
        )}

        <ConfirmDialog
          confirmed={confirmed}
          deliveryDate={deliveryDate}
          onClose={() => {
            setConfirmed(null);
            setView("home");
          }}
        />
      </div>,
    );

  /* --------------------------------------------------------------- home */

  if (view === "home")
    return shell(
      <div className="space-y-6">
        <section className="glass-dark relative overflow-hidden p-5 text-primary-foreground">
          <span className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-secondary/25 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary-foreground/55">
                Vanakkam
              </p>
              <h1 className="truncate text-xl leading-tight lg:text-2xl">{customerName}</h1>
              <p className="ta text-xs text-primary-foreground/70">இயற்கை உணவு, நேரடி விவசாயி</p>
            </div>
            <span className="ml-auto shrink-0 rounded-full bg-secondary/90 px-3 py-1 text-[11px] text-secondary-foreground">
              Cycle {cycle?.cycleNo}
            </span>
          </div>
          <div className="relative mt-3 flex flex-wrap gap-1.5 text-[11px] text-primary-foreground/85">
            <span className="rounded-full bg-primary-foreground/10 px-2.5 py-1">{branch?.name}</span>
            {cycle?.closeAt && (
              <span className="flex items-center gap-1 rounded-full bg-primary-foreground/10 px-2.5 py-1">
                <Clock className="h-3 w-3" strokeWidth={1.5} />
                Closes{" "}
                {new Date(cycle.closeAt).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full px-4"
              onClick={() => {
                setActiveCat("all");
                setView("browse");
              }}
            >
              Start ordering <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.75} />
            </Button>
            {!!store.data?.lastOrder?.length && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full border border-primary-foreground/25 px-4 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => {
                  repeatLast();
                  setView("cart");
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" strokeWidth={1.5} /> Repeat last
              </Button>
            )}
          </div>
          {store.data?.current && (
            <p className="relative mt-3 text-xs text-primary-foreground/80">
              Order {store.data.current.orderNo} is placed for this cycle. To change it, open Orders
              — a new order number is issued and the old one is cancelled.
            </p>
          )}
        </section>


        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            if (v) {
              setActiveCat("all");
              setView("browse");
            }
          }}
        />

        <section className="space-y-3">
          <SectionTitle title="Shop by category" tamil="வகைகள்" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {categories
              .filter((c) => (countByCat.get(c.id) ?? 0) > 0)
              .map((c) => {
                const Icon = categoryIcon(c.icon);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCat(c.id);
                      setSearch("");
                      setView("browse");
                    }}
                    className="glass-tint group flex items-center gap-3 p-3 text-left transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: c.tint
                        ? `color-mix(in oklab, ${c.tint} 62%, transparent)`
                        : undefined,
                    }}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card/70 text-primary ring-1 ring-border/60 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-5 w-5" strokeWidth={1.25} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                      {c.nameTa && (
                        <span className="ta block truncate text-[11px] text-ink-soft">
                          {c.nameTa}
                        </span>
                      )}
                      <span className="block text-[11px] text-ink-soft">
                        {countByCat.get(c.id)} items
                      </span>
                    </span>
                  </button>
                );
              })}
            <button
              onClick={() => {
                setActiveCat("all");
                setView("browse");
              }}
              className="glass-tint flex items-center gap-3 border-dashed p-3 text-left"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card/70 text-secondary ring-1 ring-border/60">
                <LayoutGrid className="h-5 w-5" strokeWidth={1.25} />
              </span>
              <span>
                <span className="block text-sm font-medium">Everything</span>
                <span className="block text-[11px] text-ink-soft">{items.length} items</span>
              </span>
            </button>
          </div>
        </section>

      </div>,
    );

  /* ------------------------------------------------------------- browse */

  return shell(
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          className="grid h-10 w-10 place-items-center rounded-full border bg-card"
          onClick={() => setView("home")}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {[{ id: "all", name: "All", nameTa: "", icon: "grid" }, ...categories].map((c) => {
          const Icon = categoryIcon(c.icon);
          const on = activeCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                on
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "glass-chip text-ink hover:text-primary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((it) => {
          const raw = cart[it.itemId] ?? "";
          const inCart = Number(raw) > 0;
          const cat = categories.find((c) => c.id === it.categoryId);
          const Icon = categoryIcon(cat?.icon);
          return (
            <article
              key={it.itemId}
              className={`glass flex flex-col overflow-hidden p-3 transition-colors ${
                inCart ? "ring-1 ring-secondary/60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary ring-1 ring-border/60"
                  style={{
                    backgroundColor: cat?.tint
                      ? `color-mix(in oklab, ${cat.tint} 70%, transparent)`
                      : undefined,
                  }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.25} />
                </span>
                <div className="mr-auto min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{it.nameEn}</div>
                  <div className="ta truncate text-xs text-ink-soft">{it.nameTa}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-soft">
                    {showPrices && (
                      <>
                        <IndianRupee className="h-3 w-3" strokeWidth={1.75} />
                        {it.price.toFixed(2)} / {it.unit} ·{" "}
                      </>
                    )}
                    {it.min}–{it.max} {it.unit}
                  </div>
                </div>
                {it.soldOut ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    Sold out
                  </span>
                ) : inCart ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                    <Check className="h-3 w-3" strokeWidth={2} /> Added
                  </span>
                ) : null}
              </div>
              {!it.soldOut && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {it.presets.map((p) => (
                      <button
                        key={p}
                        onClick={() => setQty(it.itemId, String(p))}
                        className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                          Number(raw) === p
                            ? "bg-secondary text-secondary-foreground"
                            : "glass-chip text-ink hover:text-primary"
                        }`}
                      >
                        {p} {it.unit}
                      </button>
                    ))}
                  </div>
                  <QtyControl
                    item={it}
                    value={raw}
                    onChange={(v) => setQty(it.itemId, v)}
                    onRemove={() => removeLine(it.itemId)}
                  />
                </div>
              )}
            </article>
          );
        })}
        {!visible.length && (
          <p className="glass p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            Nothing matches that search in this cycle.
          </p>
        )}
      </div>


      <ConfirmDialog
        confirmed={confirmed}
        deliveryDate={deliveryDate}
        onClose={() => setConfirmed(null)}
      />
    </div>,
  );
}

/* ------------------------------------------------------------------ pieces */

function SectionTitle({ title, tamil }: { title: string; tamil?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-xl">{title}</h2>
      {tamil && <span className="ta text-xs text-muted-foreground">{tamil}</span>}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search
        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.5}
      />
      <Input
        className="glass h-11 border-0 pl-11 text-sm placeholder:text-muted-foreground/80 focus-visible:ring-1 focus-visible:ring-secondary"
        placeholder="Search here…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}


type ShopItem = {
  itemId: string;
  nameEn: string;
  nameTa: string;
  unit: string;
  min: number;
  max: number;
  price: number;
  presets: number[];
  soldOut: boolean;
  categoryId: string;
};

function QtyControl({
  item,
  value,
  onChange,
  onRemove,
}: {
  item: ShopItem;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
}) {
  const qty = Number(value);
  const step = item.min || 1;
  const bad = value !== "" && (!Number.isFinite(qty) || qty < item.min || qty > item.max);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="glass-chip flex items-center">
          <button
            className="px-2.5 py-1.5 text-ink-soft disabled:opacity-40"
            disabled={!qty}
            onClick={() => {
              const next = round(Math.max(item.min, (qty || step) - step));
              onChange(String(next));
            }}
            aria-label="Decrease"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <input
            inputMode="decimal"
            placeholder="Qty"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 bg-transparent px-1 py-1.5 text-center text-sm outline-none"
          />
          <button
            className="px-2.5 py-1.5 text-primary"
            onClick={() => onChange(String(round(Math.min(item.max, (qty || 0) + step))))}
            aria-label="Increase"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{item.unit}</span>
        {onRemove && qty > 0 && (
          <button
            className="ml-auto text-xs text-muted-foreground underline underline-offset-2"
            onClick={onRemove}
          >
            Remove
          </button>
        )}
      </div>
      {bad && (
        <p className="text-xs text-destructive">
          {item.nameEn} is sold in {item.unit.toLowerCase()}. Enter between {item.min} and{" "}
          {item.max} {item.unit.toLowerCase()}.
        </p>
      )}
    </div>

  );
}

function ConfirmDialog({
  confirmed,
  deliveryDate,
  onClose,
}: {
  confirmed: { orderNo: string; deliveryDate: string | null; replacedOrderNo?: string | null } | null;
  deliveryDate: string | null;
  onClose: () => void;
}) {
  const date = deliveryDate
    ? new Date(deliveryDate).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "the next delivery day";
  return (
    <Dialog open={!!confirmed} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl">Order placed</DialogTitle>
          <DialogDescription>
            It will be processed on {date}. Thank you.
            {confirmed ? ` (Order ${confirmed.orderNo})` : ""}
            {confirmed?.replacedOrderNo
              ? ` Your earlier order ${confirmed.replacedOrderNo} has been cancelled.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-muted p-3 text-sm">
          <div className="font-medium">Terms &amp; conditions</div>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Products subject to availability.</li>
            <li>Prices may slightly vary.</li>
          </ol>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Shell({
  children,
  name,
  onForget,
  view,
  onView,
  cartCount,
}: {
  children: React.ReactNode;
  name?: string;
  onForget?: () => void;
  view: View;
  onView: (v: View) => void;
  cartCount: number;
}) {
  const tabs: { id: View; label: string; Icon: typeof ShoppingBasket }[] = [
    { id: "home", label: "Home", Icon: LayoutGrid },
    { id: "browse", label: "Shop", Icon: Search },
    { id: "cart", label: "Cart", Icon: ShoppingBasket },
    { id: "history", label: "Orders", Icon: IndianRupee },
  ];
  return (
    <div className="app-canvas flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 px-3 pt-3">
        <div className="glass-dark mx-auto grid max-w-4xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-primary-foreground">
          <img
            src={logo.url}
            alt="Nalla Kadai logo"
            className="h-8 w-auto shrink-0 rounded-lg object-contain"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-base">Fresh Nalla Kadai</div>
            <div className="ta truncate text-[11px] text-primary-foreground/65">
              {name ? `நல்ல கடை · ${name}` : "நல்ல கடை"}
            </div>
          </div>
          {onForget && (
            <button
              className="shrink-0 rounded-full border border-primary-foreground/25 px-3 py-1 text-[11px]"
              onClick={onForget}
            >
              Not you?
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
        <div className="mx-auto flex max-w-sm items-center gap-1 rounded-full border border-border/50 bg-card/60 p-1 shadow-[var(--shadow-lift)] backdrop-blur-xl">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onView(id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] transition-colors ${
                view === id
                  ? "bg-primary text-primary-foreground"
                  : "text-ink-soft hover:text-primary"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {label}
              {id === "cart" && cartCount > 0 && (
                <span className="absolute right-1.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] text-ink">
                  {cartCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <div className="bg-primary pb-20">
        <BrandFooter />
      </div>
    </div>
  );
}

