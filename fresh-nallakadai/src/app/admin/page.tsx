"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminDashboardAction, clearTestDataAction, seedDemoDataAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingBag,
  Users,
  Scale,
  IndianRupee,
  PhoneCall,
  Download,
  Calendar,
  Layers,
  FileSpreadsheet,
  Tractor,
  Clock,
  Sparkles,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDashboard(selectedBranch);
  }, [selectedBranch]);

  async function loadDashboard(branchId?: string) {
    setLoading(true);
    try {
      const res = await getAdminDashboardAction("a0000000-0000-4000-8000-000000000001", branchId);
      setData(res);
      if (!selectedBranch && res.currentBranch) {
        setSelectedBranch(res.currentBranch.id);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  function exportNotOrdered() {
    if (!data?.notYetOrdered || data.notYetOrdered.length === 0) {
      toast.info("No customers pending order.");
      return;
    }

    const rows = data.notYetOrdered.map((c: any) => ({
      "Customer Name": c.name,
      "Mobile Number": c.mobile,
      "Alternate Mobile": c.alt_mobile || "",
      Area: c.area || "",
      Address: c.address || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Not Yet Ordered");
    XLSX.writeFile(wb, `Not_Yet_Ordered_Cycle_${data.currentCycle?.cycle_no || 1}.xlsx`);
    toast.success("Excel sheet exported successfully!");
  }

  async function handleSeedDemo() {
    setActionLoading(true);
    try {
      await seedDemoDataAction("a0000000-0000-4000-8000-000000000001");
      toast.success("Sample test cycle and orders populated!");
      loadDashboard(selectedBranch);
    } catch (err: any) {
      toast.error("Failed to seed demo data");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearData() {
    setActionLoading(true);
    try {
      await clearTestDataAction("a0000000-0000-4000-8000-000000000001");
      toast.success("All test orders and cycles cleared!");
      setClearModalOpen(false);
      loadDashboard(selectedBranch);
    } catch (err: any) {
      toast.error("Failed to clear data");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !data) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard data...</div>;
  }

  const { stats, currentBranch, currentCycle, notYetOrdered, branches } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Controls & Branch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Live ordering monitor, sales follow-up & procurement controls
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-xl border border-input bg-card px-3 py-2 text-sm font-medium shadow-sm outline-none"
          >
            {branches?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} Branch
              </option>
            ))}
          </select>

          {/* Seed Demo Data Button */}
          <Button
            onClick={handleSeedDemo}
            disabled={actionLoading}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
            title="Populate test orders and cycle"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Seed Demo Data
          </Button>

          {/* Reset / Clear Test Data Button */}
          <Button
            onClick={() => setClearModalOpen(true)}
            disabled={actionLoading}
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5"
            title="Clear all test orders after testing"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Test Data
          </Button>
        </div>
      </div>

      {/* Cycle Status Card */}
      <Card className="p-5 rounded-2xl border bg-card shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg">Cycle #{currentCycle?.cycle_no || 1}</span>
              <Badge className={currentCycle?.status === "Open" ? "bg-emerald-600" : "bg-amber-600"}>
                {currentCycle?.status || "Draft"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5" suppressHydrationWarning>
              Delivery Date:{" "}
              <strong>
                {currentCycle?.delivery_date
                  ? new Date(currentCycle.delivery_date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })
                  : "Not set"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/cycles">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Cycle Setup
            </Button>
          </Link>
          <Link href="/admin/availability">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Items & Pricing
            </Button>
          </Link>
          <Link href="/admin/farm-order">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
              <Tractor className="h-3.5 w-3.5" /> Farm Order
            </Button>
          </Link>
          <Link href="/admin/order-sheets">
            <Button className="rounded-xl text-xs gap-1.5 bg-primary text-white">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Picking Sheets
            </Button>
          </Link>
        </div>
      </Card>

      {/* Live Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders Placed</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Active customer orders</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Quantity</span>
            <Scale className="h-4 w-4 text-olive" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalQty || 0}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Aggregated produce units</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tentative Total</span>
            <IndianRupee className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">₹{stats?.tentativeValue?.toFixed(2) || "0.00"}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Estimated cycle bill</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Not Yet Ordered</span>
            <Users className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{stats?.notOrderedCount || 0}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Customers to follow up</p>
        </Card>
      </div>

      {/* "Not Yet Ordered" Active Caller List (FR-8.3) */}
      <Card className="p-5 rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 mb-4">
          <div>
            <h3 className="font-serif font-bold text-lg text-foreground">Not Yet Ordered — Follow-up Caller List</h3>
            <p className="text-xs text-muted-foreground">
              Active registered customers of {currentBranch?.name} who haven't placed an order for Cycle #{currentCycle?.cycle_no || 1}.
            </p>
          </div>

          <Button onClick={exportNotOrdered} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </Button>
        </div>

        {!notYetOrdered || notYetOrdered.length === 0 ? (
          <div className="p-8 text-center text-sm text-emerald-600 font-medium">
            🎉 All registered customers have placed an order for this cycle!
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto pr-1">
            {notYetOrdered.map((c: any) => (
              <div key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.mobile} {c.alt_mobile ? `• Alt: ${c.alt_mobile}` : ""} • Area: {c.area || "N/A"}
                  </div>
                </div>

                <a
                  href={`tel:${c.mobile}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call Customer
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirm Clear Test Data Modal */}
      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Clear Test Data
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will remove all test customer orders, cycle items, and testing rounds while preserving your master produce catalogue, categories, branches, and customer records.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setClearModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearData}
                disabled={actionLoading}
                className="rounded-xl"
              >
                {actionLoading ? "Clearing..." : "Confirm & Clear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
