"use client";

import React, { useEffect, useState } from "react";
import {
  getBrandsAction,
  saveBrandAction,
  deleteBrandAction,
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
import { Plus, Edit, Trash2, Award, Package, Layers, Check } from "lucide-react";
import { toast } from "sonner";

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);

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

  async function handleDelete(brand: any) {
    if (!confirm(`Are you sure you want to delete "${brand.name}"?`)) return;

    try {
      await deleteBrandAction("a0000000-0000-4000-8000-000000000001", brand.id);
      toast.success(`Brand "${brand.name}" deleted!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete brand");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Produce Brands & Farm Partners</h1>
          <p className="text-xs text-muted-foreground">
            Manage partner organic farms, brand logos (max 1024x1024), and category associations
          </p>
        </div>

        <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5 shadow">
          <Plus className="h-4 w-4" /> Add Brand Partner
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading brand partners...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card
              key={brand.id}
              className="p-5 rounded-3xl border bg-card shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <GenericProduceImage
                      src={brand.logo_url}
                      alt={brand.name}
                      fallbackType="brand"
                      className="h-12 w-12 rounded-2xl object-cover border shadow-sm shrink-0"
                    />
                    <div>
                      <h3 className="font-serif font-bold text-base text-foreground leading-tight">
                        {brand.name}
                      </h3>
                      <p className="text-sm font-tamil text-muted-foreground">{brand.name_ta || "—"}</p>
                    </div>
                  </div>

                  <Badge variant={brand.active ? "default" : "secondary"} className="text-[10px]">
                    {brand.active ? "Active" : "Disabled"}
                  </Badge>
                </div>

                {brand.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/40 p-2.5 rounded-2xl">
                    {brand.description}
                  </p>
                )}

                {/* Associated Categories & Produce Count */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold">Linked Categories:</span>
                    <span className="font-bold text-foreground">{brand.itemCount || 0} Products</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {brand.categoryNames && brand.categoryNames.length > 0 ? (
                      brand.categoryNames.map((cName: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] bg-muted/50">
                          {cName}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No category linked</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(brand)}
                  className="rounded-xl text-xs gap-1 h-8 px-2.5"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Brand
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(brand)}
                  className="rounded-xl text-xs text-destructive hover:bg-destructive/10 h-8 px-2"
                  title="Delete brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Brand Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingBrand ? "Edit Brand Partner" : "Add New Brand Partner"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Brand Logo Upload with Max 1024x1024 Scaling */}
            <ImageUploader
              label="Brand Logo / Farm Image"
              value={logoUrl}
              onChange={setLogoUrl}
              maxDimension={1024}
              placeholderText="Upload Brand Logo (Max 1024x1024 auto-scaled)"
            />

            <div>
              <Label className="text-xs font-semibold">Brand Name (English) *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nammalvar Naturals"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Brand Name (Tamil / தமிழ்)</Label>
              <Input
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
                placeholder="e.g. நம்மாழ்வார் இயற்கை பண்ணை"
                className="mt-1 rounded-xl text-sm font-tamil"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description / Farm Story</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of origin, farming practices, and certification..."
                className="mt-1 rounded-xl text-sm"
              />
            </div>

            {/* Associate with Categories */}
            <div>
              <Label className="text-xs font-semibold">Connect to Produce Categories</Label>
              <p className="text-[11px] text-muted-foreground mb-2">
                Select which categories this brand supplies produce for:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition flex items-center justify-between ${
                        selected
                          ? "border-primary bg-primary/10 font-bold text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="truncate">
                        <div>{cat.name}</div>
                        <div className="text-[10px] opacity-75 font-tamil">{cat.name_ta}</div>
                      </div>
                      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
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
                Active Brand Partner
              </Label>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-primary text-white font-bold h-12 mt-4 shadow"
            >
              {saving ? "Saving..." : editingBrand ? "Save Brand Changes" : "Create Brand Partner"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
