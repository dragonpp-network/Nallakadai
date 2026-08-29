"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminOrdersAction,
  updateAdminOrderAction,
  cancelOrderAction,
  markNonCollectionAction,
} from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Edit,
  Ban,
  AlertTriangle,
  Trash2,
  Plus,
  Phone,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Truck,
  ShoppingBasket,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // View / Detail Modal State
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const list = await getAdminOrdersAction();
      setOrders(list);
    } catch (err: any) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  function openViewModal(order: any) {
    // Clone order to allow local availability edits
    const cloned = JSON.parse(JSON.stringify(order));
    setViewingOrder(cloned);
    generateInitialWhatsAppMessage(cloned);
  }

  function generateInitialWhatsAppMessage(order: any) {
    const unavailableItems = (order.lines || []).filter((l: any) => l.unavailable);
    const availableItems = (order.lines || []).filter((l: any) => !l.unavailable);
    const branchName = order.branch?.name || "Erode";
    const branchPhone = order.branch?.whatsappNumber || "9489581122";

    let msg = `வணக்கம் ${order.customerName} 🙏, Fresh Nalla Kadai (${branchName} Branch) சார்பாக.\n\n`;
    msg += `உங்கள் ஆர்டர் *#${order.orderNo}* விவரம்:\n`;

    if (unavailableItems.length > 0) {
      const unavailList = unavailableItems
        .map((i: any) => `❌ ${i.nameEn} (${i.nameTa}) - ${i.qty} ${i.unit}`)
        .join("\n");
      msg += `\n⚠️ மன்னிக்கவும், இந்த வார அறுவடையில் கீழ்க்கண்ட பொருட்கள் கிடைக்கவில்லை:\n${unavailList}\n`;
    }

    if (availableItems.length > 0) {
      msg += `\n✅ உங்களுக்காக புதியதாக பேக் செய்யப்பட்டுள்ள பொருட்கள்:\n`;
      for (const i of availableItems) {
        msg += `• ${i.nameEn} (${i.nameTa}) - ${i.qty} ${i.unit}\n`;
      }
    }

    const newTotal = availableItems.reduce((sum: number, l: any) => sum + (l.lineTotal || l.qty * l.price), 0);
    msg += `\n💵 புதுப்பிக்கப்பட்ட உத்தேச கட்டணம்: *₹${newTotal.toFixed(2)}*\n`;
    msg += `🚚 டெலிவரி முறை: *${order.deliveryMode}*\n`;
    msg += `\nஇயற்கை முறையில் விளைவிக்கப்பட்ட காய்கறிகளைத் தேர்ந்தெடுத்தமைக்கு நன்றி! ஏதேனும் தகவல் தேவைப்படின் எங்களை வாட்ஸ்அப்பில் தொடர்புகொள்ளவும்: ${branchPhone}.`;

    setCustomWhatsAppMsg(msg);
  }

  function toggleItemAvailability(itemIndex: number) {
    if (!viewingOrder) return;
    const updated = { ...viewingOrder };
    const current = !!updated.lines[itemIndex].unavailable;
    updated.lines[itemIndex].unavailable = !current;

    // Recalculate tentative total
    let total = 0;
    for (const l of updated.lines) {
      if (!l.unavailable) {
        total += Number(l.qty) * Number(l.price);
      }
    }
    updated.tentativeTotal = Math.round(total * 100) / 100;

    setViewingOrder(updated);
    generateInitialWhatsAppMessage(updated);
  }

  async function handleSaveViewingOrderChanges() {
    if (!viewingOrder) return;
    setSavingDetails(true);
    try {
      await updateAdminOrderAction("a0000000-0000-4000-8000-000000000001", viewingOrder.id, {
        deliveryMode: viewingOrder.deliveryMode,
        deliveryAddress: viewingOrder.address,
        note: viewingOrder.notes,
        lines: viewingOrder.lines.map((l: any) => ({
          itemId: l.itemId,
          nameEn: l.nameEn,
          nameTa: l.nameTa,
          unit: l.unit,
          qty: Number(l.qty),
          price: Number(l.price),
          unavailable: !!l.unavailable,
        })),
      });

      toast.success("Order availability updated successfully!");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to update order");
    } finally {
      setSavingDetails(false);
    }
  }

  function handleSendWhatsApp(type: "direct" | "web") {
    if (!viewingOrder) return;
    const cleanMobile = viewingOrder.mobile.replace(/\D/g, "");
    const fullMobile = cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
    const encoded = encodeURIComponent(customWhatsAppMsg);

    const url =
      type === "web"
        ? `https://web.whatsapp.com/send?phone=${fullMobile}&text=${encoded}`
        : `https://wa.me/${fullMobile}?text=${encoded}`;

    window.open(url, "_blank");
    toast.success("Opened WhatsApp with tailored customer notification!");
  }

  function handleCopyWhatsAppText() {
    navigator.clipboard.writeText(customWhatsAppMsg);
    toast.success("WhatsApp message copied to clipboard!");
  }

  async function handleConfirmCancel() {
    if (!cancelReason.trim()) {
      toast.error("Please enter a cancellation reason.");
      return;
    }

    try {
      await cancelOrderAction("a0000000-0000-4000-8000-000000000001", cancelOrderId, cancelReason);
      toast.success("Order cancelled");
      setCancelModalOpen(false);
      loadOrders();
    } catch (err: any) {
      toast.error("Failed to cancel order");
    }
  }

  async function handleToggleNonCollection(orderId: string, current: boolean) {
    const reason = !current ? prompt("Reason for non-collection / refusal:") || "Customer did not collect" : undefined;
    try {
      await markNonCollectionAction("a0000000-0000-4000-8000-000000000001", orderId, !current, reason);
      toast.success(`Non-collection status updated`);
      loadOrders();
    } catch (err: any) {
      toast.error("Failed to update flag");
    }
  }

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName.toLowerCase().includes(search.toLowerCase()) ||
        o.mobile.includes(search) ||
        o.address.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Order Management</h1>
          <p className="text-xs text-muted-foreground">
            View orders, mark unavailable produce, and notify customers via connected Store WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border bg-card py-2 px-3 text-xs font-semibold shadow-sm outline-none"
          >
            <option value="all">All Statuses ({orders.length})</option>
            <option value="Placed">Placed Orders</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by order number (FNK-...), customer name, mobile, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border bg-card py-2.5 pl-10 pr-4 text-sm outline-none shadow-sm focus:ring-2 focus:ring-primary"
        />
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-card p-10 text-center text-muted-foreground border shadow-sm">
          No orders found matching your search.
        </div>
      ) : (
        <Card className="rounded-3xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Delivery Mode & Address</th>
                  <th className="py-3.5 px-4">Items / Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((o) => {
                  const hasUnavailable = (o.lines || []).some((l: any) => l.unavailable);
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-primary text-base">{o.orderNo}</div>
                        {hasUnavailable && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 mt-0.5">
                            Items Short
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{o.customerName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {o.mobile}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs max-w-xs">
                        <Badge variant="outline" className="text-[10px] mb-1 font-semibold">
                          {o.deliveryMode}
                        </Badge>
                        <div className="text-muted-foreground truncate">{o.address || "Store Pickup"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-foreground">₹{o.tentativeTotal.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {hasUnavailable ? (
                            <span className="text-rose-700 font-semibold">
                              {(o.lines || []).filter((l: any) => !l.unavailable).length} of {o.itemCount} available
                            </span>
                          ) : (
                            <span>{o.itemCount} items</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={o.status === "Placed" ? "default" : "destructive"}>{o.status}</Badge>
                        {o.nonCollected && (
                          <Badge variant="destructive" className="ml-1 text-[10px]">
                            Non-Collected
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* VIEW & AVAILABILITY MODAL BUTTON */}
                        <Button
                          size="sm"
                          onClick={() => openViewModal(o)}
                          className="h-8 rounded-xl text-xs bg-primary text-white gap-1 shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Order
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleNonCollection(o.id, o.nonCollected)}
                          className="h-8 rounded-xl text-xs text-amber-600 hover:text-amber-700"
                          title="Mark Non-Collection"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Button>

                        {o.status === "Placed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCancelOrderId(o.id);
                              setCancelModalOpen(true);
                            }}
                            className="h-8 rounded-xl text-xs text-destructive hover:bg-destructive/10"
                            title="Cancel Order"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 👁️ VIEW ORDER & PRODUCT AVAILABILITY / WHATSAPP NOTIFIER MODAL            */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingOrder && (
            <div className="space-y-4 pt-1">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
                    <span>Order {viewingOrder.orderNo}</span>
                    <Badge variant={viewingOrder.status === "Placed" ? "default" : "destructive"}>
                      {viewingOrder.status}
                    </Badge>
                  </DialogTitle>
                  <div className="text-xs text-muted-foreground">
                    Branch: <strong>{viewingOrder.branch?.name || "Erode"}</strong>
                  </div>
                </div>
              </DialogHeader>

              {/* Customer Details Card */}
              <div className="rounded-2xl bg-muted/60 p-4 border text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer:</span>
                  <strong className="text-foreground text-sm">{viewingOrder.customerName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Mobile Number:</span>
                  <strong className="text-primary font-mono text-sm">+91 {viewingOrder.mobile}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Delivery Mode:</span>
                  <strong className="text-foreground">{viewingOrder.deliveryMode}</strong>
                </div>
                <div className="col-span-2 sm:col-span-3 border-t pt-2">
                  <span className="text-muted-foreground block text-[11px]">Address:</span>
                  <span className="text-foreground">{viewingOrder.address || "Store Pickup at Branch"}</span>
                </div>
                {viewingOrder.notes && (
                  <div className="col-span-2 sm:col-span-3 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-900">
                    <strong>Customer Note:</strong> {viewingOrder.notes}
                  </div>
                )}
              </div>

                {/* Produce Line Items with Availability Toggles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-base text-foreground">
                        Produce Items (
                        {viewingOrder.lines?.filter((l: any) => !l.unavailable).length || 0} of{" "}
                        {viewingOrder.lines?.length || 0} Available)
                      </h3>
                      {(viewingOrder.lines || []).some((l: any) => l.unavailable) && (
                        <Badge variant="destructive" className="text-[10px]">
                          {(viewingOrder.lines || []).filter((l: any) => l.unavailable).length} Shortage
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Toggle availability or remove items
                    </span>
                  </div>

                  <div className="rounded-2xl border divide-y overflow-hidden bg-card">
                    {viewingOrder.lines?.map((line: any, idx: number) => {
                      const isUnavailable = !!line.unavailable;
                      return (
                        <div
                          key={line.itemId || idx}
                          className={`p-3.5 flex items-center justify-between gap-3 transition ${
                            isUnavailable ? "bg-rose-500/10 opacity-75" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-bold text-sm ${
                                  isUnavailable ? "line-through text-rose-700" : "text-foreground"
                                }`}
                              >
                                {line.nameEn}
                              </span>
                              <span className="text-xs font-tamil text-muted-foreground">({line.nameTa})</span>
                              {isUnavailable && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Crop Shortage (Not Billed)
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              ₹{line.price} / {line.unit} • {line.qty} {line.unit} ={" "}
                              <span className={isUnavailable ? "line-through" : "font-bold text-foreground"}>
                                ₹{(line.qty * line.price).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Availability Toggle Button */}
                            <Button
                              type="button"
                              variant={isUnavailable ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => toggleItemAvailability(idx)}
                              className="h-8 rounded-xl text-xs gap-1 font-semibold"
                            >
                              {isUnavailable ? (
                                <>
                                  <XCircle className="h-3.5 w-3.5" /> Mark Available
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Available
                                </>
                              )}
                            </Button>

                            {/* Permanently Remove from Order Button */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remove "${line.nameEn}" from order completely?`)) {
                                  const updated = { ...viewingOrder };
                                  updated.lines.splice(idx, 1);
                                  let total = 0;
                                  for (const l of updated.lines) {
                                    if (!l.unavailable) total += Number(l.qty) * Number(l.price);
                                  }
                                  updated.tentativeTotal = Math.round(total * 100) / 100;
                                  setViewingOrder(updated);
                                  generateInitialWhatsAppMessage(updated);
                                }
                              }}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                              title="Delete item from order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                <div className="flex justify-between items-center bg-muted/70 p-3 rounded-2xl text-xs font-bold">
                  <span>Updated Tentative Bill:</span>
                  <span className="text-base text-primary font-bold font-mono">
                    ₹{viewingOrder.tentativeTotal?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* WhatsApp Notification Message Composer */}
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <MessageSquare className="h-4 w-4 text-emerald-700" />
                    <span>WhatsApp Customer Notification (Connected Store Phone)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyWhatsAppText}
                    className="h-7 text-xs gap-1 text-emerald-800 hover:bg-emerald-500/20"
                  >
                    <Copy className="h-3 w-3" /> Copy Text
                  </Button>
                </div>

                <Textarea
                  rows={6}
                  value={customWhatsAppMsg}
                  onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                  className="bg-background text-xs font-mono leading-relaxed rounded-xl border-emerald-300"
                />

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => handleSendWhatsApp("web")}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold h-9 shadow gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in WhatsApp Web
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSendWhatsApp("direct")}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 shadow gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Send via WhatsApp App
                  </Button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" onClick={() => setViewingOrder(null)} className="rounded-xl">
                  Close
                </Button>
                <Button
                  onClick={handleSaveViewingOrderChanges}
                  disabled={savingDetails}
                  className="rounded-xl bg-primary text-white font-bold h-10 px-5 shadow"
                >
                  {savingDetails ? "Saving Changes..." : "Save Availability Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-destructive flex items-center gap-2">
              <Ban className="h-5 w-5" /> Cancel Order
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Reason for Cancellation *</Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer called to cancel, wrong address"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)} className="rounded-xl">
                Close
              </Button>
              <Button variant="destructive" onClick={handleConfirmCancel} className="rounded-xl font-bold">
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
