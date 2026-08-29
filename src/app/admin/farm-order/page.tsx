"use client";

import React, { useEffect, useState } from "react";
import { getCyclesAction, getFarmOrderAggregationAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Printer,
  Tractor,
  Layers,
  MessageSquare,
  Copy,
  ShoppingBag,
  ExternalLink,
  Store,
  FolderTree,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function AdminVendorOrderPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) loadVendorOrder(selectedCycleId);
  }, [selectedCycleId]);

  async function loadCycles() {
    try {
      const list = await getCyclesAction();
      setCycles(list);
      if (list.length > 0) setSelectedCycleId(list[0].id);
    } catch (err: any) {
      toast.error("Failed to load cycles");
    }
  }

  async function loadVendorOrder(cycleId: string) {
    setLoading(true);
    try {
      const res = await getFarmOrderAggregationAction(cycleId);
      setData(res);
    } catch (err: any) {
      toast.error("Failed to aggregate vendor procurement order");
    } finally {
      setLoading(false);
    }
  }

  function exportVendorOrderExcel() {
    if (!data?.items || data.items.length === 0) {
      toast.info("No items aggregated.");
      return;
    }

    const rows = data.items.map((i: any) => ({
      Category: i.category,
      "Category (Tamil)": i.categoryTa,
      "Produce Item (English)": i.nameEn,
      "Produce Item (Tamil)": i.nameTa,
      "Total Procurement Quantity": `${i.totalQty} ${i.unit}`,
      Unit: i.unit,
      "Quantity Value": i.totalQty,
      "Orders Requesting": i.orderCount,
      "Brand / Partner": i.brandName,
      "Estimated Procurement Total (₹)": i.estimatedValue,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Procurement Order");
    XLSX.writeFile(
      wb,
      `Vendor_Procurement_Order_Cycle_${data.cycle?.cycle_no || 1}_${data.cycle?.branches?.name || ""}.xlsx`
    );
    toast.success("Vendor Procurement Order Excel exported successfully!");
  }

  function handlePrint() {
    window.print();
  }

  function handleShareVendorWhatsApp(group?: any) {
    const branchName = data?.cycle?.branches?.name || "Erode";
    const cycleNo = data?.cycle?.cycle_no || 1;
    const deliveryDate = data?.cycle?.delivery_date || "Tuesday";

    let text = `📦 *Fresh Nalla Kadai — Vendor Procurement Order*\n`;
    text += `🏬 Branch: ${branchName} | Cycle #${cycleNo}\n`;
    text += `📅 Required for Harvest/Delivery: ${deliveryDate}\n\n`;

    const targetGroups = group ? [group] : data?.categoryGroups || [];

    for (const cat of targetGroups) {
      text += `*--- [ ${cat.categoryName} (${cat.categoryNameTa}) ] ---*\n`;
      for (const item of cat.items) {
        text += `• *${item.nameEn}* (${item.nameTa}): *${item.totalQty} ${item.unit}*  _(Requested in ${item.orderCount} orders)_\n`;
      }
      text += `\n`;
    }

    text += `Total Varieties: ${data?.distinctItemCount} produce lines across ${data?.totalOrders} customer orders.\n`;
    text += `Please harvest fresh on Monday for Tuesday dispatch.`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    toast.success("Opened WhatsApp with vendor procurement order list!");
  }

  const { cycle, items, categoryGroups, totalOrders, distinctItemCount, grandTotalValue } = data || {};

  const filteredGroups =
    selectedCategoryTab === "all"
      ? categoryGroups || []
      : (categoryGroups || []).filter((g: any) => g.categoryId === selectedCategoryTab);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Vendor Procurement Order</h1>
          <p className="text-xs text-muted-foreground">
            Category-wise aggregated customer demands to procure farm-fresh items ready for dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="rounded-2xl border p-2.5 text-xs font-semibold bg-card shadow-sm outline-none"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                Cycle #{c.cycle_no} ({c.branches?.name})
              </option>
            ))}
          </select>

          <Button
            onClick={() => handleShareVendorWhatsApp()}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow"
          >
            <MessageSquare className="h-4 w-4" /> Share on WhatsApp
          </Button>

          <Button onClick={exportVendorOrderExcel} variant="outline" className="rounded-2xl gap-1.5 text-xs bg-card shadow-sm">
            <Download className="h-4 w-4" /> Excel
          </Button>

          <Button onClick={handlePrint} className="rounded-2xl bg-primary text-white gap-1.5 text-xs shadow">
            <Printer className="h-4 w-4" /> Print Order Sheet
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Aggregating vendor demand...</div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center text-muted-foreground border shadow-sm">
          No placed orders found for Cycle #{cycle?.cycle_no}.
        </div>
      ) : (
        <div className="print-root space-y-6">
          {/* Executive Summary Metrics Card */}
          <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 rounded-3xl border bg-card shadow-sm">
              <span className="text-xs text-muted-foreground block">Customer Orders</span>
              <strong className="text-xl font-bold text-foreground">{totalOrders} Placed Orders</strong>
            </Card>
            <Card className="p-4 rounded-3xl border bg-card shadow-sm">
              <span className="text-xs text-muted-foreground block">Distinct Produce Items</span>
              <strong className="text-xl font-bold text-primary">{distinctItemCount} Varieties</strong>
            </Card>
            <Card className="p-4 rounded-3xl border bg-card shadow-sm">
              <span className="text-xs text-muted-foreground block">Produce Categories</span>
              <strong className="text-xl font-bold text-olive">{categoryGroups?.length || 0} Categories</strong>
            </Card>
            <Card className="p-4 rounded-3xl border bg-card shadow-sm">
              <span className="text-xs text-muted-foreground block">Est. Procurement Total</span>
              <strong className="text-xl font-bold text-foreground">₹{grandTotalValue?.toFixed(2)}</strong>
            </Card>
          </div>

          {/* Category Filter Tabs */}
          <div className="no-print no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryTab("all")}
              className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap shadow-sm transition ${
                selectedCategoryTab === "all"
                  ? "bg-olive text-white shadow-olive/30 scale-105"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              All Categories ({distinctItemCount} Items)
            </button>
            {categoryGroups?.map((cat: any) => (
              <button
                key={cat.categoryId}
                type="button"
                onClick={() => setSelectedCategoryTab(cat.categoryId)}
                className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap shadow-sm transition ${
                  selectedCategoryTab === cat.categoryId
                    ? "bg-olive text-white shadow-olive/30 scale-105"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted"
                }`}
              >
                <span>{cat.categoryName}</span>
                <span className="text-[10px] opacity-80 font-tamil">({cat.categoryNameTa})</span>
                <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] ml-0.5">
                  {cat.totalVarietyCount}
                </span>
              </button>
            ))}
          </div>

          {/* Print Sheet Header */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-bold text-foreground">Fresh Nalla Kadai — Vendor Order</h2>
                  <Badge className="bg-olive text-white text-xs">{cycle?.branches?.name} Branch</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-tamil mt-0.5">
                  விற்பனையாளர் மற்றும் விவசாயிகள் கொள்முதல் பட்டியல் (Cycle #{cycle?.cycle_no})
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground bg-muted/50 p-3 rounded-2xl border">
                <div>Harvest / Delivery Date: <strong className="text-primary">{cycle?.delivery_date}</strong></div>
                <div>Customer Orders: <strong className="text-foreground">{totalOrders} Orders</strong></div>
                <div>Total Produce Lines: <strong className="text-foreground">{distinctItemCount} Distinct Items</strong></div>
              </div>
            </div>

            {/* Category-Wise Grouped Vendor Order Tables */}
            <div className="space-y-6">
              {filteredGroups.map((cat: any) => (
                <div key={cat.categoryId} className="rounded-2xl border overflow-hidden shadow-sm">
                  {/* Category Header */}
                  <div
                    className="p-3.5 px-4 flex items-center justify-between border-b"
                    style={{ backgroundColor: cat.categoryTint || "#EAF3DD" }}
                  >
                    <div className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-foreground/80" />
                      <h3 className="font-serif font-bold text-base text-foreground">
                        {cat.categoryName} <span className="font-tamil text-xs font-normal">({cat.categoryNameTa})</span>
                      </h3>
                      <Badge variant="secondary" className="bg-white/80 text-foreground text-[10px] font-bold">
                        {cat.totalVarietyCount} Items
                      </Badge>
                    </div>

                    <div className="no-print flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShareVendorWhatsApp(cat)}
                        className="h-7 text-xs gap-1 hover:bg-black/10 text-foreground font-semibold"
                        title="Share this category only via WhatsApp"
                      >
                        <MessageSquare className="h-3 w-3" /> WhatsApp Category
                      </Button>
                    </div>
                  </div>

                  {/* Items List Table */}
                  <div className="overflow-x-auto bg-card">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold border-b">
                        <tr>
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Produce Item</th>
                          <th className="py-3 px-4 font-tamil">பொருள் பெயர்</th>
                          <th className="py-3 px-4">Brand / Partner</th>
                          <th className="py-3 px-4 text-right">Orders Requesting</th>
                          <th className="py-3 px-4 text-right font-bold">Total Procurement Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {cat.items.map((row: any, i: number) => (
                          <tr key={row.itemId} className="hover:bg-muted/20 transition">
                            <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{i + 1}</td>
                            <td className="py-3 px-4 font-bold text-foreground">{row.nameEn}</td>
                            <td className="py-3 px-4 text-sm font-tamil text-muted-foreground">{row.nameTa || "—"}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {row.brandName ? (
                                <Badge variant="outline" className="text-[10px] bg-muted/40 font-medium">
                                  {row.brandName}
                                </Badge>
                              ) : (
                                "Direct Farm"
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-xs">
                              <span className="font-semibold text-muted-foreground">{row.orderCount}</span> orders
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="inline-flex items-center px-3 py-1 rounded-xl bg-primary/10 text-primary font-bold text-base font-mono">
                                {row.totalQty} {row.unit}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
