"use client";

import React, { useEffect, useState } from "react";
import { getBranchesAction, saveBranchAction } from "@/lib/actions/admin";
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
import { Plus, Edit, Building2, Phone, MessageSquare, MapPin, ExternalLink, Hash } from "lucide-react";
import { toast } from "sonner";

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("ERD");
  const [orderPrefix, setOrderPrefix] = useState("ERD");
  const [nextOrderNumber, setNextOrderNumber] = useState<number>(1001);
  const [address, setAddress] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [supportNumber, setSupportNumber] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [collectionTiming, setCollectionTiming] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [showPrices, setShowPrices] = useState(true);
  const [nextOpeningNote, setNextOpeningNote] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadBranches();
  }, []);

  async function loadBranches() {
    setLoading(true);
    try {
      const list = await getBranchesAction();
      setBranches(list);
    } catch (err: any) {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingBranch(null);
    setName("");
    setCode("ERD");
    setOrderPrefix("ERD");
    setNextOrderNumber(1001);
    setAddress("");
    setWhatsappNumber("919489581122");
    setSupportNumber("919489581122");
    setPickupAddress("");
    setCollectionTiming("Tuesday 8:00 AM – 12:00 PM");
    setGoogleMapsUrl("");
    setShowPrices(true);
    setNextOpeningNote("");
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(b: any) {
    setEditingBranch(b);
    setName(b.name);
    setCode(b.code || b.name?.slice(0, 3)?.toUpperCase() || "ERD");
    setOrderPrefix(b.order_prefix || b.code || b.name?.slice(0, 3)?.toUpperCase() || "ERD");
    setNextOrderNumber(Number(b.next_order_number || 1001));
    setAddress(b.address || "");
    setWhatsappNumber(b.whatsapp_number || "");
    setSupportNumber(b.support_number || "");
    setPickupAddress(b.pickup_address || "");
    setCollectionTiming(b.collection_timing || "");
    setGoogleMapsUrl(b.google_maps_url || "");
    setShowPrices(b.show_prices);
    setNextOpeningNote(b.next_opening_note || "");
    setActive(b.active);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveBranchAction("demo-admin", {
        id: editingBranch?.id,
        name,
        code,
        orderPrefix,
        nextOrderNumber,
        address,
        whatsappNumber,
        supportNumber,
        pickupAddress,
        collectionTiming,
        googleMapsUrl,
        showPrices,
        nextOpeningNote: nextOpeningNote || undefined,
        active,
      });

      toast.success(editingBranch ? "Branch updated!" : "Branch created!");
      setModalOpen(false);
      loadBranches();
    } catch (err: any) {
      toast.error(err.message || "Failed to save branch");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Branches & Outlets</h1>
          <p className="text-xs text-muted-foreground">
            Configure branch phone numbers, WhatsApp onboarding links, and pickup schedules
          </p>
        </div>

        <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5">
          <Plus className="h-4 w-4" /> Add Branch
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading branches...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <Card key={b.id} className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg">{b.name} Branch</h3>
                    <p className="text-xs text-muted-foreground">{b.address || "No address entered"}</p>
                  </div>
                </div>
                <Badge variant={b.active ? "default" : "destructive"}>{b.active ? "Active" : "Inactive"}</Badge>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Order Series: <strong>{(b.order_prefix || b.code || "ERD").toUpperCase()}-XXXX</strong>{" "}
                    <span className="text-muted-foreground font-mono">(Next: #{(b.order_prefix || b.code || "ERD").toUpperCase()}-{b.next_order_number || 1001})</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  <span>WhatsApp: <strong>+{b.whatsapp_number}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>Support: <strong>+{b.support_number}</strong></span>
                </div>
                <div>Pickup Point: <strong>{b.pickup_address || "Standard Store Address"}</strong></div>
                <div>Collection Timing: <strong>{b.collection_timing || "Tuesday morning"}</strong></div>
                {b.google_maps_url && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                    <a
                      href={b.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      Google Maps Location <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => openEditModal(b)} className="rounded-xl text-xs gap-1">
                  <Edit className="h-3.5 w-3.5" /> Edit Configuration
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingBranch ? "Edit Branch Details" : "Create New Branch"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Branch Name</Label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingBranch && (!orderPrefix || orderPrefix === "ERD")) {
                    const autoCode = (e.target.value.slice(0, 3) || "ERD").toUpperCase();
                    setCode(autoCode);
                    setOrderPrefix(autoCode);
                  }
                }}
                placeholder="e.g. Erode / Coimbatore / Tiruppur"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            {/* Order Sequence Configuration */}
            <div className="p-3 bg-muted/40 rounded-2xl border space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" /> Order Series Configuration
                </Label>
                <Badge variant="outline" className="text-[10px] font-mono bg-white text-primary font-bold">
                  Preview: {(orderPrefix || code || "ERD").toUpperCase().trim()}-{nextOrderNumber || 1001}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Order Prefix / Code</Label>
                  <Input
                    value={orderPrefix}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setOrderPrefix(val);
                      setCode(val);
                    }}
                    placeholder="e.g. ERD, CBE, TPR"
                    className="mt-1 rounded-xl text-sm font-mono uppercase"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Short code for order ID prefix</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Next Sequence Number</Label>
                  <Input
                    type="number"
                    value={nextOrderNumber}
                    onChange={(e) => setNextOrderNumber(Math.max(1, parseInt(e.target.value) || 1001))}
                    placeholder="1001"
                    className="mt-1 rounded-xl text-sm font-mono"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Auto-increments with each order</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Physical Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Outlet location"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">WhatsApp Number</Label>
                <Input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="919489581122"
                  className="mt-1 rounded-xl text-sm font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Customer Support Phone</Label>
                <Input
                  value={supportNumber}
                  onChange={(e) => setSupportNumber(e.target.value)}
                  placeholder="919489581122"
                  className="mt-1 rounded-xl text-sm font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Pickup Address (for store pickups)</Label>
              <Input
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Where customers collect orders"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Google Maps Share Link / Location URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                  className="rounded-xl text-sm"
                />
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-primary shrink-0"
                  >
                    Test ↗
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Customers can tap this to navigate directly to your pickup counter on Google Maps.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold">Default Collection Timing Window</Label>
              <Input
                value={collectionTiming}
                onChange={(e) => setCollectionTiming(e.target.value)}
                placeholder="e.g. Tuesday 7:00 AM – 10:00 AM | Friday 8:00 AM – 12:00 PM"
                className="mt-1 rounded-xl text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Default timing for pickup orders. Individual harvest cycles can also override timing per round.
              </p>
            </div>

            <div>
              <Label className="text-xs">Next Expected Opening Note (when store closed)</Label>
              <Input
                value={nextOpeningNote}
                onChange={(e) => setNextOpeningNote(e.target.value)}
                placeholder="e.g. Next order round opens Saturday morning"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="branchActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="branchActive" className="text-xs font-semibold">
                Branch Active
              </Label>
            </div>

            <Button type="submit" className="w-full rounded-xl bg-primary text-white font-bold h-11 mt-4">
              {editingBranch ? "Save Changes" : "Create Branch"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
