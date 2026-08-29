"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getMasterItemsAction,
  saveMasterItemAction,
  getCategoriesAdminAction,
  getBrandsAction,
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
  Search,
  Plus,
  Edit,
  Package,
  Award,
  Layers,
  LayoutGrid,
  List,
  FolderTree,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>("all");

  // View Mode: 'grouped' (under categories) | 'grid' (all grid) | 'table' (compact list)
  const [viewMode, setViewMode] = useState<"grouped" | "grid" | "table">("grouped");

  // Collapsed categories state for grouped view
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [nameEn, setNameEn] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [unit, setUnit] = useState("Kg");
  const [presetsStr, setPresetsStr] = useState("0.5, 1, 2");
  const [minQty, setMinQty] = useState(0.25);
  const [maxQty, setMaxQty] = useState(10);
  const [procurementCost, setProcurementCost] = useState(30);
  const [sellingPrice, setSellingPrice] = useState(50);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [itemList, catList, brandList] = await Promise.all([
        getMasterItemsAction(),
        getCategoriesAdminAction(),
        getBrandsAction(),
      ]);
      setItems(itemList);
      setCategories(catList);
      setBrands(brandList);
      if (catList.length > 0 && !categoryId) {
        setCategoryId(catList[0].id);
      }
    } catch (err: any) {
      toast.error("Failed to load master catalogue");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal(defaultCatId?: string) {
    setEditingItem(null);
    setNameEn("");
    setNameTa("");
    setCategoryId(defaultCatId || (categories.length > 0 ? categories[0].id : ""));
    setBrandId("");
    setImageUrl(null);
    setUnit("Kg");
    setPresetsStr("0.5, 1, 2");
    setMinQty(0.25);
    setMaxQty(10);
    setProcurementCost(30);
    setSellingPrice(50);
    setDiscountPercent(0);
    setActive(true);
    setModalOpen(true);
  }

  function openEditModal(item: any) {
    setEditingItem(item);
    setNameEn(item.name_en);
    setNameTa(item.name_ta || "");
    setCategoryId(item.category_id);
    setBrandId(item.brand_id || "");
    setImageUrl(item.image_url || null);
    setUnit(item.unit);
    setPresetsStr((item.presets || []).join(", "));
    setMinQty(Number(item.min_qty));
    setMaxQty(Number(item.max_qty));
    setProcurementCost(Number(item.procurement_cost !== undefined ? item.procurement_cost : Math.round((item.price || 50) * 0.7)));
    setSellingPrice(Number(item.selling_price || item.price || 50));
    setDiscountPercent(Number(item.discount_percent || 0));
    setActive(item.active);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const presets = presetsStr
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      await saveMasterItemAction("a0000000-0000-4000-8000-000000000001", {
        id: editingItem?.id,
        nameEn,
        nameTa,
        categoryId,
        brandId: brandId || null,
        imageUrl,
        unit,
        presets,
        minQty: Number(minQty),
        maxQty: Number(maxQty),
        procurementCost: Number(procurementCost),
        sellingPrice: Number(sellingPrice),
        discountPercent: Number(discountPercent),
        active,
      });

      toast.success(editingItem ? "Item updated" : "Item created");
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save item");
    }
  }

  function toggleCategoryCollapse(catId: string) {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  }

  // Filtered items
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((i) => {
      const matchSearch =
        !q ||
        i.name_en.toLowerCase().includes(q) ||
        (i.name_ta && i.name_ta.toLowerCase().includes(q)) ||
        (i.categories?.name && i.categories.name.toLowerCase().includes(q)) ||
        (i.brands?.name && i.brands.name.toLowerCase().includes(q));

      const matchCat = selectedCategoryTab === "all" || i.category_id === selectedCategoryTab;
      const matchBrand = selectedBrandFilter === "all" || i.brand_id === selectedBrandFilter;

      return matchSearch && matchCat && matchBrand;
    });
  }, [items, search, selectedCategoryTab, selectedBrandFilter]);

  // Group items by category for categorized view
  const categorizedGroups = useMemo(() => {
    const groups: { category: any; items: any[] }[] = [];

    for (const cat of categories) {
      if (selectedCategoryTab !== "all" && cat.id !== selectedCategoryTab) {
        continue;
      }
      const catItems = filtered.filter((i) => i.category_id === cat.id);
      if (catItems.length > 0 || (search === "" && selectedBrandFilter === "all" && selectedCategoryTab === cat.id)) {
        groups.push({
          category: cat,
          items: catItems,
        });
      }
    }

    // Include uncategorized items if any
    const uncategorized = filtered.filter((i) => !categories.some((c) => c.id === i.category_id));
    if (uncategorized.length > 0) {
      groups.push({
        category: { id: "uncat", name: "Uncategorized", name_ta: "வகைப்படுத்தப்படாதவை", tint: "#f3f4f6" },
        items: uncategorized,
      });
    }

    return groups;
  }, [categories, filtered, selectedCategoryTab, search, selectedBrandFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Master Item Catalogue</h1>
          <p className="text-xs text-muted-foreground">
            Manage produce items organized under categories, photos (max 1024x1024), and Brand partners
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-2xl border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === "grouped"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grouped by Category"
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">By Category</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === "grid"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="All Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">All Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === "table"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact Table List"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <Button onClick={() => openCreateModal()} className="rounded-2xl bg-primary text-white text-xs gap-1.5 shadow">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Search & Brand Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items by English/Tamil name or Brand (e.g. தக்காளி, கீரை, Nammalvar)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border bg-card py-2.5 pl-10 pr-4 text-sm outline-none shadow-sm focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <select
            value={selectedBrandFilter}
            onChange={(e) => setSelectedBrandFilter(e.target.value)}
            className="w-full rounded-2xl border bg-card py-2.5 px-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-primary text-foreground"
          >
            <option value="all">All Brand Partners ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.name_ta})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Quick Filter Pills */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategoryTab("all")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold whitespace-nowrap shadow-sm transition ${
            selectedCategoryTab === "all"
              ? "bg-olive text-white shadow-olive/30 scale-105"
              : "bg-card text-muted-foreground border border-border hover:bg-muted"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          All Categories ({items.length})
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.category_id === cat.id).length;
          const isActive = selectedCategoryTab === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryTab(cat.id)}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold whitespace-nowrap shadow-sm transition ${
                isActive
                  ? "bg-olive text-white shadow-olive/30 scale-105"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] opacity-80 font-tamil">({cat.name_ta})</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] ml-0.5">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Renderers based on View Mode */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading master catalogue...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center text-muted-foreground border shadow-sm space-y-2">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">No produce items found</p>
          <p className="text-xs">Try adjusting your category filter, brand filter, or search query.</p>
        </div>
      ) : viewMode === "grouped" ? (
        /* ========================================================================= */
        /* 1. CATEGORIZED / GROUPED VIEW (Fast Category Navigation)                  */
        /* ========================================================================= */
        <div className="space-y-6">
          {categorizedGroups.map(({ category, items: groupItems }) => {
            const isCollapsed = collapsedCategories[category.id];
            return (
              <div
                key={category.id}
                className="rounded-3xl border bg-card/60 shadow-sm overflow-hidden transition"
              >
                {/* Group Header Bar */}
                <div
                  onClick={() => toggleCategoryCollapse(category.id)}
                  className="p-4 flex items-center justify-between cursor-pointer border-b hover:bg-muted/40 transition select-none"
                  style={{ borderLeftColor: category.tint || "#EAF3DD", borderLeftWidth: "6px" }}
                >
                  <div className="flex items-center gap-3">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-9 w-9 rounded-xl object-cover border shadow-sm"
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs shadow-inner"
                        style={{ backgroundColor: category.tint || "#EAF3DD" }}
                      >
                        <FolderTree className="h-4 w-4" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif font-bold text-base text-foreground">{category.name}</h2>
                        <span className="text-xs font-tamil text-muted-foreground font-normal">
                          ({category.name_ta})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5">
                      {groupItems.length} Products
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(category.id);
                      }}
                      className="h-8 rounded-xl text-xs gap-1 text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                    <button type="button" className="text-muted-foreground p-1">
                      {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Group Items Grid */}
                {!isCollapsed && (
                  <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-3 bg-card">
                    {groupItems.map((item) => (
                      <Card
                        key={item.id}
                        className="p-4 rounded-2xl border bg-background/80 shadow-sm hover:shadow-md transition space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <GenericProduceImage
                                src={item.image_url}
                                alt={item.name_en}
                                fallbackType="product"
                                className="h-11 w-11 rounded-xl object-cover border shadow-sm shrink-0"
                              />
                              <div>
                                <h3 className="font-bold text-sm text-foreground leading-tight">{item.name_en}</h3>
                                <p className="text-xs font-tamil text-muted-foreground">{item.name_ta || "—"}</p>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.active ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
                              }`}
                            >
                              {item.active ? "Active" : "Hidden"}
                            </span>
                          </div>

                          {item.brands && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                              <Award className="h-3 w-3 text-amber-600" />
                              <span>{item.brands.name}</span>
                            </div>
                          )}

                          <div className="bg-muted/40 p-2 rounded-xl text-[11px] space-y-0.5 text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Unit: <strong>{item.unit}</strong></span>
                              <span>Limits: <strong>{item.min_qty}–{item.max_qty}</strong></span>
                            </div>
                            <div className="truncate">
                              Presets: <strong>{(item.presets || []).join(", ") || "None"}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(item)}
                            className="rounded-xl text-xs gap-1 h-7 px-2.5"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* ========================================================================= */
        /* 2. FLAT ALL GRID VIEW                                                     */
        /* ========================================================================= */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="p-5 rounded-3xl border bg-card shadow-sm hover:shadow-md transition space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <GenericProduceImage
                    src={item.image_url}
                    alt={item.name_en}
                    fallbackType="product"
                    className="h-12 w-12 rounded-2xl object-cover border shadow-sm shrink-0"
                  />
                  <div>
                    <h3 className="font-serif font-bold text-base text-foreground leading-tight">
                      {item.name_en}
                    </h3>
                    <p className="text-sm font-tamil text-muted-foreground">{item.name_ta || "—"}</p>
                  </div>
                </div>

                <Badge
                  style={{ backgroundColor: item.categories?.tint || "#EAF3DD", color: "#1c2a1c" }}
                  className="text-[10px] font-semibold border shrink-0"
                >
                  {item.categories?.name || "General"}
                </Badge>
              </div>

              {item.brands && (
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                  <Award className="h-3 w-3 text-amber-600" />
                  <span>{item.brands.name}</span>
                </div>
              )}

              <div className="bg-muted/50 p-3 rounded-2xl text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Unit: <strong className="text-foreground">{item.unit}</strong></span>
                  <span>Presets: <strong className="text-foreground">{(item.presets || []).join(", ") || "—"}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>Order Limit: <strong className="text-foreground">{item.min_qty} – {item.max_qty} {item.unit}</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t">
                <span className={item.active ? "text-emerald-600 text-xs font-semibold" : "text-rose-600 text-xs font-semibold"}>
                  {item.active ? "Active" : "Disabled"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(item)}
                  className="rounded-xl text-xs gap-1 h-8"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Item
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. COMPACT TABLE VIEW                                                     */
        /* ========================================================================= */
        <div className="rounded-3xl border bg-card shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
              <tr>
                <th className="py-3 px-4">Photo</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Brand Partner</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Presets</th>
                <th className="py-3 px-4">Min / Max</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition">
                  <td className="py-2.5 px-4">
                    <GenericProduceImage
                      src={item.image_url}
                      alt={item.name_en}
                      fallbackType="product"
                      className="h-9 w-9 rounded-xl object-cover border shadow-sm"
                    />
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-bold text-foreground text-sm">{item.name_en}</div>
                    <div className="text-xs text-muted-foreground font-tamil">{item.name_ta}</div>
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge
                      style={{ backgroundColor: item.categories?.tint || "#EAF3DD", color: "#1c2a1c" }}
                      className="text-[10px] font-semibold border"
                    >
                      {item.categories?.name || "General"}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4">
                    {item.brands ? (
                      <span className="font-semibold text-amber-900 text-xs">{item.brands.name}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Direct Farm</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-bold">{item.unit}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{(item.presets || []).join(", ") || "—"}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{item.min_qty} – {item.max_qty}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.active ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
                      }`}
                    >
                      {item.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      className="rounded-xl text-xs gap-1 h-7 px-2.5"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Master Item Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingItem ? "Edit Master Item" : "Add New Master Produce Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 pt-2">
            {/* Product Image Uploader */}
            <ImageUploader
              label="Product Photo"
              value={imageUrl}
              onChange={setImageUrl}
              maxDimension={1024}
              placeholderText="Upload Product Photo (Max 1024x1024 auto-scaled)"
            />

            <div>
              <Label className="text-xs font-semibold">Item Name in English *</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Tomato / Ladies Finger"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Item Name in Tamil / தமிழ் பெயர்</Label>
              <Input
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
                placeholder="e.g. தக்காளி / வெண்டைக்காய்"
                className="mt-1 rounded-xl text-sm font-tamil"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Category *</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.name_ta ? `(${c.name_ta})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Brand Partner</Label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
                >
                  <option value="">— Generic / Direct Farm —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Unit of Measure</Label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
                >
                  <option value="Kg">Kg</option>
                  <option value="Gram">Gram</option>
                  <option value="Nos">Nos</option>
                  <option value="Litre">Litre</option>
                  <option value="Ml">Ml</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">1-Tap Presets (csv)</Label>
                <Input
                  value={presetsStr}
                  onChange={(e) => setPresetsStr(e.target.value)}
                  placeholder="0.5, 1, 2"
                  className="mt-1 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Min Order Limit</Label>
                <Input
                  type="number"
                  step="any"
                  value={minQty}
                  onChange={(e) => setMinQty(parseFloat(e.target.value) || 0)}
                  className="mt-1 rounded-xl text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Max Order Limit</Label>
                <Input
                  type="number"
                  step="any"
                  value={maxQty}
                  onChange={(e) => setMaxQty(parseFloat(e.target.value) || 0)}
                  className="mt-1 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Pricing, Buying Cost & Discounts Card */}
            <div className="rounded-2xl bg-muted/60 p-3.5 border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Pricing & Margins</span>
                {sellingPrice > 0 && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                    Margin:{" "}
                    {Math.round(
                      (((sellingPrice - (sellingPrice * discountPercent) / 100) - procurementCost) /
                        (sellingPrice - (sellingPrice * discountPercent) / 100)) *
                        100
                    )}
                    %
                  </span>
                )}
              </h4>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Buying Cost (₹)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={procurementCost}
                    onChange={(e) => setProcurementCost(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 28"
                    className="mt-1 rounded-xl text-sm bg-background font-mono"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    MRP / Selling (₹)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 45"
                    className="mt-1 rounded-xl text-sm bg-background font-mono"
                    required
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Discount (%)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="90"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 10"
                    className="mt-1 rounded-xl text-sm bg-background font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t">
                <span className="text-muted-foreground">Final Customer Price:</span>
                <span className="text-sm font-bold text-primary font-mono">
                  ₹{Math.round((sellingPrice - (sellingPrice * discountPercent) / 100) * 100) / 100} / {unit}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="itemActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="itemActive" className="text-xs font-semibold">
                Active in Master Directory
              </Label>
            </div>

            <Button type="submit" className="w-full rounded-2xl bg-primary text-white font-bold h-12 mt-4 shadow">
              {editingItem ? "Save Changes" : "Create Master Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
