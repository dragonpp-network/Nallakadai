"use client";

import React, { useEffect, useState } from "react";
import {
  getBrandsAction,
  saveBrandAction,
  deleteBrandAction,
  bulkDeleteBrandsAction,
  bulkSaveBrandsAction,
  getCategoriesAdminAction,
} from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
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
import { ImageUploader, GenericProduceImage } from "@/components/ui/image-uploader";
import {
  Plus,
  Edit,
  Trash2,
  Award,
  Package,
  Layers,
  Check,
  Download,
  Upload,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [brandList, catList] = await Promise.all([
        getBrandsAction(),
        getCategoriesAdminAction(),
      ]);
      setBrands(brandList);
      setCategories(catList);
    } catch (err: any) {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingBrand(null);
    setName("");
    setNameTa("");
    setLogoUrl(null);
    setDescription("");
    setSelectedCategoryIds([]);
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(brand: any) {
    setEditingBrand(brand);
    setName(brand.name);
    setNameTa(brand.name_ta || "");
    setLogoUrl(brand.logo_url || null);
    setDescription(brand.description || "");
    setSelectedCategoryIds(brand.category_ids || []);
    setActive(brand.active !== false);
    setModalOpen(true);
  }

  function toggleCategory(catId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Brand name in English is required");
      return;
    }

    setSaving(true);
    try {
      await saveBrandAction("a0000000-0000-4000-8000-000000000001", {
        id: editingBrand?.id,
        name: name.trim(),
        nameTa: nameTa.trim(),
        logoUrl,
        description,
        categoryIds: selectedCategoryIds,
        active,
      });

      toast.success(editingBrand ? "Brand updated!" : "New brand partner added!");
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  }

  // Download Sample Brands Template
  function downloadSampleBrandsTemplate(format: "xlsx" | "csv" = "xlsx") {
    const sampleRows = [
      {
        Name: "Nallakadai Organic Farm",
        NameTa: "நல்லகடை இயற்கை பண்ணை",
        Description: "Direct certified chemical-free produce farm partner in Erode",
        Active: "TRUE",
      },
      {
        Name: "Nammalvar Natural Farms",
        NameTa: "நம்மாழ்வார் இயற்கை பண்ணை",
        Description: "Heirloom native seeds and organic vegetables",
        Active: "TRUE",
      },
      {
        Name: "Thirumurugan Dairy",
        NameTa: "திருமுருகன் பால் பண்ணை",
        Description: "Pure A2 native cow milk & fresh butter",
        Active: "TRUE",
      },
      {
        Name: "Kongu Chekku Oils",
        NameTa: "கொங்கு செக்கு எண்ணெய்",
        Description: "Traditional cold-pressed wood chekku oils",
        Active: "TRUE",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Brands_Template");
    const filename = format === "csv" ? "Nallakadai_Brands_Template.csv" : "Nallakadai_Brands_Template.xlsx";
    XLSX.writeFile(wb, filename);
    toast.success(`Sample Brands ${format.toUpperCase()} template downloaded!`);
  }

  // Bulk Brands Upload with Fuzzy Normalization
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

        const parsedBrands: any[] = [];
        let skipped = 0;

        for (const rawRow of rows) {
          const norm: Record<string, any> = {};
          for (const k of Object.keys(rawRow)) {
            const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            norm[cleanKey] = rawRow[k];
          }

          const name = String(
            norm.name || norm.brandname || norm.partnername || norm.brand || norm.farm || ""
          ).trim();

          if (!name) {
            skipped++;
            continue;
          }

          const nameTa = String(norm.nameta || norm.tamilname || norm.tamil || "").trim();
          const description = String(norm.description || norm.desc || norm.about || "").trim();
          const activeRaw = String(norm.active !== undefined ? norm.active : "true").toLowerCase();
          const active = activeRaw === "true" || activeRaw === "1" || activeRaw === "yes";

          parsedBrands.push({
            name,
            nameTa,
            description,
            active,
          });
        }

        if (parsedBrands.length > 0) {
          const res = await bulkSaveBrandsAction("demo-admin", parsedBrands);
          toast.success(`Import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount} (${skipped} invalid skipped).`);
          setCsvModalOpen(false);
          loadData();
        } else {
          toast.error("No valid brand partner records found in spreadsheet.");
        }
      } catch (err: any) {
        toast.error("Failed to parse spreadsheet file");
      }
    };
    reader.readAsBinaryString(file);
  }

  // Selection Handlers
  const isAllSelected = brands.length > 0 && brands.every((b) => selectedIds.includes(b.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(brands.map((b) => b.id));
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
      const res = await bulkDeleteBrandsAction("demo-admin", selectedIds);
      if (res.deletedCount > 0) {
        toast.success(`Successfully deleted ${res.deletedCount} brand partner(s)!`);
      }
      if (res.blockedCount > 0) {
        toast.warning(`Could not delete ${res.blockedCount} brand(s) because they have produce items attached: ${res.blockedNames.join(", ")}`);
      }
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected brands");
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmSingleDelete() {
    if (!singleDeleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBrandAction("demo-admin", singleDeleteTarget.id);
      toast.success(`Brand "${singleDeleteTarget.name}" deleted!`);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteTarget.id));
      setSingleDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete brand");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Produce Brands & Farm Partners</h1>
          <p className="text-xs text-muted-foreground">
            Manage partner organic farms, brand logos, description, and category associations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => downloadSampleBrandsTemplate("xlsx")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
          >
            <Download className="h-4 w-4" /> Sample (.xlsx)
          </Button>
          <Button
            onClick={() => downloadSampleBrandsTemplate("csv")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-muted-foreground/30 text-muted-foreground hover:bg-muted font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Sample (.csv)
          </Button>
          <Button
            onClick={() => setCsvModalOpen(true)}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 bg-primary/5 text-primary border-primary/30 font-bold"
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>
          <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5 shadow font-bold">
            <Plus className="h-4 w-4" /> Add Brand Partner
          </Button>
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
              {selectedIds.length} brand partner(s) selected
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
        <div className="p-12 text-center text-muted-foreground">Loading brand partners...</div>
      ) : brands.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center text-muted-foreground border shadow-sm space-y-2">
          <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No brand partners registered yet</p>
          <p className="text-xs">Click "Add Brand Partner" or "Bulk Import" to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => {
            const isSelected = selectedIds.includes(brand.id);
            return (
              <Card
                key={brand.id}
                className={`p-4 rounded-3xl border bg-card shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelectRow(brand.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="h-12 w-12 rounded-2xl object-cover border shadow-sm"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive/10 text-olive font-bold text-sm shadow-inner">
                          <Award className="h-6 w-6" />
                        </div>
                      )}

                      <div>
                        <h3 className="font-serif font-bold text-base text-foreground leading-tight">
                          {brand.name}
                        </h3>
                        <p className="text-xs font-tamil text-muted-foreground mt-0.5">
                          {brand.name_ta || "—"}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={brand.active ? "default" : "secondary"}
                      className="text-[10px] px-2 py-0.5"
                    >
                      {brand.active ? "Active" : "Hidden"}
                    </Badge>
                  </div>

                  {brand.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {brand.description}
                    </p>
                  )}

                  {/* Associated Categories */}
                  {brand.categoryNames && brand.categoryNames.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      {brand.categoryNames.map((cName: string) => (
                        <Badge
                          key={cName}
                          variant="outline"
                          className="text-[10px] bg-muted/50 rounded-lg px-2 py-0.5"
                        >
                          {cName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    <span>{brand.itemCount || 0} produce item(s)</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(brand)}
                      className="rounded-xl text-xs h-8 px-2.5"
                    >
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSingleDeleteTarget(brand)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                      title="Delete brand"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CSV / Excel Bulk Import Modal */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Bulk Import Brands & Farm Partners (Excel / CSV)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950">Download pre-formatted sample template</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Fill the columns: <strong>Name, NameTa, Description, Active</strong>.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadSampleBrandsTemplate("xlsx")}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleBrandsTemplate("csv")}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-amber-600/40 text-amber-900 hover:bg-amber-500/10 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.csv)
                </Button>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
              <div className="text-xs font-semibold text-foreground">Select your brand partners spreadsheet</div>
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
          <DialogTitle className="text-lg font-bold">Delete Selected Brands?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{selectedIds.length}</strong> selected brand partner(s)?
            Brands with existing produce items will be protected and skipped.
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
              {isDeleting ? "Deleting..." : `Yes, Delete ${selectedIds.length} Brands`}
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
          <DialogTitle className="text-lg font-bold">Delete Brand Partner?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{singleDeleteTarget?.name}</strong>?
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
              {isDeleting ? "Deleting..." : "Yes, Delete Brand"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Brand Partner Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingBrand ? `Edit "${editingBrand.name}"` : "Add Brand / Farm Partner"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Logo Uploader */}
            <div>
              <Label className="text-xs font-semibold">Partner / Farm Logo (1:1 Square)</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <ImageUploader
                  currentImageUrl={logoUrl}
                  onImageSelected={(url) => setLogoUrl(url)}
                  aspectRatio={1}
                  label="Upload Brand Logo"
                  className="w-24 h-24"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Max 1024 × 1024 resolution.</p>
                  <p>• Displayed on item cards and category headers.</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Brand / Partner Name (English)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nammalvar Natural Farms"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Tamil Name (தமிழ் பெயர்)</Label>
              <Input
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
                placeholder="e.g. நம்மாழ்வார் இயற்கை பண்ணை"
                className="mt-1 rounded-xl text-sm font-tamil"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">About / Partner Story</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about farming practices, location, certifications..."
                className="mt-1 rounded-xl text-sm resize-none h-20"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Produce Categories Supplied</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto border p-2 rounded-2xl bg-muted/20">
                {categories.map((c) => {
                  const isChecked = selectedCategoryIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCategory(c.id)}
                      className={`p-2 rounded-xl text-xs text-left border flex items-center justify-between transition ${
                        isChecked
                          ? "bg-primary text-white border-primary font-bold shadow-sm"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {isChecked && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="brandActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="brandActive" className="text-xs font-semibold">
                Partner Active in Store
              </Label>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-primary text-white font-bold h-11 mt-4 shadow"
            >
              {saving ? "Saving..." : editingBrand ? "Save Changes" : "Create Brand Partner"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
