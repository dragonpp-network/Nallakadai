"use client";

import React, { useEffect, useState } from "react";
import { getAdminOrdersAction, getCustomersAction, getCyclesAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, TrendingUp, Users, Package } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function AdminReportsPage() {
  const [tab, setTab] = useState<"customer" | "item" | "cycle">("customer");
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [oList, cList, cyList] = await Promise.all([
        getAdminOrdersAction(),
        getCustomersAction(),
        getCyclesAction(),
      ]);
      setOrders(oList);
      setCustomers(cList);
      setCycles(cyList);
    } catch (err: any) {
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  }

  // 1. Customer Value Report (FR-10.1)
  const customerReport = React.useMemo(() => {
    const map = new Map<string, { name: string; mobile: string; orders: number; totalValue: number }>();
    for (const c of customers) {
      map.set(c.id, { name: c.name, mobile: c.mobile, orders: 0, totalValue: 0 });
    }
    for (const o of orders) {
      if (o.status === "Placed") {
        const entry = map.get((o as any).customer_id || o.customerId);
        if (entry) {
          entry.orders += 1;
          entry.totalValue += o.tentativeTotal || 0;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [customers, orders]);

  // 2. Item Movement Report (FR-10.2)
  const itemReport = React.useMemo(() => {
    const map = new Map<string, { nameEn: string; nameTa: string; unit: string; totalQty: number; totalValue: number }>();
    for (const o of orders) {
      if (o.status === "Placed") {
        for (const line of o.lines || []) {
          const existing = map.get(line.itemId);
          if (existing) {
            existing.totalQty += line.qty;
            existing.totalValue += line.lineTotal || line.qty * line.price;
          } else {
            map.set(line.itemId, {
              nameEn: line.nameEn,
              nameTa: line.nameTa,
              unit: line.unit,
              totalQty: line.qty,
              totalValue: line.lineTotal || line.qty * line.price,
            });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [orders]);

  function exportReportExcel() {
    let rows: any[] = [];
    let name = "Report";

    if (tab === "customer") {
      rows = customerReport.map((c) => ({
        "Customer Name": c.name,
        "Mobile Number": c.mobile,
        "Total Orders Placed": c.orders,
        "Total Tentative Value (₹)": c.totalValue.toFixed(2),
      }));
      name = "Customer_Value_Report";
    } else if (tab === "item") {
      rows = itemReport.map((i) => ({
        "Item Name (English)": i.nameEn,
        "Item Name (Tamil)": i.nameTa,
        "Total Quantity Ordered": i.totalQty,
        Unit: i.unit,
        "Total Value (₹)": i.totalValue.toFixed(2),
      }));
      name = "Item_Movement_Report";
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}.xlsx`);
    toast.success("Report exported to Excel!");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Operational Reports</h1>
          <p className="text-xs text-muted-foreground">
            Customer value analytics, produce item movement, and cycle turnover
          </p>
        </div>

        <Button onClick={exportReportExcel} variant="outline" className="rounded-xl gap-2 text-xs">
          <Download className="h-4 w-4" /> Export Active Report (Excel)
        </Button>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setTab("customer")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "customer" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Customer Value Report
        </button>
        <button
          onClick={() => setTab("item")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            tab === "item" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Item Movement & Demand
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Generating report metrics...</div>
      ) : tab === "customer" ? (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4 text-center">Orders Count</th>
                <th className="p-4 text-right">Cumulative Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customerReport.map((c, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="p-4 font-semibold text-foreground">{c.name}</td>
                  <td className="p-4 text-xs font-mono">{c.mobile}</td>
                  <td className="p-4 text-center font-medium">{c.orders}</td>
                  <td className="p-4 text-right font-bold text-primary">₹{c.totalValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="p-4">Item Name (English / தமிழ்)</th>
                <th className="p-4 text-center">Unit</th>
                <th className="p-4 text-right">Total Quantity Sold</th>
                <th className="p-4 text-right">Total Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itemReport.map((item, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="p-4">
                    <span className="font-semibold text-foreground">{item.nameEn}</span>{" "}
                    <span className="text-xs font-tamil text-muted-foreground">({item.nameTa})</span>
                  </td>
                  <td className="p-4 text-center text-xs font-semibold text-muted-foreground">{item.unit}</td>
                  <td className="p-4 text-right font-bold text-primary">{item.totalQty}</td>
                  <td className="p-4 text-right font-bold text-foreground">₹{item.totalValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
