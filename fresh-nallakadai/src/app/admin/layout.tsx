"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  ShoppingBag,
  Tractor,
  FileSpreadsheet,
  Users,
  Package,
  AlertTriangle,
  Building2,
  BarChart3,
  History,
  LogOut,
  Menu,
  X,
  UserCog,
  FolderTree,
  Award,
  Store,
  TicketPercent,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Backup & Restore", href: "/admin/backup", icon: Database },
  { label: "Cycles", href: "/admin/cycles", icon: Calendar },
  { label: "Availability", href: "/admin/availability", icon: Layers },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Vendor Order", href: "/admin/farm-order", icon: Tractor },
  { label: "Order Sheets", href: "/admin/order-sheets", icon: FileSpreadsheet },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Brand Partners", href: "/admin/brands", icon: Award },
  { label: "Store Operators", href: "/admin/users", icon: UserCog },
  { label: "Master Items", href: "/admin/items", icon: Package },
  { label: "Coupons & Offers", href: "/admin/coupons", icon: TicketPercent },
  { label: "Non-Collection", href: "/admin/non-collection", icon: AlertTriangle },
  { label: "Branches", href: "/admin/branches", icon: Building2 },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Audit Log", href: "/admin/audit", icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nk_admin_user");
      if (saved) {
        setAdminUser(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  function handleAdminLogout() {
    localStorage.removeItem("nk_admin_user");
    toast.success("Signed out of Admin Operations Portal");
    router.push("/admin/login");
  }

  // Skip admin chrome on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col lg:flex-row">
      {/* Mobile Topbar */}
      <div className="lg:hidden flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground shadow">
        <div className="flex items-center gap-2">
          <img src="/images/logo.jpg" alt="Logo" className="h-8 w-8 rounded-lg bg-white p-0.5 object-contain" />
          <span className="font-serif font-bold text-base">Fresh Nalla Kadai Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdminLogout}
            className="text-white hover:bg-white/15 text-xs px-2"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-maroon-dark text-white flex flex-col justify-between transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:min-h-screen shadow-xl`}
      >
        <div>
          <div className="p-5 flex items-center gap-3 border-b border-white/10">
            <img src="/images/logo.jpg" alt="Logo" className="h-10 w-10 rounded-xl bg-white p-0.5 object-contain" />
            <div>
              <h2 className="font-serif text-lg font-bold leading-tight">நல்ல கடை</h2>
              <p className="text-[11px] text-white/70">Fresh Operations Portal</p>
            </div>
          </div>

          <nav className="p-3 space-y-1 max-h-[calc(100vh-210px)] overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? "bg-olive text-white shadow-sm font-semibold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 space-y-3 bg-black/15">
          <div className="text-xs space-y-0.5">
            <div className="text-white/60">Signed in as:</div>
            <div className="font-bold text-white truncate text-[11px]">
              {adminUser?.fullName || adminUser?.email || "Super Admin"}
            </div>
            <div className="text-[10px] text-gold font-mono uppercase">
              {adminUser?.role === "super_admin" ? "👑 Super Admin" : "🏪 Store Operator"}
            </div>
          </div>

          <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleAdminLogout}
              className="flex items-center gap-2 text-xs text-rose-300 hover:text-rose-200 transition py-1 font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout / வெளியேறு
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition py-1"
            >
              <Store className="h-3.5 w-3.5" /> View Customer Store →
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl overflow-x-hidden">{children}</main>
    </div>
  );
}
