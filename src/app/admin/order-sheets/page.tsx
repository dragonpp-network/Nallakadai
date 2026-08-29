"use client";

import React, { useEffect, useState } from "react";
import { getCyclesAction, getOrderSheetsAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileSpreadsheet, Phone, PackageCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrderSheetsPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) loadSheets(selectedCycleId);
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

  async function loadSheets(cycleId: string) {
    setLoading(true);
    try {
      const res = await getOrderSheetsAction(cycleId);
      setSheets(res);
    } catch (err: any) {
      toast.error("Failed to load order picking sheets");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Customer Picking & Packing Sheets</h1>
          <p className="text-xs text-muted-foreground">
            Printable order sheets with distinct item count and verified produce quantity units
          </p>
        </div>

        <div className="flex items-center gap-3">
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

          <Button onClick={handlePrint} className="rounded-2xl bg-primary text-white gap-2 text-xs shadow">
            <Printer className="h-4 w-4" /> Print All ({sheets.length} Sheets)
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading picking sheets...</div>
      ) : sheets.length === 0 ? (
        <div className="rounded-3xl bg-card p-10 text-center text-muted-foreground border shadow-sm">
          No placed orders found for this cycle.
        </div>
      ) : (
        <div className="print-root space-y-6">
          {sheets.map((sheet) => {
            const lineCount = sheet.lines?.length || 0;
            return (
              <div
                key={sheet.orderNo}
                className="print-sheet rounded-3xl border bg-card p-6 shadow-sm break-inside-avoid space-y-4"
              >
                {/* Slip Header */}
                <div className="flex justify-between items-start border-b-2 border-primary/30 pb-3">
                  <div>
                    <div className="text-2xl font-serif font-bold text-primary font-mono">{sheet.orderNo}</div>
                    <div className="text-lg font-bold text-foreground">{sheet.customerName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>Phone: <strong className="font-mono text-foreground">{sheet.mobile}</strong></span>
                      {sheet.altMobile && <span>Alt: {sheet.altMobile}</span>}
                    </div>
                  </div>

                  <div className="text-right text-xs space-y-1">
                    <div className="font-bold text-xs bg-primary/10 text-primary px-3 py-1 rounded-xl inline-block">
                      {sheet.deliveryMode}
                    </div>
                    <div>Branch: <strong>{sheet.branchName}</strong></div>
                    <div>Date: <strong>{new Date(sheet.createdAt).toLocaleDateString("en-IN")}</strong></div>
                  </div>
                </div>

                {/* Delivery Address / Pickup info */}
                {sheet.deliveryMode === "Door Delivery" ? (
                  <div className="rounded-2xl bg-muted/60 p-3 text-xs">
                    <span className="font-semibold text-foreground">Delivery Address: </span>
                    <span className="text-muted-foreground">{sheet.deliveryAddress} {sheet.area ? `(${sheet.area})` : ""}</span>
                    {sheet.preferredTime && <span className="ml-2 font-bold text-primary">Timing: {sheet.preferredTime}</span>}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Store Pickup: </span> Customer will collect from branch counter
                  </div>
                )}

                {sheet.notes && (
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900">
                    <strong>Customer Note:</strong> {sheet.notes}
                  </div>
                )}

                {/* Produce Picking Table */}
                <div className="rounded-2xl border overflow-hidden">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/60 text-xs font-semibold uppercase text-muted-foreground">
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">Ordered Produce Item</th>
                        <th className="p-2.5 font-tamil">பொருள் பெயர்</th>
                        <th className="p-2.5 text-right font-bold">Ordered Qty</th>
                        <th className="p-2.5 w-32 text-center border-l">Packed Qty</th>
                        <th className="p-2.5 w-24 text-center border-l">Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sheet.lines?.map((line: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="p-2.5 text-center text-xs text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-foreground">{line.nameEn}</td>
                          <td className="p-2.5 font-tamil text-muted-foreground text-sm">{line.nameTa || "—"}</td>
                          <td className="p-2.5 text-right font-bold text-sm text-primary font-mono">
                            {line.qty} {line.unit}
                          </td>
                          <td className="p-2.5 text-center border-l text-muted-foreground text-xs font-mono">
                            _______ {line.unit}
                          </td>
                          <td className="p-2.5 text-center border-l">
                            <div className="mx-auto h-4 w-4 border border-muted-foreground/50 rounded" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Slip Summary Banner (Showing accurate distinct item count & explicit quantity units) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-muted/40 p-3 rounded-2xl border text-xs gap-2">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    <span>
                      Order Summary: <strong className="text-foreground">{lineCount} Distinct Produce Items</strong>
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Items: {sheet.lines?.map((l: any) => `${l.nameEn} (${l.qty} ${l.unit})`).join(", ")}
                  </div>
                </div>

                {/* Slip Footer */}
                <div className="pt-3 border-t flex justify-between items-center text-[11px] text-muted-foreground">
                  <div>Packed By: _______________</div>
                  <div>Weighed By: _______________</div>
                  <div>Dispatched By: _______________</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
