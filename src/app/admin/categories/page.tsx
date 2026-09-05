"use client";

import React, { useEffect, useState } from "react";
import {
  getCategoriesAdminAction,
  saveCategoryAction,
  deleteCategoryAction,
  bulkDeleteCategoriesAction,
  bulkSaveCategoriesAction,
  reorderCategoriesAction,
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
import { ImageUploader, GenericProduceImage } from "@/components/ui/image-uploader";
import {
  Plus,
  Edit,
  Trash2,
  FolderTree,
  Package,
  ArrowUpDown,
  Download,
  Upload,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const TINT_PRESETS = [
  { label: "Sage Green", value: "#EAF3DD" },
  { label: "Leaf Green", value: "#DCEBD3" },
  { label: "Warm Peach", value: "#FBE9D8" },
  { label: "Sky Blue", value: "#EFF3FA" },
  { label: "Cream Gold", value: "#F1EEDD" },
  { label: "Lavender", value: "#F3E8FF" },
  { label: "Rose Mist", value: "#FFE4E6" },
  { label: "Sun Yellow", value: "#FEF3C7" },
];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [tint, setTint] = useState("#EAF3DD");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await getCategoriesAdminAction();
      setCategories(data);
    } catch (err: any) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCategory(null);
    setName("");
    setNameTa("");
    setTint("#EAF3DD");
    setImageUrl(null);
    setSortOrder(categories.length + 1);
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(cat: any) {
    setEditingCategory(cat);
    setName(cat.name);
    setNameTa(cat.name_ta || "");
    setTint(cat.tint || "#EAF3DD");
    setImageUrl(cat.image_url || null);
    setSortOrder(cat.sort_order || 1);
    setActive(cat.active !== false);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name in English is required");
      return;
    }

    setSaving(true);
    try {
      await saveCategoryAction("a0000000-0000-4000-8000-000000000001", {
        id: editingCategory?.id,
        name: name.trim(),
        nameTa: nameTa.trim(),
        tint,
        imageUrl,
        sortOrder,
        active,
      });

      toast.success(editingCategory ? "Category updated!" : "New category created successfully!");
      setModalOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  // Download Sample Categories Template
  function downloadSampleCategoriesTemplate(format: "xlsx" | "csv" = "xlsx") {
    const sampleRows = [
      {
        Name: "Vegetables",
        NameTa: "நாட்டு காய்கறிகள்",
        Tint: "#EAF3DD",
        SortOrder: 1,
        Active: "TRUE",
      },
      {
        Name: "Greens",
        NameTa: "இயற்கை கீரைகள்",
        Tint: "#DCEBD3",
        SortOrder: 2,
        Active: "TRUE",
      },
      {
        Name: "Fruits",
        NameTa: "பழங்கள்",
        Tint: "#FBE9D8",
        SortOrder: 3,
        Active: "TRUE",
      },
      {
        Name: "Dairy",
        NameTa: "நாட்டுப்பசு பால் & நெய்",
        Tint: "#EFF3FA",
        SortOrder: 4,
        Active: "TRUE",
      },
      {
        Name: "Vegan",
        NameTa: "மரச்செக்கு எண்ணெய்கள்",
        Tint: "#F1EEDD",
        SortOrder: 5,
        Active: "TRUE",
      },
      {
        Name: "Staples",
        NameTa: "பாரம்பரிய அரிசி & சிறுதானியங்கள்",
        Tint: "#FEF3C7",
        SortOrder: 6,
        Active: "TRUE",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categories_Template");
    const filename = format === "csv" ? "Nallakadai_Categories_Template.csv" : "Nallakadai_Categories_Template.xlsx";
    XLSX.writeFile(wb, filename);
    toast.success(`Sample Categories ${format.toUpperCase()} template downloaded!`);
  }

  // Bulk Categories Upload with Fuzzy Normalization
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

        const parsedCategories: any[] = [];
        let skipped = 0;

        for (const rawRow of rows) {
          const norm: Record<string, any> = {};
          for (const k of Object.keys(rawRow)) {
            const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            norm[cleanKey] = rawRow[k];
          }

          const name = String(
            norm.name || norm.categoryname || norm.nameen || norm.category || ""
          ).trim();

          if (!name) {
            skipped++;
            continue;
          }

          const nameTa = String(norm.nameta || norm.tamilname || norm.tamil || "").trim();
          const tint = String(norm.tint || norm.color || norm.hex || "#EAF3DD").trim();
          const sortOrder = Number(norm.sortorder || norm.order || norm.position || 99);
          const activeRaw = String(norm.active !== undefined ? norm.active : "true").toLowerCase();
          const active = activeRaw === "true" || activeRaw === "1" || activeRaw === "yes";

          parsedCategories.push({
            name,
            nameTa,
            tint,
            sortOrder,
            active,
          });
        }

        if (parsedCategories.length > 0) {
          const res = await bulkSaveCategoriesAction("demo-admin", parsedCategories);
          toast.success(`Import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount} (${skipped} invalid skipped).`);
          setCsvModalOpen(false);
          loadCategories();
        } else {
          toast.error("No valid categories found in spreadsheet.");
        }
      } catch (err: any) {
        toast.error("Failed to parse spreadsheet file");
      }
    };
    reader.readAsBinaryString(file);
  }

  // Selection Handlers
  const isAllSelected = categories.length > 0 && categories.every((c) => selectedIds.includes(c.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categories.map((c) => c.id));
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
      const res = await bulkDeleteCategoriesAction("demo-admin", selectedIds);
      if (res.deletedCount > 0) {
        toast.success(`Successfully deleted ${res.deletedCount} category(s)!`);
      }
      if (res.blockedCount > 0) {
        toast.warning(`Could not delete ${res.blockedCount} category(s) because they have produce items attached: ${res.blockedNames.join(", ")}`);
      }
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected categories");
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmSingleDelete() {
    if (!singleDeleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteCategoryAction("demo-admin", singleDeleteTarget.id);
      toast.success(`Category "${singleDeleteTarget.name}" deleted!`);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteTarget.id));
      setSingleDeleteTarget(null);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setIsDeleting(false);
    }
  }

  // Reordering Handlers
  async function handleMove(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newCats = [...categories];
    const temp = newCats[index];
    newCats[index] = newCats[targetIndex];
    newCats[targetIndex] = temp;

    setCategories(newCats);
    setReordering(true);
    try {
      const orderedIds = newCats.map((c) => c.id);
      await reorderCategoriesAction("demo-admin", orderedIds);
      toast.success("Category order updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save category order");
      loadCategories();
    } finally {
      setReordering(false);
    }
  }

  async function handleReorderSave(newOrderedList: any[]) {
    setReordering(true);
    try {
      const orderedIds = newOrderedList.map((c) => c.id);
      await reorderCategoriesAction("demo-admin", orderedIds);
      setCategories(newOrderedList);
      toast.success("Category order saved successfully!");
      setReorderModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save category order");
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Produce Categories</h1>
          <p className="text-xs text-muted-foreground">
            Organize catalog sections, category images, bilingual titles, and storefront tints
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => downloadSampleCategoriesTemplate("xlsx")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
          >
            <Download className="h-4 w-4" /> Sample (.xlsx)
          </Button>
          <Button
            onClick={() => downloadSampleCategoriesTemplate("csv")}
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
          <Button
            onClick={() => setReorderModalOpen(true)}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-emerald-600/30 text-emerald-800 hover:bg-emerald-50 font-bold"
          >
            <ArrowUpDown className="h-4 w-4" /> Reorder Placement
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
          <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5 shadow font-bold">
            <Plus className="h-4 w-4" /> Add Category
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
              {selectedIds.length} category(s) selected
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
        <div className="p-12 text-center text-muted-foreground">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center text-muted-foreground border shadow-sm space-y-2">
          <FolderTree className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No categories created yet</p>
          <p className="text-xs">Click "Add Category" or "Bulk Import" to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, index) => {
            const isSelected = selectedIds.includes(cat.id);
            return (
              <Card
                key={cat.id}
                className={`p-4 rounded-3xl border bg-card shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
                style={{ borderTopColor: cat.tint || "#EAF3DD", borderTopWidth: "6px" }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelectRow(cat.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="h-12 w-12 rounded-2xl object-cover border shadow-sm"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-sm shadow-inner"
                          style={{ backgroundColor: cat.tint || "#EAF3DD" }}
                        >
                          <FolderTree className="h-6 w-6 text-foreground/70" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-muted/60 text-muted-foreground">
                            #{index + 1}
                          </Badge>
                          <h3 className="font-serif font-bold text-base text-foreground leading-tight">
                            {cat.name}
                          </h3>
                        </div>
                        <p className="text-xs font-tamil text-muted-foreground mt-0.5">
                          {cat.name_ta || "—"}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={cat.active ? "default" : "secondary"}
                      className="text-[10px] px-2 py-0.5"
                    >
                      {cat.active ? "Active" : "Hidden"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <div
                      className="h-4 w-4 rounded-full border shadow-sm"
                      style={{ backgroundColor: cat.tint || "#EAF3DD" }}
                      title="Storefront Theme Tint"
                    />
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Tint: {cat.tint || "#EAF3DD"}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  {/* Up / Down Reorder buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === 0 || reordering}
                      onClick={() => handleMove(index, "up")}
                      className="h-8 w-8 p-0 rounded-xl"
                      title="Move up / show earlier on storefront"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={index === categories.length - 1 || reordering}
                      onClick={() => handleMove(index, "down")}
                      className="h-8 w-8 p-0 rounded-xl"
                      title="Move down / show later on storefront"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(cat)}
                      className="rounded-xl text-xs h-8 px-2.5"
                    >
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSingleDeleteTarget(cat)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                      title="Delete category"
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
            <DialogTitle className="font-serif text-xl">Bulk Import Categories (Excel / CSV)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950">Download pre-formatted sample template</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Fill the columns: <strong>Name, NameTa, Tint, SortOrder, Active</strong>.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadSampleCategoriesTemplate("xlsx")}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleCategoriesTemplate("csv")}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-amber-600/40 text-amber-900 hover:bg-amber-500/10 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.csv)
                </Button>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
              <div className="text-xs font-semibold text-foreground">Select your categories spreadsheet</div>
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
          <DialogTitle className="text-lg font-bold">Delete Selected Categories?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{selectedIds.length}</strong> selected category(s)?
            Categories with existing produce items will be protected and skipped.
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
              {isDeleting ? "Deleting..." : `Yes, Delete ${selectedIds.length} Categories`}
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
          <DialogTitle className="text-lg font-bold">Delete Category?</DialogTitle>
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
              {isDeleting ? "Deleting..." : "Yes, Delete Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Category Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingCategory ? `Edit "${editingCategory.name}"` : "Add Produce Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Category Photo Uploader */}
            <div>
              <Label className="text-xs font-semibold">Category Photo (1:1 Square)</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <ImageUploader
                  currentImageUrl={imageUrl}
                  onImageSelected={(url) => setImageUrl(url)}
                  aspectRatio={1}
                  label="Upload Category Image"
                  className="w-24 h-24"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Max 1024 × 1024 resolution.</p>
                  <p>• Displayed on Customer Storefront header.</p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Category Name (English)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Country Vegetables"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Tamil Title (தமிழ் பெயர்)</Label>
              <Input
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
                placeholder="e.g. நாட்டு காய்கறிகள்"
                className="mt-1 rounded-xl text-sm font-tamil"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Storefront Tint Color</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {TINT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTint(p.value)}
                    className={`p-2 rounded-xl border text-xs text-center flex flex-col items-center gap-1 transition ${
                      tint === p.value ? "ring-2 ring-primary font-bold shadow-sm" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-full border shadow-inner"
                      style={{ backgroundColor: p.value }}
                    />
                    <span className="text-[10px]">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Custom Tint Hex Code</Label>
              <Input
                value={tint}
                onChange={(e) => setTint(e.target.value)}
                placeholder="#EAF3DD"
                className="mt-1 rounded-xl text-sm font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="catActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="catActive" className="text-xs font-semibold">
                Category Visible on Customer Storefront
              </Label>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-primary text-white font-bold h-11 mt-4 shadow"
            >
              {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reorder Placement Modal */}
      <ReorderCategoriesDialog
        open={reorderModalOpen}
        onOpenChange={setReorderModalOpen}
        categories={categories}
        onSave={handleReorderSave}
      />
    </div>
  );
}

function ReorderCategoriesDialog({
  open,
  onOpenChange,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: any[];
  onSave: (items: any[]) => void;
}) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setItems([...categories]);
    }
  }, [open, categories]);

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setItems(copy);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Rearrange Category Order
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Arrange categories in the exact order you want them shown on the customer mobile storefront. Position #1 appears first.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 my-2">
          {items.map((cat, idx) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-2xl border bg-card hover:bg-muted/40 transition gap-2 shadow-xs"
              style={{ borderLeftColor: cat.tint || "#EAF3DD", borderLeftWidth: "5px" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Badge variant="outline" className="font-mono text-xs w-6 h-6 rounded-full flex items-center justify-center p-0 shrink-0 bg-primary/10 text-primary border-primary/20">
                  {idx + 1}
                </Badge>
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="h-8 w-8 rounded-xl object-cover shrink-0" />
                ) : (
                  <div
                    className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: cat.tint || "#EAF3DD" }}
                  >
                    <FolderTree className="h-4 w-4 text-foreground/70" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate text-foreground">{cat.name}</div>
                  <div className="text-[10px] font-tamil text-muted-foreground truncate">{cat.name_ta || "—"}</div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, "up")}
                  className="h-7 w-7 p-0 rounded-lg"
                  title="Move Up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, "down")}
                  className="h-7 w-7 p-0 rounded-lg"
                  title="Move Down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl flex-1 text-xs">
            Cancel
          </Button>
          <Button onClick={() => onSave(items)} className="rounded-xl flex-1 bg-primary text-white font-bold text-xs shadow">
            Save Placement Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
