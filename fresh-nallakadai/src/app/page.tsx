"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  lookupCustomerAction,
  getStoreCatalogAction,
  submitCustomerOrderAction,
  getCustomerOrderHistoryAction,
  cancelCustomerOrderAction,
  validateCouponAction,
  type LookupResult,
} from "@/lib/actions/customer";
import { validateQty } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GenericProduceImage } from "@/components/ui/image-uploader";
import { LottieAnimation } from "@/components/ui/lottie-animation";
import {
  Home,
  ShoppingBag,
  ShoppingCart,
  History,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  Minus,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBasket,
  Trash2,
  Truck,
  Phone,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Edit3,
  XCircle,
  MapPin,
  Calendar,
  ShieldCheck,
  LogOut,
  Tag,
  Award,
  TicketPercent,
  Percent,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { BrandSplit } from "@/components/brand/BrandSplit";
import { categoryIcon } from "@/lib/category-icons";

const MOBILE_STORAGE_KEY = "nk_customer_mobile";
const VIEW_MODE_STORAGE_KEY = "nk_store_view_mode";

export default function StorefrontPage() {
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeData, setStoreData] = useState<any>(null);
  const [storeLoading, setStoreLoading] = useState(false);

  // Active Tab: 'home' | 'order' | 'cart' | 'history'
  const [activeTab, setActiveTab] = useState<"home" | "order" | "cart" | "history">("home");

  // View Mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeBrand, setActiveBrand] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart & Order State
  const [cart, setCart] = useState<Record<string, { packSize: number; packCount: number }>>({});
  const [editingOrderNo, setEditingOrderNo] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"Door Delivery" | "Customer Pickup">("Door Delivery");
  const [address, setAddress] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [note, setNote] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description: string;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmedOrderDetails, setConfirmedOrderDetails] = useState<any>(null);

  // Client-only mount detection
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(MOBILE_STORAGE_KEY);
    if (saved && saved.length >= 10) {
      setMobile(saved);
      setPhoneInput(saved);
      handleLookup(saved);
    }
    const savedView = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (savedView === "grid" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  function handleSetViewMode(mode: "grid" | "list") {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }

  async function handleLookup(num: string) {
    setLoading(true);
    try {
      const res = await lookupCustomerAction(num);
      setLookup(res);
      if (res.status === "ok") {
        localStorage.setItem(MOBILE_STORAGE_KEY, num);
        setDeliveryMode(res.customer.deliveryMode);
        setAddress(res.customer.address);
        setPreferredTime(res.customer.preferredTime);
        await Promise.all([loadStore(num), loadHistory(num)]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to lookup customer");
    } finally {
      setLoading(false);
    }
  }

  async function loadStore(num: string) {
    setStoreLoading(true);
    try {
      const data = await getStoreCatalogAction(num);
      setStoreData(data);
      // NOTE: We do NOT auto-populate cart from currentOrder.
      // Cart stays clean until the user explicitly adds items or clicks "Edit Order".
    } catch (err: any) {
      toast.error(err.message || "Error loading store catalog");
    } finally {
      setStoreLoading(false);
    }
  }

  async function loadHistory(num?: string) {
    const targetMobile = num || mobile;
    if (!targetMobile) return;
    try {
      const history = await getCustomerOrderHistoryAction(targetMobile);
      setHistoryOrders(history);
    } catch (err: any) {
      console.error("Failed to load order history:", err);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (phoneInput.trim().length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setMobile(phoneInput.trim());
    handleLookup(phoneInput.trim());
  }

  function fillDemoCustomer(num: string) {
    setPhoneInput(num);
    setMobile(num);
    handleLookup(num);
  }

  function handleSignOut() {
    localStorage.removeItem(MOBILE_STORAGE_KEY);
    setMobile("");
    setPhoneInput("");
    setLookup(null);
    setStoreData(null);
    setCart({});
    setEditingOrderNo(null);
    setActiveTab("home");
  }

  /**
   * Repeat Any Order (from History or Home)
   */
  function handleRepeatOrder(order: any) {
    const lines = order?.order_items || order?.lines || [];
    if (!lines || lines.length === 0) {
      toast.error("No items found in this order to repeat.");
      return;
    }

    const availMap = new Map(storeData?.items?.map((i: any) => [i.itemId, i]) || []);
    const newCart: Record<string, { packSize: number; packCount: number }> = {};
    const droppedItems: string[] = [];

    for (const line of lines) {
      const itemId = line.item_id || line.itemId;
      const item = availMap.get(itemId);
      if (item && !item.soldOut) {
        const packOptions = (item.packOptions && item.packOptions.length > 0)
          ? item.packOptions
          : (item.presets || [1]).map((p: number) => ({
              label: `${p} ${item.unit}`,
              qty: p,
              price: item.price * p,
            }));
        const packSize = Number(line.pack_size || line.packSize || packOptions[0]?.qty || line.qty || 1);
        const matchingOpt = packOptions.find((o: any) => o.qty === packSize) || packOptions[0];
        const packPrice = Number(line.pack_price || matchingOpt?.price || item.price * packSize);
        const packLabel = line.pack_label || matchingOpt?.label || `${packSize} ${item.unit}`;
        const totalQ = Number(line.qty || packSize);
        const packCount = Number(line.pack_count || line.packCount || Math.max(1, Math.round(totalQ / packSize)));
        newCart[itemId] = { packSize, packPrice, packLabel, packCount };
      } else {
        droppedItems.push(line.name_en || "Item");
      }
    }

    if (Object.keys(newCart).length === 0) {
      toast.error("Items from this order are not available in the current harvest cycle.");
      return;
    }

    setCart(newCart);
    setEditingOrderNo(null);
    if (order.delivery_mode || order.deliveryMode) {
      setDeliveryMode(order.delivery_mode || order.deliveryMode);
    }
    setActiveTab("cart");

    if (droppedItems.length > 0) {
      toast.info(`Cart filled! Note: ${droppedItems.join(", ")} not available this cycle.`);
    } else {
      toast.success(`Loaded ${Object.keys(newCart).length} items from Order ${order.order_no || order.orderNo} into Cart!`);
    }
  }

  /**
   * Explicitly load Active Order into Cart for Editing
   */
  function handleStartEditingOrder(order?: any) {
    const target = order || storeData?.currentOrder || historyOrders.find((o) => o.isCurrentCycle && o.status === "Placed");
    if (!target) {
      toast.error("Could not find order details to edit.");
      return;
    }

    const lines = target.order_items || target.lines || [];
    if (!lines || lines.length === 0) {
      toast.error("This order has no items to edit.");
      return;
    }

    const existing: Record<string, { packSize: number; packPrice: number; packLabel: string; packCount: number }> = {};
    for (const item of lines) {
      const id = item.item_id || item.itemId || item.id;
      if (!id) continue;
      const meta = storeData?.items?.find((i: any) => i.itemId === id);
      const packOptions = (meta?.packOptions && meta.packOptions.length > 0)
        ? meta.packOptions
        : (meta?.presets || [1]).map((p: number) => ({
            label: `${p} ${meta?.unit || item.unit || "Kg"}`,
            qty: p,
            price: (meta?.price || item.price || 0) * p,
          }));
      const packSize = Number(item.pack_size || item.packSize || packOptions[0]?.qty || item.qty || 1);
      const matchingOpt = packOptions.find((o: any) => o.qty === packSize) || packOptions[0];
      const packPrice = Number(item.pack_price !== undefined && !isNaN(Number(item.pack_price)) ? item.pack_price : (matchingOpt?.price || (meta?.price || item.price || 0) * packSize));
      const packLabel = item.pack_label || matchingOpt?.label || `${packSize} ${meta?.unit || item.unit || ""}`;
      const totalQ = Number(item.qty || packSize);
      const packCount = Number(item.pack_count || item.packCount || Math.max(1, Math.round(totalQ / packSize)));
      existing[id] = { packSize, packPrice, packLabel, packCount };
    }

    setCart(existing);
    setEditingOrderNo(target.order_no || target.orderNo);
    if (target.delivery_mode || target.deliveryMode) setDeliveryMode(target.delivery_mode || target.deliveryMode);
    if (target.delivery_address || target.deliveryAddress) setAddress(target.delivery_address || target.deliveryAddress);
    if (target.note) setNote(target.note);

    setActiveTab("cart");
    toast.info(`Loaded Order ${target.order_no || target.orderNo} into Cart. You can adjust items and tap Update.`);
  }

  function handleSelectPack(itemId: string, packOptionOrSize: any, itemMeta: any) {
    setCart((prev: any) => {
      const existing = prev[itemId];
      const packCount = existing && existing.packCount > 0 ? existing.packCount : 1;
      
      let packSize: number;
      let packPrice: number;
      let packLabel: string;

      if (typeof packOptionOrSize === "object" && packOptionOrSize !== null) {
        packSize = Number(packOptionOrSize.qty || 1);
        packPrice = Number(packOptionOrSize.price || itemMeta.price * packSize);
        packLabel = packOptionOrSize.label || `${packSize} ${itemMeta.unit}`;
      } else {
        packSize = Number(packOptionOrSize);
        const packOptions = itemMeta.packOptions || [];
        const match = packOptions.find((o: any) => o.qty === packSize);
        packPrice = match ? match.price : (itemMeta.price * packSize);
        packLabel = match ? match.label : `${packSize} ${itemMeta.unit}`;
      }

      return {
        ...prev,
        [itemId]: { packSize, packPrice, packLabel, packCount },
      };
    });
  }

  function handleUpdatePackCount(itemId: string, packCount: number, itemMeta: any) {
    setCart((prev: any) => {
      if (packCount <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      const existing = prev[itemId];
      const packOptions = (itemMeta.packOptions && itemMeta.packOptions.length > 0)
        ? itemMeta.packOptions
        : (itemMeta.presets || [1]).map((p: number) => ({
            label: `${p} ${itemMeta.unit}`,
            qty: p,
            price: itemMeta.price * p,
          }));
      const firstOpt = packOptions[0];

      return {
        ...prev,
        [itemId]: {
          packSize: existing?.packSize !== undefined ? existing.packSize : firstOpt.qty,
          packPrice: existing?.packPrice !== undefined ? existing.packPrice : firstOpt.price,
          packLabel: existing?.packLabel || firstOpt.label,
          packCount,
        },
      };
    });
  }

  function handleClearCart() {
    setCart({});
    setEditingOrderNo(null);
    setAppliedCoupon(null);
    setCouponInput("");
    toast.info("Cart cleared");
  }

  const cartLines = useMemo(() => {
    if (!storeData?.items) return [];
    return Object.entries(cart)
      .map(([itemId, entry]: [string, any]) => {
        const item = storeData.items.find((i: any) => i.itemId === itemId);
        if (!item || !entry || !entry.packCount || entry.packCount <= 0) return null;

        const packOptions = (item.packOptions && item.packOptions.length > 0)
          ? item.packOptions
          : (item.presets || [1]).map((p: number) => ({
              label: `${p} ${item.unit}`,
              qty: p,
              price: item.price * p,
            }));

        const matchingOption = packOptions.find((o: any) => o.qty === entry.packSize) || packOptions[0];
        const packSize = Number(entry.packSize !== undefined ? entry.packSize : matchingOption.qty);
        const packPrice = Number(entry.packPrice !== undefined ? entry.packPrice : matchingOption.price);
        const packLabel = entry.packLabel || matchingOption.label || `${packSize} ${item.unit}`;
        const packCount = Number(entry.packCount || 1);
        const totalQty = Math.round(packCount * packSize * 100) / 100;
        const lineTotal = Math.round(packCount * packPrice * 100) / 100;

        return {
          item,
          packSize,
          packPrice,
          packLabel,
          packCount,
          qty: totalQty,
          lineTotal,
        };
      })
      .filter(Boolean) as any[];
  }, [cart, storeData]);

  const subtotalAmount = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotalAmount) : 0;
  const totalAmount = Math.max(0, Math.round((subtotalAmount - discountAmount) * 100) / 100);
  const totalItemCount = cartLines.length;

  async function handleApplyCoupon(codeToApply?: string) {
    const code = (codeToApply || couponInput).trim();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }
    if (subtotalAmount <= 0) {
      toast.error("Add items to your cart before applying a coupon.");
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await validateCouponAction(code, subtotalAmount);
      if (res.valid) {
        setAppliedCoupon({
          code: res.code!,
          discountAmount: res.discountAmount!,
          description: res.description!,
        });
        setCouponInput(res.code!);
        toast.success(`🎉 Coupon ${res.code} applied! Saved ₹${res.discountAmount}`);
      } else {
        toast.error(res.message || "Invalid coupon code");
      }
    } catch (err: any) {
      toast.error("Failed to validate coupon");
    } finally {
      setApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    toast.info("Coupon removed");
  }

  const filteredItems = useMemo(() => {
    if (!storeData?.items) return [];
    const q = searchQuery.toLowerCase().trim();
    return storeData.items.filter((item: any) => {
      const matchCat = activeCategory === "all" || item.categoryId === activeCategory;
      const matchBrand = activeBrand === "all" || item.brandId === activeBrand;
      const matchSearch =
        !q ||
        item.nameEn.toLowerCase().includes(q) ||
        (item.nameTa && item.nameTa.toLowerCase().includes(q)) ||
        (item.brand?.name && item.brand.name.toLowerCase().includes(q));
      return matchCat && matchBrand && matchSearch;
    });
  }, [storeData, activeCategory, activeBrand, searchQuery]);

  async function handleSubmitOrder() {
    if (cartLines.length === 0) {
      toast.error("Your cart is empty. Please add items.");
      return;
    }
    if (deliveryMode === "Door Delivery" && !address.trim()) {
      toast.error("Please enter your delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitCustomerOrderAction({
        mobile,
        cycleId: storeData.cycleId,
        deliveryMode,
        address,
        preferredTime,
        note,
        couponCode: appliedCoupon?.code,
        discountAmount: discountAmount,
        lines: cartLines.map((l) => ({
          itemId: l.item.itemId,
          packSize: l.packSize,
          packCount: l.packCount,
          packLabel: l.packLabel,
          packPrice: l.packPrice,
          qty: l.qty,
          lineTotal: l.lineTotal,
        })),
      });

      setConfirmedOrderDetails({
        orderNo: res.orderNo,
        deliveryDate: res.deliveryDate,
        isUpdate: res.isUpdate,
        subtotalAmount,
        discountAmount,
        couponCode: appliedCoupon?.code,
        totalAmount,
        itemCount: cartLines.length,
        lines: cartLines,
      });

      // 🧹 EMPTY THE CART & COUPON AFTER SUCCESSFUL ORDER PLACEMENT
      setCart({});
      setEditingOrderNo(null);
      setAppliedCoupon(null);
      setCouponInput("");

      setConfirmationModalOpen(true);
      toast.success(res.isUpdate ? `Order ${res.orderNo} updated successfully!` : `Order ${res.orderNo} confirmed!`);
      await Promise.all([loadStore(mobile), loadHistory(mobile)]);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCancelOrder() {
    if (!orderToCancel) return;
    try {
      const res = await cancelCustomerOrderAction(mobile, orderToCancel);
      toast.success(`Order ${res.orderNo} has been cancelled.`);
      setCancelModalOpen(false);
      setOrderToCancel(null);
      setCart({});
      setEditingOrderNo(null);
      await Promise.all([loadStore(mobile), loadHistory(mobile)]);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    }
  }

  const activePlacedOrder = useMemo(() => {
    return historyOrders.find((o) => o.isCurrentCycle && o.status === "Placed") || null;
  }, [historyOrders]);

  const mostRecentPastOrder = useMemo(() => {
    return historyOrders.find((o) => !o.isCurrentCycle || o.status !== "Placed") || historyOrders[0] || null;
  }, [historyOrders]);

  // 1. Initial Login Screen
  if (!mounted || !lookup || lookup.status !== "ok") {
    return (
      <BrandSplit
        eyebrow="Weekly Organic Harvest"
        headline="Naturally grown fresh produce, direct from partner farms."
        tamil="இயற்கை முறையில் விளைவிக்கப்பட்ட காய்கறிகள் மற்றும் பழங்கள்."
      >
        <div className="rounded-3xl bg-card p-6 sm:p-8 shadow-2xl border border-border">
          <div className="mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Sign In / உள்நுழைக</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
              Enter your registered mobile number to order this week's harvest.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="mobileInput" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mobile Number / அலைபேசி எண்
              </Label>
              <div className="mt-1 flex rounded-2xl border border-input bg-background shadow-inner focus-within:ring-2 focus-within:ring-primary overflow-hidden">
                <span className="flex items-center pl-4 pr-2 text-sm text-muted-foreground font-semibold">+91</span>
                <input
                  id="mobileInput"
                  type="tel"
                  maxLength={10}
                  placeholder="94895 81122"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent py-3.5 pr-4 text-base font-semibold outline-none tracking-wide"
                  autoFocus
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || phoneInput.length < 10}
              className="w-full h-12 rounded-2xl text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-lg"
            >
              {loading ? "Verifying..." : "View This Week's Harvest →"}
            </Button>
          </form>

          {/* Demo Customer Shortcuts */}
          <div className="mt-6 rounded-2xl bg-muted/60 p-3 border text-xs space-y-2">
            <div className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
              Quick Demo Customers:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fillDemoCustomer("9489581122")}
                className="py-1 px-2.5 rounded-lg bg-card hover:bg-background border text-primary font-medium text-xs shadow-sm"
              >
                👤 Sampath (9489581122)
              </button>
              <button
                type="button"
                onClick={() => fillDemoCustomer("9600012345")}
                className="py-1 px-2.5 rounded-lg bg-card hover:bg-background border text-primary font-medium text-xs shadow-sm"
              >
                👤 Lakshmi (9600012345)
              </button>
              <button
                type="button"
                onClick={() => fillDemoCustomer("9842711223")}
                className="py-1 px-2.5 rounded-lg bg-card hover:bg-background border text-primary font-medium text-xs shadow-sm"
              >
                👤 Ramasamy (9842711223)
              </button>
            </div>
          </div>

          {mounted && lookup?.status === "unknown" && (
            <div className="mt-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-center animate-in fade-in duration-300">
              <AlertCircle className="mx-auto h-7 w-7 text-amber-600 mb-2" />
              <p className="text-sm font-semibold text-foreground">Number Not Registered</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Access is restricted to pre-approved Nalla Kadai customers. Tap below to onboard with our branch team.
              </p>
              <a
                href={`https://wa.me/${lookup.whatsapp}?text=Hi%20Nalla%20Kadai%2C%20I%20would%20like%20to%20register%20for%20the%20Fresh%20Produce%20weekly%20orders.`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
              >
                <MessageSquare className="h-4 w-4" />
                Request Access on WhatsApp
              </a>
            </div>
          )}

          {mounted && lookup?.status === "alt" && (
            <div className="mt-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 text-center animate-in fade-in duration-300">
              <Phone className="mx-auto h-7 w-7 text-blue-600 mb-2" />
              <p className="text-sm font-semibold text-foreground">Alternate Number Detected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This is registered as an alternate contact number. Please sign in using your primary registered number (ending in {lookup.primaryHint}).
              </p>
            </div>
          )}

          {mounted && lookup?.status === "closed" && (
            <div className="mt-6 rounded-2xl bg-primary/10 border border-primary/20 p-4 text-center animate-in fade-in duration-300">
              <Clock className="mx-auto h-7 w-7 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">Store Currently Closed</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {lookup.nextOpening || "Our Fresh store will open soon for the next harvest round."}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <a
                  href={`tel:${lookup.support}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Support
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-4 text-center">
            <a href="/admin/login" className="text-xs text-muted-foreground hover:text-foreground transition underline font-medium">
              Staff & Administrator Portal →
            </a>
          </div>
        </div>
      </BrandSplit>
    );
  }

  // 2. Main Storefront Mobile Web App Layout with Bottom Navigation Bar
  return (
    <div className="min-h-screen bg-[#faf8f5] pb-28 text-foreground flex flex-col justify-between overflow-x-hidden w-full max-w-full">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/images/logo.jpg" alt="Logo" className="h-10 w-10 rounded-2xl object-contain bg-white p-1 shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg font-bold leading-tight">Fresh Nalla Kadai</h1>
                <Badge variant="secondary" className="bg-olive text-white text-[10px] px-2 py-0.5 rounded-full">
                  {lookup.branch.name}
                </Badge>
              </div>
              <p className="text-xs text-primary-foreground/90 font-tamil">வணக்கம், {lookup.customer.name}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-primary-foreground/80 hover:bg-primary-foreground/15 hover:text-white rounded-xl px-2"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Harvest Cycle Mini Bar */}
        <div className="bg-maroon-dark/80 border-t border-white/10 px-4 py-1.5 text-center text-xs text-primary-foreground/90 flex items-center justify-center gap-2">
          <Clock className="h-3.5 w-3.5 text-gold animate-pulse" />
          <span suppressHydrationWarning>
            Cycle <strong>#{lookup.cycle.cycleNo}</strong> • Tuesday Delivery:{" "}
            <strong>{lookup.cycle.deliveryDate || "Scheduled Date"}</strong>
          </span>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="mx-auto max-w-xl w-full px-4 pt-4 flex-1">
        {/* ========================================================================= */}
        {/* TAB 1: 🏠 HOME TAB                                                       */}
        {/* ========================================================================= */}
        {activeTab === "home" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Welcoming Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-maroon-dark text-white p-6 shadow-xl">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-gold" />
                  <span>Cycle #{lookup.cycle.cycleNo} Open for Orders</span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                  Farm-fresh organic harvest delivered to your doorstep.
                </h2>
                <p className="text-xs sm:text-sm text-white/80 font-tamil">
                  இயற்கை முறையில் விளைவிக்கப்பட்ட காய்கறிகள், கீரைகள் மற்றும் பால் பொருட்கள்.
                </p>

                {!activePlacedOrder && (
                  <div className="pt-2 flex flex-wrap gap-2.5">
                    <Button
                      onClick={() => setActiveTab("order")}
                      className="rounded-2xl bg-gold hover:bg-gold/90 text-maroon-dark font-bold text-sm h-11 px-5 shadow-lg flex items-center gap-2"
                    >
                      <ShoppingBag className="h-4 w-4" /> Start Ordering Now →
                    </Button>

                    {mostRecentPastOrder && (
                      <Button
                        variant="outline"
                        onClick={() => handleRepeatOrder(mostRecentPastOrder)}
                        className="rounded-2xl border-white/30 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs h-11 px-4 backdrop-blur-md flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Repeat Last Order
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Active Order Alert Card (If user has placed an order this cycle) */}
            {activePlacedOrder && (
              <div className="rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/10 p-5 shadow-md space-y-3 animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                      <Check className="h-5 w-5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-bold text-base text-foreground">
                          Order Active: {activePlacedOrder.order_no}
                        </h3>
                        <Badge className="bg-emerald-600 text-white text-[10px]">Placed</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activePlacedOrder.order_items?.length || activePlacedOrder.lines?.length || 0} items • Tentative Total: ₹{activePlacedOrder.tentativeTotal}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-background/80 rounded-2xl p-3 text-xs space-y-1.5 border">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Mode:</span>
                    <span className="font-semibold text-foreground">{activePlacedOrder.delivery_mode}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Expected Date:</span>
                    <span className="font-semibold text-primary">{lookup.cycle.deliveryDate || "Scheduled Date"}</span>
                  </div>
                  {lookup.branch?.collectionTiming && activePlacedOrder.delivery_mode === "Customer Pickup" && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Pickup Window:</span>
                      <span className="font-semibold text-primary">{lookup.branch.collectionTiming}</span>
                    </div>
                  )}
                  {lookup.branch?.googleMapsUrl && activePlacedOrder.delivery_mode === "Customer Pickup" && (
                    <div className="pt-1 border-t border-border/50 flex justify-between items-center">
                      <span className="text-muted-foreground">Location:</span>
                      <a
                        href={lookup.branch.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline text-[11px]"
                      >
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        Open Google Maps <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={() => handleStartEditingOrder(activePlacedOrder)}
                    className="flex-1 rounded-2xl bg-primary text-white text-xs font-bold h-10 shadow gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit My Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOrderToCancel(activePlacedOrder.id);
                      setCancelModalOpen(true);
                    }}
                    className="rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold h-10 px-3"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Order
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Categories Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg text-foreground">Explore Harvest Categories</h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("all");
                    setActiveBrand("all");
                    setActiveTab("order");
                  }}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  View All ({storeData?.items?.length || 0}) →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {storeData?.categories?.map((cat: any) => {
                  const Icon = categoryIcon(cat.name.toLowerCase());
                  const count = storeData?.items?.filter((i: any) => i.categoryId === cat.id).length || 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setActiveBrand("all");
                        setActiveTab("order");
                      }}
                      className="p-4 rounded-3xl border bg-card text-left shadow-sm hover:shadow-md transition flex flex-col justify-between gap-3 group"
                      style={{ borderLeftColor: cat.tint || "#EAF3DD", borderLeftWidth: "4px" }}
                    >
                      <div className="flex items-center justify-between">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="h-10 w-10 rounded-2xl object-cover border shadow-inner"
                          />
                        ) : (
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-inner text-foreground"
                            style={{ backgroundColor: cat.tint || "#EAF3DD" }}
                          >
                            <Icon className="h-5 w-5 group-hover:scale-110 transition" />
                          </div>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {count} Items
                        </Badge>
                      </div>

                      <div>
                        <div className="font-bold text-sm text-foreground">{cat.name}</div>
                        <div className="text-xs text-muted-foreground font-tamil">{cat.nameTa}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trust & Safeguard Card */}
            <div className="rounded-3xl bg-card border p-4 shadow-sm flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-olive/10 text-olive">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Chemical-Free & Naturally Grown:</strong> All produce is harvested fresh on Monday from verified local organic farms for Tuesday morning dispatch.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 🧺 ORDER / SHOP CATALOGUE TAB                                     */}
        {/* ========================================================================= */}
        {activeTab === "order" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Bar & Repeat Last Order */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search vegetables, fruits, brands... / தேடுங்கள்"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-input bg-card py-3 pl-10 pr-4 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {mostRecentPastOrder && (
                <Button
                  variant="outline"
                  onClick={() => handleRepeatOrder(mostRecentPastOrder)}
                  className="rounded-2xl border-primary/30 bg-card text-primary font-bold text-xs px-3.5 hover:bg-primary/5 flex items-center gap-1.5 shadow-sm h-11"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Same as Last
                </Button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold whitespace-nowrap shadow-sm transition ${
                  activeCategory === "all"
                    ? "bg-olive text-white shadow-olive/30 scale-105"
                    : "bg-card text-muted-foreground border border-border hover:bg-muted"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                All Categories
              </button>
              {storeData?.categories?.map((cat: any) => {
                const Icon = categoryIcon(cat.name.toLowerCase());
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold whitespace-nowrap shadow-sm transition ${
                      isActive
                        ? "bg-olive text-white shadow-olive/30 scale-105"
                        : "bg-card text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-80 font-tamil">{cat.nameTa}</span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Switcher Bar */}
            <div className="flex items-center justify-between px-1 pt-0.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Showing {filteredItems.length} fresh produce item(s)
              </span>
              <div className="flex items-center bg-muted/80 p-0.5 rounded-2xl border border-border/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("grid")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                    viewMode === "grid"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="2-Column Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("list")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                    viewMode === "list"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Detailed List View"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>List</span>
                </button>
              </div>
            </div>

            {/* Sticky Floating View Cart & Checkout Bar */}
            {cartLines.length > 0 && (
              <div className="sticky top-16 z-30 my-1 animate-in slide-in-from-top-2 duration-200">
                <div className="rounded-2xl bg-gradient-to-r from-primary to-maroon-dark text-white p-3 px-4 shadow-xl flex items-center justify-between gap-3 border border-white/20">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center font-bold font-mono text-xs">
                      {cartLines.length}
                    </div>
                    <div>
                      <div className="text-[11px] opacity-90">{cartLines.length} items in your basket</div>
                      <div className="text-xs font-bold font-mono">₹{subtotalAmount.toFixed(2)}</div>
                    </div>
                  </div>

                  <Button
                    onClick={() => setActiveTab("cart")}
                    className="rounded-xl bg-gold hover:bg-gold/90 text-maroon-dark font-bold text-xs h-9 px-3.5 shadow"
                  >
                    View Cart & Checkout →
                  </Button>
                </div>
              </div>
            )}

            {/* Categorized Produce List or Grid */}
            {storeLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
                <div className="h-10 w-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                <span className="font-tamil text-xs">அறுவடை பொருட்கள் பட்டியல் ஏற்றப்படுகிறது...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-3xl bg-card p-10 text-center text-muted-foreground border shadow-sm">
                No produce found matching your search.
              </div>
            ) : viewMode === "grid" ? (
              /* ========================================================================= */
              /* 2-COLUMN COMPACT GRID VIEW                                                */
              /* ========================================================================= */
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item: any) => {
                  const entry = cart[item.itemId];
                  const packOptions: any[] = (item.packOptions && item.packOptions.length > 0)
                    ? item.packOptions
                    : (item.presets || [1]).map((p: number) => ({
                        label: `${p} ${item.unit || "Kg"}`,
                        qty: p,
                        price: Math.round((item.price || 0) * p * 100) / 100,
                      }));

                  const defaultOpt = packOptions[0] || { qty: 1, label: `1 ${item.unit || "Kg"}`, price: item.price || 0 };
                  const activeOption = packOptions.find((opt) => opt.qty === entry?.packSize) || defaultOpt;
                  const activePackSize = activeOption?.qty ?? (item.presets?.[0] || 1);
                  const activePackPrice = entry?.packPrice !== undefined ? entry.packPrice : (activeOption?.price ?? ((item.price || 0) * activePackSize));
                  const activePackLabel = entry?.packLabel || activeOption?.label || `${activePackSize} ${item.unit || "Kg"}`;
                  const packCount = entry?.packCount || 0;
                  const isSelected = packCount > 0;

                  return (
                    <div
                      key={item.itemId}
                      className={`rounded-3xl border bg-card p-3 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-2.5 ${
                        isSelected ? "border-primary/50 ring-2 ring-primary/20 bg-primary/[0.02]" : ""
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Top Image & Badges */}
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/40 border shadow-inner">
                          <GenericProduceImage
                            src={item.imageUrl}
                            alt={item.nameEn}
                            fallbackType="product"
                            className="w-full h-full object-cover"
                          />
                          {item.soldOut && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                              <Badge variant="destructive" className="text-[10px] font-bold">
                                Sold Out
                              </Badge>
                            </div>
                          )}
                          {item.discountPercent > 0 && !item.soldOut && (
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold shadow">
                                {item.discountPercent}% OFF
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Produce Title & Tamil */}
                        <div>
                          <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-1">{item.nameEn}</h3>
                          <p className="text-[11px] font-tamil text-muted-foreground truncate">{item.nameTa}</p>
                          {item.brand && (
                            <p className="text-[10px] text-primary/80 font-medium truncate">{item.brand.name}</p>
                          )}
                        </div>

                        {/* Price & Unit */}
                        {lookup.branch.showPrices && (
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm font-extrabold text-primary font-mono">
                              ₹{item.price}
                              <span className="text-[10px] font-normal text-muted-foreground">/{item.unit}</span>
                            </span>
                            {item.sellingPrice && item.sellingPrice > item.price && (
                              <span className="text-[10px] text-muted-foreground line-through font-mono">
                                ₹{item.sellingPrice}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pack Options & Stepper */}
                      {!item.soldOut && (
                        <div className="space-y-2 pt-1 border-t border-border/40">
                          {/* Pack chips */}
                          <div className="no-scrollbar flex gap-1 overflow-x-auto pb-0.5">
                            {packOptions.map((opt: any) => {
                              const isPackActive = activePackSize === opt.qty;
                              return (
                                <button
                                  key={opt.label || opt.qty}
                                  type="button"
                                  onClick={() => handleSelectPack(item.itemId, opt, item)}
                                  className={`rounded-xl px-2 py-1 text-[10px] font-bold transition shrink-0 ${
                                    isPackActive
                                      ? "bg-primary text-white shadow-xs"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border/50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Total & Add / Stepper */}
                          <div className="flex items-center justify-between gap-1">
                            {isSelected ? (
                              <div className="w-full flex items-center justify-between border border-primary/30 rounded-xl bg-background shadow-xs overflow-hidden h-8">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePackCount(item.itemId, packCount - 1, item)}
                                  className="h-full px-2 flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[11px] font-bold font-mono text-foreground px-1">
                                  {packCount} pk
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePackCount(item.itemId, packCount + 1, item)}
                                  className="h-full px-2 flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleUpdatePackCount(item.itemId, 1, item)}
                                className="w-full rounded-xl bg-primary text-white font-bold text-xs h-8 shadow-xs gap-1 hover:bg-primary/90 active:scale-95 transition"
                              >
                                <Plus className="h-3 w-3" /> Add
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ========================================================================= */
              /* DETAILED LIST VIEW                                                        */
              /* ========================================================================= */
              <div className="space-y-3">
                {filteredItems.map((item: any) => {
                  const entry = cart[item.itemId];
                  const packOptions: any[] = (item.packOptions && item.packOptions.length > 0)
                    ? item.packOptions
                    : (item.presets || [1]).map((p: number) => ({
                        label: `${p} ${item.unit || "Kg"}`,
                        qty: p,
                        price: Math.round((item.price || 0) * p * 100) / 100,
                      }));

                  const defaultOpt = packOptions[0] || { qty: 1, label: `1 ${item.unit || "Kg"}`, price: item.price || 0 };
                  const activeOption = packOptions.find((opt) => opt.qty === entry?.packSize) || defaultOpt;
                  const activePackSize = activeOption?.qty ?? (item.presets?.[0] || 1);
                  const activePackPrice = entry?.packPrice !== undefined ? entry.packPrice : (activeOption?.price ?? ((item.price || 0) * activePackSize));
                  const activePackLabel = entry?.packLabel || activeOption?.label || `${activePackSize} ${item.unit || "Kg"}`;
                  const packCount = entry?.packCount || 0;
                  const isSelected = packCount > 0;

                  return (
                    <div
                      key={item.itemId}
                      className={`rounded-3xl border bg-card p-4 shadow-sm hover:shadow-md transition space-y-3 ${
                        isSelected ? "border-primary/40 ring-1 ring-primary/20 bg-primary/[0.02]" : ""
                      }`}
                    >
                      {/* Top Row: Produce Image + Names + Base Price */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <GenericProduceImage
                            src={item.imageUrl}
                            alt={item.nameEn}
                            fallbackType="product"
                            className="h-14 w-14 rounded-2xl object-cover border shadow-sm shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-base text-foreground leading-snug truncate">{item.nameEn}</h3>
                              {item.soldOut && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Sold Out
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs font-tamil text-muted-foreground mt-0.5">{item.nameTa}</p>
                            {item.brand && (
                              <p className="text-[11px] text-primary/80 font-medium">{item.brand.name}</p>
                            )}
                          </div>
                        </div>

                        {lookup.branch.showPrices && (
                          <div className="text-right shrink-0">
                            <p className="text-base font-extrabold text-primary font-mono leading-tight">
                              ₹{item.price}
                              <span className="text-[11px] font-normal text-muted-foreground">/{item.unit}</span>
                            </p>
                            {item.sellingPrice && item.sellingPrice > item.price && (
                              <p className="text-[11px] text-muted-foreground line-through font-mono">
                                ₹{item.sellingPrice}
                              </p>
                            )}
                            {item.discountPercent > 0 && (
                              <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold mt-0.5">
                                {item.discountPercent}% OFF
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Middle Row: Full-width Touch-Friendly Pack Variant Chips */}
                      {!item.soldOut && (
                        <div className="space-y-2 pt-1 border-t border-border/40">
                          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                            <span>Select Pack Size:</span>
                            {activeOption?.savingsText && (
                              <span className="text-emerald-700 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                {activeOption.savingsText}
                              </span>
                            )}
                          </div>

                          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                            {packOptions.map((opt: any) => {
                              const isPackActive = activePackSize === opt.qty;
                              return (
                                <button
                                  key={opt.label || opt.qty}
                                  type="button"
                                  onClick={() => handleSelectPack(item.itemId, opt, item)}
                                  className={`relative rounded-2xl px-3 py-1.5 text-xs font-bold transition shadow-xs flex flex-col items-center shrink-0 min-w-[70px] ${
                                    isPackActive
                                      ? "bg-primary text-white shadow-sm scale-102"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border/60"
                                  }`}
                                >
                                  <span className="whitespace-nowrap">{opt.label}</span>
                                  {lookup.branch.showPrices && opt.price !== undefined && (
                                    <span
                                      className={`text-[11px] font-mono mt-0.5 ${
                                        isPackActive ? "text-white/95" : "text-foreground font-semibold"
                                      }`}
                                    >
                                      ₹{opt.price}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Bottom Row: Selected Calculation Summary & Mobile Stepper Button */}
                          <div className="flex items-center justify-between pt-1 gap-2">
                            <div className="text-xs">
                              {isSelected ? (
                                <div>
                                  <span className="font-bold text-emerald-800">
                                    {packCount} × {activePackLabel}
                                  </span>
                                  {lookup.branch.showPrices && (
                                    <span className="font-bold text-primary font-mono ml-1">
                                      = ₹{Math.round(packCount * activePackPrice * 100) / 100}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Tap pack & add quantity</span>
                              )}
                            </div>

                            {/* Large Touch Target Stepper / Add Button */}
                            {isSelected ? (
                              <div className="flex items-center border border-primary/30 rounded-2xl bg-background shadow-xs overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePackCount(item.itemId, packCount - 1, item)}
                                  className="h-9 w-9 flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-14 text-center text-xs font-bold font-mono text-foreground">
                                  {packCount} {packCount > 1 ? "Pks" : "Pk"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePackCount(item.itemId, packCount + 1, item)}
                                  className="h-9 w-9 flex items-center justify-center text-primary hover:bg-primary/10 active:scale-95 transition"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleUpdatePackCount(item.itemId, 1, item)}
                                className="rounded-2xl bg-primary text-white font-bold text-xs h-9 px-4 shadow-sm gap-1 hover:bg-primary/90 active:scale-95 transition"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Bottom Proceed to Cart Button */}
                {cartLines.length > 0 && (
                  <div className="pt-4 pb-2">
                    <Button
                      onClick={() => setActiveTab("cart")}
                      className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/95 text-white font-bold text-sm shadow-lg gap-2"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Proceed to Cart & Review Order ({cartLines.length} Items • ₹{subtotalAmount.toFixed(2)}) →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 🛒 CART & CHECKOUT TAB                                            */}
        {/* ========================================================================= */}
        {activeTab === "cart" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-foreground">Your Order Cart</h2>
              {cartLines.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs text-muted-foreground hover:text-destructive transition flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Cart
                </button>
              )}
            </div>

            {/* Editing Active Order Banner */}
            {editingOrderNo && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Editing active order <strong>{editingOrderNo}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingOrderNo(null);
                    setCart({});
                  }}
                  className="text-[11px] underline text-amber-800 hover:text-black font-semibold"
                >
                  Cancel Edit
                </button>
              </div>
            )}

            {cartLines.length === 0 ? (
              <div className="rounded-3xl bg-card p-10 text-center text-muted-foreground border shadow-sm space-y-3">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="text-base font-semibold text-foreground">Your cart is currently empty</p>
                <p className="text-xs text-muted-foreground">
                  Browse this week's harvest catalogue and select your farm-fresh vegetables, greens and fruits.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
                  <Button
                    onClick={() => setActiveTab("order")}
                    className="rounded-2xl bg-primary text-white font-bold text-xs h-11 px-6 shadow-md"
                  >
                    Browse Produce Catalog →
                  </Button>
                  {mostRecentPastOrder && (
                    <Button
                      variant="outline"
                      onClick={() => handleRepeatOrder(mostRecentPastOrder)}
                      className="rounded-2xl border-primary/30 text-primary font-bold text-xs h-11 px-4"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Repeat Previous Order
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Cart Lines */}
                <div className="rounded-3xl bg-card p-4 sm:p-5 border shadow-sm divide-y">
                  {cartLines.map(({ item, packSize, packPrice, packLabel, packCount, qty, lineTotal }) => (
                    <div key={item.itemId} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <GenericProduceImage
                          src={item.imageUrl}
                          alt={item.nameEn}
                          fallbackType="product"
                          className="h-12 w-12 rounded-2xl object-cover border shadow-sm shrink-0"
                        />
                        <div>
                          <div className="font-bold text-sm sm:text-base text-foreground">{item.nameEn}</div>
                          <div className="text-xs text-muted-foreground font-tamil">{item.nameTa}</div>
                          <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                            {packCount} {packCount > 1 ? "Packs" : "Pack"} × {packLabel}
                            {qty !== packCount && ` (${qty} ${item.unit})`}
                          </div>
                          {lookup.branch.showPrices && (
                            <div className="text-xs text-primary font-bold mt-0.5">
                              ₹{lineTotal.toFixed(2)} {packCount > 1 && `(₹${packPrice} / pk)`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center border rounded-xl bg-background shadow-inner">
                          <button
                            type="button"
                            onClick={() => handleUpdatePackCount(item.itemId, packCount - 1, item)}
                            className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold">
                            {packCount} {packCount > 1 ? "Pks" : "Pk"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdatePackCount(item.itemId, packCount + 1, item)}
                            className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUpdatePackCount(item.itemId, 0, item)}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Code Redemption Box */}
                <div className="rounded-3xl bg-card p-4 sm:p-5 border shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <TicketPercent className="h-4 w-4 text-primary" />
                    <span>Apply Promo / Coupon Code</span>
                  </div>

                  {appliedCoupon ? (
                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          <Percent className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                            <span>{appliedCoupon.code}</span>
                            <Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5">Applied</Badge>
                          </div>
                          <div className="text-xs text-emerald-800 font-medium">
                            {appliedCoupon.description} (Saved ₹{discountAmount.toFixed(2)})
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Enter code (e.g. WELCOME10)"
                          className="rounded-2xl font-mono text-xs uppercase h-11"
                        />
                        <Button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={applyingCoupon || !couponInput.trim()}
                          className="rounded-2xl bg-primary text-white font-bold text-xs h-11 px-5 shadow"
                        >
                          {applyingCoupon ? "Applying..." : "Apply"}
                        </Button>
                      </div>

                      {/* Quick Available Offers */}
                      {storeData?.coupons && storeData.coupons.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground">Available offers:</span>
                          {storeData.coupons.map((cp: any) => (
                            <button
                              key={cp.id}
                              type="button"
                              onClick={() => handleApplyCoupon(cp.code)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/20 px-2.5 py-1 rounded-xl transition"
                            >
                              <Sparkles className="h-3 w-3 text-amber-600" />
                              <span>{cp.code}</span>
                              <span className="text-[10px] opacity-75">
                                ({cp.discount_type === "percentage" ? `${cp.discount_value}%` : `₹${cp.discount_value}`})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delivery Mode & Address Card */}
                <div className="rounded-3xl bg-card p-4 sm:p-5 border shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Delivery Preferences
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryMode("Door Delivery")}
                      className={`p-3.5 rounded-2xl border text-left transition ${
                        deliveryMode === "Door Delivery"
                          ? "border-primary bg-primary/5 font-bold text-primary shadow-sm"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <Truck className="h-5 w-5 mb-1 text-primary" />
                      <div className="text-xs">Door Delivery</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMode("Customer Pickup")}
                      className={`p-3.5 rounded-2xl border text-left transition ${
                        deliveryMode === "Customer Pickup"
                          ? "border-primary bg-primary/5 font-bold text-primary shadow-sm"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <ShoppingBasket className="h-5 w-5 mb-1 text-olive" />
                      <div className="text-xs">Store Pickup</div>
                    </button>
                  </div>

                  {deliveryMode === "Door Delivery" ? (
                    <div>
                      <Label className="text-xs text-muted-foreground">Delivery Address / முகவரி</Label>
                      <Textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Door No, Street, Landmark, Area"
                        className="mt-1 rounded-2xl text-sm"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-muted/60 p-3.5 text-xs text-muted-foreground space-y-1.5 border">
                      <div className="font-semibold text-foreground">Pickup Location:</div>
                      <div>{lookup.branch.pickupAddress || "Standard Store Pickup"}</div>
                      <div className="text-primary font-medium">Timing: {lookup.branch.collectionTiming}</div>
                      {lookup.branch?.googleMapsUrl && (
                        <div className="pt-1 border-t border-border/50">
                          <a
                            href={lookup.branch.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline text-xs bg-primary/10 px-2.5 py-1.5 rounded-xl"
                          >
                            <MapPin className="h-3.5 w-3.5 text-red-500" />
                            Open in Google Maps <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Special Instructions / குறிப்பு (Optional)</Label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Leave with security, call on arrival"
                      className="mt-1 rounded-2xl text-sm h-11"
                    />
                  </div>
                </div>

                {/* Merge Notice if placing additional items with existing active order */}
                {activePlacedOrder && !editingOrderNo && (
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-950 flex items-start gap-2.5 shadow-xs">
                    <Sparkles className="h-4 w-4 shrink-0 text-emerald-700 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold">Appending to Active Order {activePlacedOrder.order_no}</div>
                      <p className="text-[11px] text-emerald-800">
                        These items will be merged seamlessly into your open cycle order. Your previous items are retained safely.
                      </p>
                    </div>
                  </div>
                )}

                {/* Cart Subtotal, Discount & Final Bill */}
                <div className="rounded-3xl bg-card p-4 sm:p-5 border shadow-sm space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal ({cartLines.length} Items):</span>
                    <span className="font-semibold text-foreground font-mono">₹{subtotalAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                      <span>Promo Discount ({appliedCoupon?.code}):</span>
                      <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-2 border-t text-foreground">
                    <span>Estimated Total:</span>
                    <span className="text-lg text-primary font-mono font-extrabold">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Tentative Notice */}
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-900 leading-relaxed">
                  <strong>Notice:</strong> This is an estimated order amount. The final bill will be confirmed based on actual harvested weight upon packing at the branch.
                </div>

                {/* Submit / Update Order Button */}
                <Button
                  onClick={handleSubmitOrder}
                  disabled={submitting || cartLines.length === 0}
                  className="w-full h-14 rounded-2xl bg-primary text-white text-base font-bold shadow-xl hover:bg-primary/90 transition"
                >
                  {submitting
                    ? "Submitting..."
                    : editingOrderNo
                    ? `Update Order (${editingOrderNo}) • ₹${totalAmount.toFixed(2)}`
                    : activePlacedOrder
                    ? `Append to Order (${activePlacedOrder.order_no}) • ₹${totalAmount.toFixed(2)}`
                    : `Confirm & Place Order • ₹${totalAmount.toFixed(2)}`}
                </Button>
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 📜 HISTORY & PAST ORDERS TAB                                      */}
        {/* ========================================================================= */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h2 className="text-xl font-serif font-bold text-foreground">Your Order History</h2>

            {historyOrders.length === 0 ? (
              <div className="rounded-3xl bg-card p-10 text-center text-muted-foreground border shadow-sm">
                No orders recorded yet. Place your first organic produce order today!
              </div>
            ) : (
              historyOrders.map((o) => (
                <div
                  key={o.id}
                  className={`rounded-3xl bg-card p-5 border shadow-sm space-y-3.5 ${
                    o.isCurrentCycle && o.status === "Placed"
                      ? "ring-2 ring-emerald-500/40 bg-emerald-500/[0.03]"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-primary font-mono">{o.order_no}</span>
                        {o.isCurrentCycle && (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Active Cycle</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : ""}
                      </span>
                    </div>

                    <Badge variant={o.status === "Placed" ? "default" : "destructive"}>
                      {o.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs divide-y divide-border/40">
                    {(o.order_items || o.lines || []).map((item: any) => (
                      <div key={item.id || item.item_id} className="pt-1.5 flex justify-between items-center text-muted-foreground">
                        <span>
                          {item.name_en} <span className="font-tamil text-[11px]">({item.name_ta})</span>
                        </span>
                        <span className="font-bold text-foreground">
                          {item.qty} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/50 rounded-2xl p-3 text-xs flex items-center justify-between text-muted-foreground">
                    <span>Delivery: <strong>{o.delivery_mode}</strong></span>
                    <span>Tentative Total: <strong className="text-primary font-bold">₹{o.tentativeTotal}</strong></span>
                  </div>

                  {/* Actions: Repeat Order on ALL orders + Edit/Cancel if active */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
                    <Button
                      onClick={() => handleRepeatOrder(o)}
                      className="flex-1 rounded-xl bg-olive text-white text-xs font-bold h-9 shadow gap-1.5 hover:bg-olive/90 min-w-[150px]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Repeat This Order
                    </Button>

                    {o.isCurrentCycle && o.status === "Placed" && (
                      <>
                        <Button
                          onClick={() => handleStartEditingOrder(o)}
                          className="rounded-xl bg-primary text-white text-xs font-bold h-9 px-3 shadow gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setOrderToCancel(o.id);
                            setCancelModalOpen(true);
                          }}
                          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold h-9 px-3"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Order
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar (Persistent across app) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl">
        <div className="mx-auto flex max-w-xl items-center justify-around py-2 px-1">
          {/* Home Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition ${
              activeTab === "home"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className={`h-5 w-5 ${activeTab === "home" ? "stroke-[2.5]" : ""}`} />
            <span className="text-[11px] mt-0.5">Home</span>
          </button>

          {/* Order Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("order")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition ${
              activeTab === "order"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className={`h-5 w-5 ${activeTab === "order" ? "stroke-[2.5]" : ""}`} />
            <span className="text-[11px] mt-0.5">Order</span>
          </button>

          {/* Cart Tab with Badge */}
          <button
            type="button"
            onClick={() => setActiveTab("cart")}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition ${
              activeTab === "cart"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className={`h-5 w-5 ${activeTab === "cart" ? "stroke-[2.5]" : ""}`} />
            {totalItemCount > 0 && (
              <span className="absolute top-0 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow">
                {totalItemCount}
              </span>
            )}
            <span className="text-[11px] mt-0.5">Cart</span>
          </button>

          {/* History Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              loadHistory();
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition ${
              activeTab === "history"
                ? "text-primary font-bold scale-105"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className={`h-5 w-5 ${activeTab === "history" ? "stroke-[2.5]" : ""}`} />
            <span className="text-[11px] mt-0.5">History</span>
          </button>
        </div>
      </nav>

      {/* Cancel Order Confirmation Dialog */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Cancel Active Order?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to cancel this order before the harvest cutoff? You can always place a new order anytime before the store closes.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)} className="rounded-xl">
                Keep Order
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmCancelOrder}
                className="rounded-xl font-bold"
              >
                Yes, Cancel Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Confirmed / Updated Receipt Modal */}
      <Dialog
        open={confirmationModalOpen}
        onOpenChange={(open) => {
          setConfirmationModalOpen(open);
          if (!open) {
            setActiveTab("home");
          }
        }}
      >
        <DialogContent className="rounded-3xl max-w-sm text-center">
          <div className="relative mx-auto my-2 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30">
              <Check className="h-10 w-10 stroke-[3.5] animate-in zoom-in-50 duration-300" />
            </div>
          </div>

          <DialogTitle className="font-serif text-2xl font-bold text-foreground">
            {confirmedOrderDetails?.isUpdate ? "Order Updated!" : "Order Confirmed!"}
          </DialogTitle>
          <p className="text-xs font-tamil text-muted-foreground">உங்கள் ஆர்டர் வெற்றிகரமாக பதிவு செய்யப்பட்டது.</p>

          <div className="rounded-2xl bg-muted/60 p-4 text-left space-y-2 text-xs border my-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Number:</span>
              <span className="font-bold text-primary font-mono text-sm">{confirmedOrderDetails?.orderNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scheduled Delivery:</span>
              <span className="font-semibold text-foreground">{confirmedOrderDetails?.deliveryDate}</span>
            </div>
            {confirmedOrderDetails?.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Coupon ({confirmedOrderDetails?.couponCode}):</span>
                <span>-₹{confirmedOrderDetails?.discountAmount?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 font-bold">
              <span className="text-muted-foreground">Estimated Amount:</span>
              <span className="text-primary font-mono text-sm">₹{confirmedOrderDetails?.totalAmount?.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={() => {
              setConfirmationModalOpen(false);
              setActiveTab("home");
            }}
            className="w-full rounded-2xl bg-primary text-white font-bold h-12 shadow"
          >
            Done / முகப்புப் பக்கம் செல்க
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
