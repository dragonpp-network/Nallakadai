"use client";

import React, { useEffect, useState } from "react";
import {
  getAdminCouponsAction,
  saveAdminCouponAction,
  deleteAdminCouponAction,
} from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  TicketPercent,
  Plus,
  Edit,
  Trash2,
  Percent,
  Tag,
  Copy,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(150);
  const [maxDiscount, setMaxDiscount] = useState<number>(100);
  const [active, setActive] = useState<boolean>(true);

  useEffect(() => {
    loadCoupons();
  }, []);

  async function loadCoupons() {
    setLoading(true);
    try {
      const list = await getAdminCouponsAction();
      setCoupons(list);
    } catch (err: any) {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCoupon(null);
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setMinOrderValue(150);
    setMaxDiscount(100);
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(coupon: any) {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDescription(coupon.description || "");
    setDiscountType(coupon.discount_type || "percentage");
    setDiscountValue(Number(coupon.discount_value));
    setMinOrderValue(Number(coupon.min_order_value || 0));
    setMaxDiscount(Number(coupon.max_discount || coupon.discount_value));
    setActive(coupon.active !== false);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveAdminCouponAction("a0000000-0000-4000-8000-000000000001", {
        id: editingCoupon?.id,
        code,
        description,
        discountType,
        discountValue,
        minOrderValue,
        maxDiscount,
        active,
      });

      toast.success(editingCoupon ? "Coupon updated successfully!" : "Coupon created!");
      setModalOpen(false);
      loadCoupons();
    } catch (err: any) {
      toast.error("Failed to save coupon");
    }
  }

  async function handleDelete(id: string, couponCode: string) {
    if (!confirm(`Are you sure you want to delete coupon "${couponCode}"?`)) return;
    try {
      await deleteAdminCouponAction("a0000000-0000-4000-8000-000000000001", id);
      toast.success("Coupon removed");
      loadCoupons();
    } catch (err: any) {
      toast.error("Failed to delete coupon");
    }
  }

  function handleShareWhatsApp(coupon: any) {
    let text = `🎉 *Special Offer from Fresh Nalla Kadai!*\n\n`;
    text += `Use Coupon Code: *${coupon.code}*\n`;
    text += `Get *${coupon.discount_type === "percentage" ? `${coupon.discount_value}% OFF` : `₹${coupon.discount_value} OFF`}* ${coupon.description}\n`;
    if (coupon.min_order_value > 0) {
      text += `Min Order: ₹${coupon.min_order_value}\n`;
    }
    text += `\nOrder farm-fresh organic vegetables today: https://fresh.nallakadai.com`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Coupons & Promo Offers</h1>
          <p className="text-xs text-muted-foreground">
            Create discount codes applied during cart checkout by customers
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="rounded-2xl bg-primary text-white gap-2 font-bold h-11 px-5 shadow"
        >
          <Plus className="h-4 w-4" /> Create New Coupon
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center text-muted-foreground border shadow-sm space-y-3">
          <TicketPercent className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-base font-semibold text-foreground">No coupons configured yet</p>
          <p className="text-xs text-muted-foreground">Create discount codes to reward your organic produce buyers.</p>
          <Button onClick={openCreateModal} className="rounded-2xl bg-primary text-white text-xs">
            + Create First Coupon
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <Card
              key={c.id}
              className={`rounded-3xl p-5 border shadow-sm relative overflow-hidden transition hover:shadow-md flex flex-col justify-between ${
                c.active ? "bg-card" : "bg-muted/40 opacity-70"
              }`}
            >
              {/* Top Row */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      {c.discount_type === "percentage" ? <Percent className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-mono text-lg font-extrabold text-foreground tracking-wider flex items-center gap-1.5">
                        <span>{c.code}</span>
                        <Badge
                          variant={c.active ? "default" : "secondary"}
                          className="text-[10px] py-0 px-1.5"
                        >
                          {c.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <span className="text-xs text-primary font-bold">
                        {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `Flat ₹${c.discount_value} OFF`}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{c.description || "Valid on all harvest items."}</p>

                <div className="rounded-2xl bg-muted/60 p-3 text-xs space-y-1 border">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Min Order Amount:</span>
                    <strong className="text-foreground">₹{c.min_order_value || 0}</strong>
                  </div>
                  {c.discount_type === "percentage" && c.max_discount && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Max Discount Cap:</span>
                      <strong className="text-foreground">₹{c.max_discount}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShareWhatsApp(c)}
                  className="h-8 text-xs gap-1 text-emerald-700 hover:bg-emerald-500/10 rounded-xl"
                  title="Share on WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Share
                </Button>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(c)}
                    className="h-8 text-xs gap-1 rounded-xl"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(c.id, c.code)}
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Coupon Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold flex items-center gap-2">
              <TicketPercent className="h-5 w-5 text-primary" />
              <span>{editingCoupon ? "Edit Coupon" : "Create Coupon Code"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Coupon Code (Uppercase) *</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10, FRESH50, ORGANIC20"
                className="mt-1 rounded-xl text-sm font-mono font-bold tracking-wider"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Offer Details</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 10% Welcome discount on fresh produce"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Discount Type</Label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  {discountType === "percentage" ? "Discount (%) *" : "Discount Amount (₹) *"}
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="mt-1 rounded-xl text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Min Order Value (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="mt-1 rounded-xl text-sm font-mono"
                />
              </div>

              {discountType === "percentage" && (
                <div>
                  <Label className="text-xs font-semibold">Max Discount Cap (₹)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="100"
                    className="mt-1 rounded-xl text-sm font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="couponActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="couponActive" className="text-xs font-semibold">
                Active & Redeemable by Customers
              </Label>
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-primary text-white font-bold h-12 mt-4 shadow">
              {editingCoupon ? "Save Changes" : "Create Coupon"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
