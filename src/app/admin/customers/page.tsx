"use client";

import React, { useEffect, useState } from "react";
import {
  getCustomersAction,
  saveCustomerAction,
  deleteCustomerAction,
  bulkDeleteCustomersAction,
  bulkSaveCustomersAction,
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
import {
  Search,
  Plus,
  Upload,
  Download,
  Phone,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
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

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Download Sample Customer CSV / Excel Template
  function downloadSampleCustomerCsv(format: "xlsx" | "csv" = "xlsx") {
    const sampleRows = [
      {
        Name: "Lavanya",
        Mobile: "9489581155",
        AltMobile: "9789198007",
        Address: "Mollapalayam",
        Area: "Erode",
        DeliveryMode: "Door Delivery",
      },
      {
        Name: "Nithya sree",
        Mobile: "7010402141",
        AltMobile: "",
        Address: "45 Gandhi Road",
        Area: "Erode",
        DeliveryMode: "Customer Pickup",
      },
      {
        Name: "Dr Umapathy",
        Mobile: "7502209993",
        AltMobile: "",
        Address: "12 Doctors Colony",
        Area: "Erode",
        DeliveryMode: "Door Delivery",
      },
      {
        Name: "Arthi",
        Mobile: "9789864567",
        AltMobile: "",
        Address: "Indian Nagar",
        Area: "Erode",
        DeliveryMode: "Customer Pickup",
      },
      {
        Name: "Raja Gopal",
        Mobile: "9842725971",
        AltMobile: "9789198007",
        Address: "Sivagiri",
        Area: "Erode",
        DeliveryMode: "Customer Pickup",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers_Template");
    const filename = format === "csv" ? "Nallakadai_Customer_Import_Template.csv" : "Nallakadai_Customer_Import_Template.xlsx";
    XLSX.writeFile(wb, filename);
    toast.success(`Sample customer ${format.toUpperCase()} template downloaded!`);
  }

  // Bulk CSV Upload handler with Fuzzy Header Normalization
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

        const parsedCustomers: any[] = [];
        let rejectCount = 0;

        for (const rawRow of rows) {
          const norm: Record<string, any> = {};
          for (const k of Object.keys(rawRow)) {
            const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            norm[cleanKey] = rawRow[k];
          }

          const rawPhone = String(
            norm.mobile || norm.phone || norm.mobilenumber || norm.phonenumber || norm.primarymobile || norm.contact || ""
          ).replace(/\D/g, "");

          const custName = String(
            norm.name || norm.customername || norm.fullname || norm.custname || norm.clientname || ""
          ).trim() || "Customer";

          const altMobile = String(
            norm.altmobile || norm.alternatephone || norm.alternatemobile || norm.altphone || norm.alt || ""
          ).replace(/\D/g, "");

          const deliveryAddress = String(
            norm.address || norm.deliveryaddress || norm.street || norm.flat || ""
          ).trim();

          const areaLocality = String(
            norm.area || norm.locality || norm.landmark || norm.city || ""
          ).trim();

          const rawMode = String(norm.deliverymode || norm.mode || norm.type || "").toLowerCase();
          const deliveryMode = rawMode.includes("pickup") ? "Customer Pickup" : "Door Delivery";

          if (rawPhone.length >= 10) {
            parsedCustomers.push({
              name: custName,
              mobile: rawPhone.slice(-10),
              altMobile: altMobile.length >= 10 ? altMobile.slice(-10) : undefined,
              branchId: branchId || branches[0]?.id,
              deliveryMode,
              address: deliveryAddress,
              area: areaLocality,
              active: true,
            });
          } else {
            rejectCount++;
          }
        }

        if (parsedCustomers.length > 0) {
          const res = await bulkSaveCustomersAction("demo-admin", parsedCustomers);
          toast.success(`Import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount} (${rejectCount} invalid skipped).`);
          setCsvModalOpen(false);
          loadData();
        } else {
          toast.error("No valid customer records with 10-digit mobile numbers found.");
        }
      } catch (err: any) {
        toast.error("Failed to parse spreadsheet file");
      }
    };
    reader.readAsBinaryString(file);
  }

  // Selection Handlers
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      (c.alt_mobile && c.alt_mobile.includes(search)) ||
      (c.area && c.area.toLowerCase().includes(search.toLowerCase()))
  );

  const isAllSelected = filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      const filteredIds = new Set(filtered.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...filtered.map((c) => c.id)]));
      setSelectedIds(newSelected);
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Deletion Handlers
  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await bulkDeleteCustomersAction("demo-admin", selectedIds);
      toast.success(`Successfully deleted ${res.deletedCount} customer(s)!`);
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected customers");
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmSingleDelete() {
    if (!singleDeleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCustomerAction("demo-admin", singleDeleteTarget.id);
      toast.success(`Customer "${singleDeleteTarget.name}" deleted!`);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteTarget.id));
      setSingleDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Customer Master</h1>
          <p className="text-xs text-muted-foreground">
            Onboard pre-approved customers, manage delivery addresses, phone numbers, and batch data
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => downloadSampleCustomerCsv("xlsx")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
          >
            <Download className="h-4 w-4" /> Sample (.xlsx)
          </Button>
          <Button
            onClick={() => downloadSampleCustomerCsv("csv")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-muted-foreground/30 text-muted-foreground hover:bg-muted font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Sample (.csv)
          </Button>
          <Button onClick={() => setCsvModalOpen(true)} variant="outline" className="rounded-xl text-xs gap-1.5 bg-primary/5 text-primary border-primary/30 font-bold">
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          {selectedIds.length > 0 && (
            <Button
              onClick={() => setDeleteConfirmOpen(true)}
              variant="destructive"
              className="rounded-xl text-xs gap-1.5 shadow font-bold bg-red-600 hover:bg-red-700 text-white animate-in fade-in"
            >
              <Trash2 className="h-4 w-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5 font-bold shadow">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers by name, phone number, alternate number, or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border bg-card py-2.5 pl-10 pr-4 text-sm outline-none shadow-sm focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium shrink-0">
          Showing <strong>{filtered.length}</strong> of {customers.length} customer(s)
        </div>
      </div>

      {/* Sticky Multi-Select Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white p-3.5 px-5 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2 border border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-white/20 flex items-center justify-center font-bold font-mono text-xs">
              {selectedIds.length}
            </div>
            <span className="text-xs font-semibold">
              {selectedIds.length} customer(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds([])}
              className="rounded-xl text-xs bg-white/10 hover:bg-white/20 text-white border-white/30 h-8"
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 bg-white text-red-700 hover:bg-white/90 shadow h-8"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading customers...</div>
      ) : (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/80 text-xs uppercase text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-muted-foreground hover:text-foreground"
                      title={isAllSelected ? "Deselect all" : "Select all visible"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Primary Phone (Login)</th>
                  <th className="p-4">Alt Phone</th>
                  <th className="p-4">Branch</th>
                  <th className="p-4">Default Mode & Area</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const isSelected = selectedIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-muted/30 transition ${
                          isSelected ? "bg-primary/5 font-medium" : ""
                        }`}
                      >
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(c.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
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
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(c)}
                              className="h-8 text-xs gap-1"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSingleDeleteTarget(c)}
                              className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                              title="Delete customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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

      {/* CSV / Excel Bulk Import Modal */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Bulk Import Customers (CSV / Excel)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950">Download standard sample template</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Fill the columns: <strong>Name, Mobile, AltMobile, Address, Area, DeliveryMode</strong>.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadSampleCustomerCsv("xlsx")}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleCustomerCsv("csv")}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-amber-600/40 text-amber-900 hover:bg-amber-500/10 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.csv)
                </Button>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
              <div className="text-xs font-semibold text-foreground">Select your filled customer spreadsheet</div>
              <p className="text-[11px] text-muted-foreground">Supports .xlsx, .xls, and .csv files</p>
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-2">
            <AlertCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold">Delete Selected Customers?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected customer(s)? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-xl text-xs"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isDeleting ? "Deleting..." : `Yes, Delete ${selectedIds.length} Customers`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={!!singleDeleteTarget} onOpenChange={(open) => !open && setSingleDeleteTarget(null)}>
        <DialogContent className="rounded-3xl max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-2">
            <AlertCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold">Delete Customer?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{singleDeleteTarget?.name}</strong> ({singleDeleteTarget?.mobile})?
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <Button
              variant="outline"
              onClick={() => setSingleDeleteTarget(null)}
              className="rounded-xl text-xs"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSingleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
