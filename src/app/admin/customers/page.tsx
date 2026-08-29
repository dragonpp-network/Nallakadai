"use client";

import React, { useEffect, useState } from "react";
import { getCustomersAction, saveCustomerAction, getBranchesAction } from "@/lib/actions/admin";
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
import { Search, Plus, Upload, Phone, Edit, UserCheck, UserX } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [altMobile, setAltMobile] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"Door Delivery" | "Customer Pickup">("Door Delivery");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cList, bList] = await Promise.all([getCustomersAction(), getBranchesAction()]);
      setCustomers(cList);
      setBranches(bList);
      if (bList.length > 0 && !branchId) setBranchId(bList[0].id);
    } catch (err: any) {
      toast.error("Failed to load customer list");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCustomer(null);
    setName("");
    setMobile("");
    setAltMobile("");
    setAddress("");
    setArea("");
    setPreferredTime("");
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(c: any) {
    setEditingCustomer(c);
    setName(c.name);
    setMobile(c.mobile);
    setAltMobile(c.alt_mobile || "");
    setBranchId(c.branch_id);
    setDeliveryMode(c.delivery_mode);
    setAddress(c.address || "");
    setArea(c.area || "");
    setPreferredTime(c.preferred_delivery_time || "");
    setActive(c.active);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveCustomerAction("demo-admin", {
        id: editingCustomer?.id,
        name,
        mobile,
        altMobile: altMobile || undefined,
        branchId: branchId || branches[0]?.id,
        deliveryMode,
        address,
        area,
        preferredTime,
        active,
      });

      toast.success(editingCustomer ? "Customer updated!" : "Customer registered successfully!");
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer");
    }
  }

  // Bulk CSV Upload handler (FR-1.6)
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wsName]);

        let successCount = 0;
        let rejectCount = 0;

        for (const row of rows) {
          const rawPhone = String(row.Mobile || row.mobile || row.Phone || "").replace(/\D/g, "");
          const custName = row.Name || row.name || "Customer";

          if (rawPhone.length >= 10) {
            try {
              await saveCustomerAction("demo-admin", {
                name: custName,
                mobile: rawPhone.slice(-10),
                altMobile: row.AltMobile ? String(row.AltMobile).slice(-10) : undefined,
                branchId: branchId || branches[0]?.id,
                deliveryMode: row.DeliveryMode === "Customer Pickup" ? "Customer Pickup" : "Door Delivery",
                address: row.Address || "",
                area: row.Area || "",
                active: true,
              });
              successCount++;
            } catch {
              rejectCount++;
            }
          } else {
            rejectCount++;
          }
        }

        toast.success(`Imported ${successCount} customers (${rejectCount} skipped/duplicates).`);
        setCsvModalOpen(false);
        loadData();
      } catch (err: any) {
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsBinaryString(file);
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      (c.alt_mobile && c.alt_mobile.includes(search)) ||
      (c.area && c.area.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Customer Master</h1>
          <p className="text-xs text-muted-foreground">
            Onboard pre-approved customers, manage delivery addresses and phone numbers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setCsvModalOpen(true)} variant="outline" className="rounded-xl text-xs gap-1.5">
            <Upload className="h-4 w-4" /> Bulk CSV Import
          </Button>
          <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search customers by name, phone number, alternate number, or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border bg-card py-2.5 pl-10 pr-4 text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
      ) : (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Primary Phone (Login)</th>
                  <th className="p-4">Alt Phone (Contact Only)</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Default Mode & Area</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="p-4 font-semibold text-foreground">{c.name}</td>
                    <td className="p-4 font-mono font-medium text-primary">{c.mobile}</td>
                    <td className="p-4 text-xs text-muted-foreground font-mono">{c.alt_mobile || "—"}</td>
                    <td className="p-4 text-xs">{c.branches?.name || "Erode"}</td>
                    <td className="p-4 text-xs">
                      <div className="font-medium text-foreground">{c.delivery_mode}</div>
                      <div className="text-muted-foreground truncate max-w-xs">{c.area || c.address || "N/A"}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={c.active ? "default" : "destructive"} className="text-[10px]">
                        {c.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(c)}
                        className="h-8 text-xs gap-1"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Customer Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingCustomer ? "Edit Customer Details" : "Onboard New Customer"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lakshmi Devi"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Primary Mobile (Login)</Label>
                <Input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="9489581122"
                  maxLength={10}
                  className="mt-1 rounded-xl text-sm font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Alternate Mobile</Label>
                <Input
                  value={altMobile}
                  onChange={(e) => setAltMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="Optional"
                  maxLength={10}
                  className="mt-1 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Assigned Branch</Label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full mt-1 rounded-xl border p-2.5 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} Branch
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs">Default Delivery Mode</Label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as any)}
                className="w-full mt-1 rounded-xl border p-2.5 text-sm"
              >
                <option value="Door Delivery">Door Delivery</option>
                <option value="Customer Pickup">Customer Pickup</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Delivery Address</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door No, Street, Landmark"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Area / Landmark</Label>
              <Input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Perundurai Road / Thindal"
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeToggle"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="activeToggle" className="text-xs font-semibold">
                Customer Active & Permitted to Order
              </Label>
            </div>

            <Button type="submit" className="w-full rounded-xl bg-primary text-white font-bold h-11 mt-4">
              {editingCustomer ? "Save Changes" : "Register Customer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Bulk Import Modal (FR-1.6) */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Bulk Import Customers (CSV / Excel)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload a spreadsheet with columns: <strong>Name, Mobile, AltMobile, Address, Area, DeliveryMode</strong>.
            </p>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleCsvUpload}
                className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
