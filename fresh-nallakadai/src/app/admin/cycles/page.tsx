"use client";

import React, { useEffect, useState } from "react";
import {
  getCyclesAction,
  createCycleAction,
  updateCycleStatusAction,
  updateAdminCycleAction,
  getBranchesAction,
} from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Calendar, Clock, AlertTriangle, Play, Square, Edit, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminCyclesPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [collectionTiming, setCollectionTiming] = useState("Tuesday 7:00 AM - 10:00 AM");
  const [copyFromId, setCopyFromId] = useState("");
  const [defaulterAlerts, setDefaulterAlerts] = useState<any[]>([]);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<any | null>(null);
  const [editCycleNo, setEditCycleNo] = useState<number>(1);
  const [editDeliveryDate, setEditDeliveryDate] = useState("");
  const [editCloseAt, setEditCloseAt] = useState("");
  const [editOpenAt, setEditOpenAt] = useState("");
  const [editCollectionTiming, setEditCollectionTiming] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cList, bList] = await Promise.all([getCyclesAction(), getBranchesAction()]);
      setCycles(cList);
      setBranches(bList);
      if (bList.length > 0) setBranchId(bList[0].id);
    } catch (err: any) {
      toast.error("Failed to load cycles");
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(cycle: any) {
    setEditingCycle(cycle);
    setEditCycleNo(cycle.cycle_no);
    setEditDeliveryDate(cycle.delivery_date || "");
    // Format close_at for datetime-local input
    if (cycle.close_at) {
      const dt = new Date(cycle.close_at);
      const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditCloseAt(iso);
    } else {
      setEditCloseAt("");
    }
    if (cycle.open_at) {
      const dt = new Date(cycle.open_at);
      const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditOpenAt(iso);
    } else {
      setEditOpenAt("");
    }
    setEditCollectionTiming(cycle.collectionTiming || cycle.collection_timing || "Tuesday 7:00 AM - 10:00 AM");
    setEditModalOpen(true);
  }

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await createCycleAction("demo-admin", {
        branchId,
        openAt: openAt ? new Date(openAt).toISOString() : new Date().toISOString(),
        closeAt: closeAt ? new Date(closeAt).toISOString() : new Date(Date.now() + 5 * 86400000).toISOString(),
        deliveryDate: deliveryDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        collectionTiming: collectionTiming.trim(),
        copyFromCycleId: copyFromId || undefined,
      });

      toast.success("New cycle opened successfully!");
      if (res.defaulters && res.defaulters.length > 0) {
        setDefaulterAlerts(res.defaulters);
      }
      setCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create cycle");
    }
  }

  async function handleSaveEditedCycle(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCycle) return;
    try {
      await updateAdminCycleAction("demo-admin", editingCycle.id, {
        cycleNo: editCycleNo,
        deliveryDate: editDeliveryDate,
        closeAt: editCloseAt ? new Date(editCloseAt).toISOString() : undefined,
        openAt: editOpenAt ? new Date(editOpenAt).toISOString() : undefined,
        collectionTiming: editCollectionTiming.trim(),
      });

      toast.success(`Cycle #${editCycleNo} updated successfully!`);
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update cycle");
    }
  }

  async function handleOverride(cycleId: string, override: "force_open" | "force_closed" | null) {
    try {
      await updateCycleStatusAction("demo-admin", cycleId, { manualOverride: override });
      toast.success(`Override updated to: ${override || "Auto Schedule"}`);
      loadData();
    } catch (err: any) {
      toast.error("Failed to update status");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Cycle Management</h1>
          <p className="text-xs text-muted-foreground">
            Schedule order windows, automated close timers, and collection timing windows
          </p>
        </div>

        <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl bg-primary text-white gap-2">
          <Plus className="h-4 w-4" /> Open New Cycle
        </Button>
      </div>

      {/* Defaulter Alert Banner upon opening */}
      {defaulterAlerts.length > 0 && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-900">
          <div className="flex items-center gap-2 font-bold text-sm mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Notice: Outstanding Non-Collection Flags Found</span>
          </div>
          <p className="text-xs">
            The following customers have non-collected orders from previous rounds. Please confirm with them before dispatch:
          </p>
          <ul className="mt-2 text-xs list-disc list-inside space-y-1">
            {defaulterAlerts.map((d: any, i) => (
              <li key={i}>
                <strong>{d.customers?.name}</strong> ({d.customers?.mobile}) — Reason: {d.non_collection_reason || "Not specified"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cycle List */}
      <div className="grid gap-4">
        {cycles.map((c) => (
          <Card key={c.id} className="p-5 rounded-2xl border bg-card shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-bold text-lg">Cycle #{c.cycle_no}</span>
                <Badge variant="outline">{c.branches?.name || "Branch"}</Badge>
                <Badge className={c.status === "Open" ? "bg-emerald-600" : "bg-muted text-muted-foreground"}>
                  {c.status}
                </Badge>
                {c.manual_override && (
                  <Badge variant="destructive" className="text-[10px]">
                    Override: {c.manual_override}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground flex flex-wrap gap-4 pt-1">
                <span>
                  Closes: <strong>{c.close_at ? new Date(c.close_at).toLocaleString("en-IN") : "N/A"}</strong>
                </span>
                <span>
                  Delivery: <strong>{c.delivery_date || "N/A"}</strong>
                </span>
                <span>
                  Pickup Window: <strong className="text-primary font-semibold">{c.collectionTiming || "Tuesday 7:00 AM - 10:00 AM"}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(c)}
                className="text-xs gap-1 rounded-xl bg-background hover:bg-muted font-semibold"
              >
                <Edit className="h-3.5 w-3.5 text-primary" /> Edit Cycle
              </Button>
              <Button
                variant={c.manual_override === "force_open" ? "default" : "outline"}
                size="sm"
                onClick={() => handleOverride(c.id, c.manual_override === "force_open" ? null : "force_open")}
                className="text-xs gap-1 rounded-xl"
              >
                <Play className="h-3 w-3" /> Force Open
              </Button>
              <Button
                variant={c.manual_override === "force_closed" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleOverride(c.id, c.manual_override === "force_closed" ? null : "force_closed")}
                className="text-xs gap-1 rounded-xl"
              >
                <Square className="h-3 w-3" /> Force Close
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Open New Cycle */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Open New Ordering Cycle</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCycle} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Select Branch</Label>
              <select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  const b = branches.find((br) => br.id === e.target.value);
                  if (b && b.collection_timing) setCollectionTiming(b.collection_timing);
                }}
                className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Close Date & Time (Store Auto-closes)</Label>
              <Input
                type="datetime-local"
                value={closeAt}
                onChange={(e) => setCloseAt(e.target.value)}
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Expected Harvest / Delivery Date</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Collection / Store Pickup Window for this Cycle</Label>
              <Input
                value={collectionTiming}
                onChange={(e) => setCollectionTiming(e.target.value)}
                placeholder="e.g. Tuesday 7:00 AM – 10:00 AM or Friday 8:00 AM – 12:00 PM"
                className="mt-1 rounded-xl text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Customize pickup timing specifically for this harvest round.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">Copy Items & Pricing from Previous Cycle</Label>
              <select
                value={copyFromId}
                onChange={(e) => setCopyFromId(e.target.value)}
                className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
              >
                <option value="">-- Do not copy (Start Empty) --</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    Cycle #{c.cycle_no} ({c.branches?.name})
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-primary text-white font-bold h-12 mt-4 shadow">
              Confirm & Open Cycle
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Cycle */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              <span>Edit Cycle #{editingCycle?.cycle_no}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEditedCycle} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Cycle Number</Label>
              <Input
                type="number"
                value={editCycleNo}
                onChange={(e) => setEditCycleNo(parseInt(e.target.value) || 1)}
                className="mt-1 rounded-xl text-sm font-mono"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Harvest / Delivery Date</Label>
              <Input
                type="date"
                value={editDeliveryDate}
                onChange={(e) => setEditDeliveryDate(e.target.value)}
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Order Window Closing Date & Time</Label>
              <Input
                type="datetime-local"
                value={editCloseAt}
                onChange={(e) => setEditCloseAt(e.target.value)}
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Collection / Store Pickup Window</Label>
              <Input
                value={editCollectionTiming}
                onChange={(e) => setEditCollectionTiming(e.target.value)}
                placeholder="e.g. Tuesday 7:00 AM – 10:00 AM"
                className="mt-1 rounded-xl text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Displayed to customers on their order confirmation and receipt.
              </p>
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-primary text-white font-bold h-12 mt-4 shadow">
              Save Cycle Changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
