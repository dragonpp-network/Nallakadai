"use client";

import React, { useEffect, useState } from "react";
import {
  getCategoriesAdminAction,
  saveCategoryAction,
  deleteCategoryAction,
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
} from "lucide-react";
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
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

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

  async function handleDelete(cat: any) {
    if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) return;

    try {
      await deleteCategoryAction("a0000000-0000-4000-8000-000000000001", cat.id);
      toast.success(`Category "${cat.name}" deleted!`);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Produce Categories</h1>
          <p className="text-xs text-muted-foreground">
            Organize catalog sections, category images (max 1024x1024), bilingual titles, and storefront tints
          </p>
        </div>

        <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5 shadow">
          <Plus className="h-4 w-4" /> Add New Category
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading produce categories...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="p-5 rounded-3xl border bg-card shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 relative overflow-hidden"
            >
              {/* Category Color Bar Top Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: cat.tint || "#EAF3DD" }}
              />

              <div className="space-y-2 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="h-11 w-11 rounded-2xl object-cover border shadow-sm shrink-0"
                      />
                    ) : (
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border shadow-inner text-foreground font-bold shrink-0"
                        style={{ backgroundColor: cat.tint || "#EAF3DD" }}
                      >
                        <FolderTree className="h-5 w-5" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-serif font-bold text-base text-foreground leading-tight">
                        {cat.name}
                      </h3>
                      <p className="text-sm font-tamil text-muted-foreground">{cat.name_ta || "—"}</p>
                    </div>
                  </div>

                  <Badge variant={cat.active ? "default" : "secondary"} className="text-[10px]">
                    {cat.active ? "Active" : "Hidden"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-2xl">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <span><strong>{cat.itemCount || 0}</strong> Items</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown className="h-3.5 w-3.5 text-olive" />
                    <span>Order: <strong>#{cat.sort_order || 1}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-3.5 w-3.5 rounded-full border shadow-sm"
                    style={{ backgroundColor: cat.tint || "#EAF3DD" }}
                  />
                  <span className="font-mono text-[11px]">{cat.tint}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(cat)}
                    className="rounded-xl text-xs gap-1 h-8 px-2.5"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(cat)}
                    className="rounded-xl text-xs text-destructive hover:bg-destructive/10 h-8 px-2"
                    title="Delete category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingCategory ? "Edit Category" : "Add New Produce Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Category Image Uploader */}
            <ImageUploader
              label="Category Thumbnail / Banner"
              value={imageUrl}
              onChange={setImageUrl}
              maxDimension={1024}
              placeholderText="Upload Category Image (Max 1024x1024)"
            />

            <div>
              <Label className="text-xs font-semibold">Category Name (English) *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Exotic Fruits, Spices & Masalas"
                className="mt-1 rounded-xl text-sm"
                required
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Category Name (Tamil / தமிழ்)</Label>
              <Input
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
                placeholder="e.g. வெளிநாட்டு பழங்கள், மசாலா"
                className="mt-1 rounded-xl text-sm font-tamil"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Tint / Badge Theme Color</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TINT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setTint(preset.value)}
                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition ${
                      tint === preset.value
                        ? "border-primary ring-2 ring-primary/40 font-bold shadow-sm"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border shadow-inner"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={tint}
                  onChange={(e) => setTint(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded-lg border bg-transparent p-0.5"
                />
                <Input
                  value={tint}
                  onChange={(e) => setTint(e.target.value)}
                  placeholder="#EAF3DD"
                  className="rounded-xl text-xs font-mono uppercase w-32 h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Display Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="mt-1 rounded-xl text-sm w-32"
                min={1}
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
                Visible in Customer Storefront & Availability Matrix
              </Label>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-primary text-white font-bold h-12 mt-4 shadow"
            >
              {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
