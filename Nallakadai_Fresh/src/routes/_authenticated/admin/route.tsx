import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminMe } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { clearPinLock } from "@/lib/pin-lock";
import { BranchScopeContext } from "@/lib/branch-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminShell,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-2xl">Back office unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <a href="/auth" className="mt-6 inline-block underline">
        Back to sign in
      </a>
    </div>
  ),
});

const NAV: { group: string; items: { to: string; label: string; exact?: boolean }[] }[] = [
  {
    group: "Operate",
    items: [
      { to: "/admin", label: "Dashboard", exact: true },
      { to: "/admin/cycles", label: "Cycles" },
      { to: "/admin/availability", label: "Cycle Availability" },
      { to: "/admin/orders", label: "Orders" },
      { to: "/admin/farm-order", label: "Farm Order" },
      { to: "/admin/order-sheets", label: "Order Sheets" },
      { to: "/admin/non-collection", label: "Non-collection" },
      { to: "/admin/customers", label: "Customers" },
    ],
  },
  {
    group: "Configure",
    items: [
      { to: "/admin/items", label: "Master Items" },
      { to: "/admin/suppliers", label: "Suppliers" },
      { to: "/admin/branches", label: "Branches" },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/admin/reports", label: "Reports" },
      { to: "/admin/audit", label: "Audit Log" },
    ],
  },
];

function AdminShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const { data: me } = useQuery({ queryKey: ["adminMe"], queryFn: () => adminMe() });

  useEffect(() => {
    if (me && !me.isSuper && me.branchId) setBranchId(me.branchId);
  }, [me]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    clearPinLock();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const branches = me?.branches ?? [];
  const scopeLabel = branchId ? branches.find((b) => b.id === branchId)?.name : "All branches";

  return (
    <BranchScopeContext.Provider
      value={{ branchId, setBranchId, branches, isSuper: !!me?.isSuper }}
    >
      <div className="min-h-screen bg-background md:flex">
        <aside
          className={`no-print fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r bg-card transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-start gap-3 px-5 py-5">
            <img src={logo.url} alt="Nalla Kadai logo" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <div className="font-display text-xl text-primary">நல்ல கடை</div>
              <div className="text-xs text-muted-foreground">{me?.label ?? "Back office"}</div>
              <span className="mt-1 inline-block rounded-full bg-secondary/25 px-2 py-0.5 text-[11px] text-secondary-foreground">
                {me ? (me.isSuper ? "Super Admin" : "Branch Admin") : "…"}
              </span>
            </div>
            <button
              className="ml-auto md:hidden"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2 border-y px-5 py-4">
            <Select
              value={branchId || "all"}
              onValueChange={(v) => setBranchId(v === "all" ? "" : v)}
              disabled={!me?.isSuper}
            >
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {me?.isSuper && <SelectItem value="all">All branches</SelectItem>}
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <nav className="px-3 py-4">
            {NAV.map((g) => (
              <div key={g.group} className="mb-4">
                <div className="px-2 pb-1 text-[11px] tracking-widest text-muted-foreground uppercase">
                  {g.group}
                </div>
                {g.items.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: n.exact ?? false }}
                    className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted data-[status=active]:bg-secondary/20 data-[status=active]:font-medium data-[status=active]:text-primary"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="px-5 pb-6">
            <Button size="sm" variant="outline" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <div className="min-w-0 flex-1">
          <header className="no-print flex items-center gap-3 px-4 py-3 md:px-8">
            <button className="md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <span className="ml-auto text-sm text-muted-foreground">{scopeLabel}</span>
          </header>
          <main className="px-4 pb-12 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </BranchScopeContext.Provider>
  );
}
