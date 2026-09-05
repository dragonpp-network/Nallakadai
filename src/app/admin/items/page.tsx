"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getMasterItemsAction,
  saveMasterItemAction,
  deleteMasterItemAction,
  bulkDeleteItemsAction,
  bulkSaveMasterItemsAction,
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
  Trash2,
  Package,
  Award,
  Layers,
  LayoutGrid,
  List,
  FolderTree,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
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

  // Modals & Selection
  const [modalOpen, setModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [nameEn, setNameEn] = useState("");
  const [nameTa, setNameTa] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [unit, setUnit] = useState("Kg");
  const [presetsStr, setPresetsStr] = useState("0.5, 1, 2");
  const [minQty, setMinQty] = useState(0.5);
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
    setMinQty(0.5);
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
    if (item.pack_options && item.pack_options.length > 0) {
      const hasCustomPrice = item.pack_options.some((o: any) => {
        const defaultRate = Math.round((item.price || item.selling_price || 0) * o.qty * 100) / 100;
        return o.price !== undefined && Math.abs(o.price - defaultRate) > 0.01;
      });
      if (hasCustomPrice) {
        setPresetsStr(item.pack_options.map((o: any) => `${o.label}:${o.price}`).join(" | "));
      } else {
        setPresetsStr(item.pack_options.map((o: any) => o.label).join(", "));
      }
    } else {
      setPresetsStr((item.presets || []).join(", "));
    }
    setMinQty(Number(item.min_qty !== undefined ? item.min_qty : (item.presets?.[0] || 0.5)));
    setMaxQty(Number(item.max_qty || 10));
    setProcurementCost(Number(item.procurement_cost !== undefined ? item.procurement_cost : Math.round((item.price || 50) * 0.7)));
    setSellingPrice(Number(item.selling_price || item.price || 50));
    setDiscountPercent(Number(item.discount_percent || 0));
    setActive(item.active !== false);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveMasterItemAction("a0000000-0000-4000-8000-000000000001", {
        id: editingItem?.id,
        nameEn,
        nameTa,
        categoryId,
        brandId: brandId || null,
        imageUrl,
        unit,
        presets: presetsStr,
        minQty: Number(minQty || 0.5),
        maxQty: Number(maxQty || 10),
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

  // Download Sample Master Items Template (.xlsx / .csv)
  function downloadSampleItemsTemplate(format: "xlsx" | "csv" = "xlsx") {
    const sampleRows = [
      {
        NameEn: "Country Tomato",
        NameTa: "நாட்டுத் தக்காளி",
        Category: "Vegetables",
        Unit: "Kg",
        Presets: "250g, 500g, 1kg",
        MinQty: 0.25,
        MaxQty: 10,
        ProcurementCost: 50,
        MRP: 80,
        DiscountPercent: 0,
        Brand: "Direct Farm",
        Active: "TRUE",
      },
      {
        NameEn: "Country Drumstick",
        NameTa: "நாட்டு முருங்கைக்காய்",
        Category: "Vegetables",
        Unit: "Nos",
        Presets: "2 nos:25 | 5 nos:55 | 10 nos:100",
        MinQty: 2,
        MaxQty: 25,
        ProcurementCost: 20,
        MRP: 35,
        DiscountPercent: 0,
        Brand: "Direct Farm",
        Active: "TRUE",
      },
      {
        NameEn: "Green Chilli",
        NameTa: "பச்சை மிளகாய்",
        Category: "Vegetables",
        Unit: "Gram",
        Presets: "100, 250, 500",
        MinQty: 100,
        MaxQty: 1000,
        ProcurementCost: 15,
        MRP: 25,
        DiscountPercent: 0,
        Brand: "Direct Farm",
        Active: "TRUE",
      },
      {
        NameEn: "Spinach (Pasalai)",
        NameTa: "பசலைக்கீரை",
        Category: "Greens",
        Unit: "Nos",
        Presets: "1, 2, 3",
        MinQty: 1,
        MaxQty: 5,
        ProcurementCost: 15,
        MRP: 25,
        DiscountPercent: 0,
        Brand: "Direct Farm",
        Active: "TRUE",
      },
      {
        NameEn: "A2 Cow Milk",
        NameTa: "நாட்டுப் பசு பால்",
        Category: "Dairy",
        Unit: "Litre",
        Presets: "0.5, 1, 2",
        MinQty: 0.5,
        MaxQty: 5,
        ProcurementCost: 45,
        MRP: 65,
        DiscountPercent: 0,
        Brand: "Nalla Dairy",
        Active: "TRUE",
      },
      {
        NameEn: "Cold Pressed Groundnut Oil",
        NameTa: "மரச்செக்கு நிலக்கடலை எண்ணெய்",
        Category: "Vegan",
        Unit: "Litre",
        Presets: "0.5, 1",
        MinQty: 0.5,
        MaxQty: 5,
        ProcurementCost: 210,
        MRP: 280,
        DiscountPercent: 5,
        Brand: "Nalla Chekku",
        Active: "TRUE",
      },
      {
        NameEn: "Fresh Ginger",
        NameTa: "இஞ்சி",
        Category: "Vegetables",
        Unit: "Gram",
        Presets: "100, 250, 500",
        MinQty: 100,
        MaxQty: 1000,
        ProcurementCost: 30,
        MRP: 50,
        DiscountPercent: 0,
        Brand: "Direct Farm",
        Active: "TRUE",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items_Template");
    const filename = format === "csv" ? "Nallakadai_Master_Items_Template.csv" : "Nallakadai_Master_Items_Template.xlsx";
    XLSX.writeFile(wb, filename);
    toast.success(`Sample Master Items ${format.toUpperCase()} template downloaded!`);
  }

  // Bulk Master Items Upload with Fuzzy Column Matching
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

        const parsedItems: any[] = [];
        let skipped = 0;

        for (const rawRow of rows) {
          const norm: Record<string, any> = {};
          for (const k of Object.keys(rawRow)) {
            const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            norm[cleanKey] = rawRow[k];
          }

          const nameEn = String(
            norm.nameen || norm.itemname || norm.name || norm.item || norm.productname || ""
          ).trim();

          if (!nameEn) {
            skipped++;
            continue;
          }

          const nameTa = String(
            norm.nameta || norm.tamilname || norm.tamil || norm.nameinTamil || ""
          ).trim();

          const category = String(
            norm.category || norm.categoryname || norm.type || "Vegetables"
          ).trim();

          const unit = String(
            norm.unit || norm.uom || norm.unitofmeasure || "Kg"
          ).trim();

          const presets = norm.presets || norm.packsizes || norm.variants || norm.quantities || "";
          const minQty = norm.minqty || norm.minimumqty || norm.minorder || undefined;
          const maxQty = norm.maxqty || norm.maximumqty || norm.maxorder || undefined;
          const mrp = norm.mrp || norm.sellingprice || norm.price || norm.retailprice || 50;
          const procurementCost = norm.procurementcost || norm.buyingcost || norm.cost || norm.farmprice || undefined;
          const discountPercent = norm.discountpercent || norm.discount || norm.offer || 0;
          const brand = norm.brand || norm.brandname || norm.farm || "Direct Farm";
          const activeRaw = String(norm.active !== undefined ? norm.active : "true").toLowerCase();
          const active = activeRaw === "true" || activeRaw === "1" || activeRaw === "yes";

          parsedItems.push({
            nameEn,
            nameTa,
            category,
            unit,
            presets,
            minQty,
            maxQty,
            sellingPrice: mrp,
            procurementCost,
            discountPercent,
            brand,
            active,
          });
        }

        if (parsedItems.length > 0) {
          const res = await bulkSaveMasterItemsAction("demo-admin", parsedItems);
          toast.success(`Import complete! Added: ${res.addedCount}, Updated: ${res.updatedCount} (${skipped} invalid skipped).`);
          setCsvModalOpen(false);
          loadData();
        } else {
          toast.error("No valid items with English item names found in spreadsheet.");
        }
      } catch (err: any) {
        toast.error("Failed to parse spreadsheet file");
      }
    };
    reader.readAsBinaryString(file);
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

  // Selection Handlers
  const isAllSelected = filtered.length > 0 && filtered.every((i) => selectedIds.includes(i.id));

  function toggleSelectAll() {
    if (isAllSelected) {
      const filteredIds = new Set(filtered.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...filtered.map((i) => i.id)]));
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
      const res = await bulkDeleteItemsAction("demo-admin", selectedIds);
      toast.success(`Successfully deleted ${res.deletedCount} master item(s)!`);
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete selected items");
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmSingleDelete() {
    if (!singleDeleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteMasterItemAction("demo-admin", singleDeleteTarget.id);
      toast.success(`Item "${singleDeleteTarget.name_en}" deleted!`);
      setSelectedIds((prev) => prev.filter((id) => id !== singleDeleteTarget.id));
      setSingleDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  }

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

    // Unassigned items category
    const uncategorizedItems = filtered.filter(
      (i) => !categories.some((c) => c.id === i.category_id)
    );
    if (uncategorizedItems.length > 0) {
      groups.push({
        category: {
          id: "uncategorized",
          name: "General / Other Produce",
          name_ta: "இதர பொருட்கள்",
          tint: "#F3F4F6",
        },
        items: uncategorizedItems,
      });
    }

    return groups;
  }, [categories, filtered, selectedCategoryTab, search, selectedBrandFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Produce Master Directory</h1>
          <p className="text-xs text-muted-foreground">
            Manage master produce catalogue, pack size variants, pricing, and bulk import/export
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Sample Templates */}
          <Button
            onClick={() => downloadSampleItemsTemplate("xlsx")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-semibold"
          >
            <Download className="h-4 w-4" /> Sample (.xlsx)
          </Button>
          <Button
            onClick={() => downloadSampleItemsTemplate("csv")}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 border-muted-foreground/30 text-muted-foreground hover:bg-muted font-semibold"
          >
            <FileSpreadsheet className="h-4 w-4" /> Sample (.csv)
          </Button>

          {/* Bulk Import */}
          <Button
            onClick={() => setCsvModalOpen(true)}
            variant="outline"
            className="rounded-xl text-xs gap-1.5 bg-primary/5 text-primary border-primary/30 font-bold"
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </Button>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center rounded-2xl border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                viewMode === "grouped"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Category Grouped View"
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

          {selectedIds.length > 0 && (
            <Button
              onClick={() => setDeleteConfirmOpen(true)}
              variant="destructive"
              className="rounded-2xl text-xs gap-1.5 shadow font-bold bg-red-600 hover:bg-red-700 text-white animate-in fade-in"
            >
              <Trash2 className="h-4 w-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}

          <Button onClick={() => openCreateModal()} className="rounded-2xl bg-primary text-white text-xs gap-1.5 shadow font-bold">
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

      {/* Sticky Multi-Select Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white p-3.5 px-5 shadow-xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2 border border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-white/20 flex items-center justify-center font-bold font-mono text-xs">
              {selectedIds.length}
            </div>
            <span className="text-xs font-semibold">
              {selectedIds.length} produce item(s) selected
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
        /* 1. CATEGORIZED / GROUPED VIEW                                             */
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
                    {groupItems.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <Card
                          key={item.id}
                          className={`p-4 rounded-2xl border bg-background/80 shadow-sm hover:shadow-md transition space-y-2.5 flex flex-col justify-between ${
                            isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectRow(item.id);
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
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
                              <div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/5 p-1 px-2 rounded-lg w-fit">
                                <Award className="h-3 w-3" />
                                <span>{item.brands.name}</span>
                              </div>
                            )}

                            {/* Presets & Pack Variants */}
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">Packs:</span>
                              {(item.presets || []).map((preset: number) => (
                                <span
                                  key={preset}
                                  className="rounded-lg bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground font-mono"
                                >
                                  {preset} {item.unit}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between">
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-bold text-base text-primary font-mono">
                                  ₹{item.price}
                                </span>
                                <span className="text-[11px] text-muted-foreground">/{item.unit}</span>
                                {item.selling_price > item.price && (
                                  <span className="text-[11px] text-muted-foreground line-through font-mono">
                                    ₹{item.selling_price}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                Cost: <span className="font-mono font-medium">₹{item.procurement_cost || "—"}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                className="rounded-xl text-xs h-8 px-2.5"
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSingleDeleteTarget(item)}
                                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                                title="Delete item"
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
              </div>
            );
          })}
        </div>
      ) : viewMode === "grid" ? (
        /* ========================================================================= */
        /* 2. FLAT ALL GRID VIEW                                                     */
        /* ========================================================================= */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <Card
                key={item.id}
                className={`p-4 rounded-2xl border bg-card shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : ""
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSelectRow(item.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <GenericProduceImage
                        src={item.image_url}
                        alt={item.name_en}
                        fallbackType="product"
                        className="h-12 w-12 rounded-2xl object-cover border shadow-sm shrink-0"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{item.name_en}</h3>
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

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-muted font-medium text-foreground">
                      {item.categories?.name || "Uncategorized"}
                    </span>
                    {item.brands && (
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-medium">
                        {item.brands.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <div>
                    <div className="font-bold text-base text-primary font-mono">
                      ₹{item.price}{" "}
                      <span className="text-xs font-normal text-muted-foreground">/{item.unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      className="rounded-xl text-xs h-8 px-2.5"
                    >
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSingleDeleteTarget(item)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                      title="Delete item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* 3. COMPACT TABLE LIST VIEW                                                */
        /* ========================================================================= */
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
                  <th className="p-4">Produce Name</th>
                  <th className="p-4">Category & Brand</th>
                  <th className="p-4">Unit & Pack Sizes</th>
                  <th className="p-4">MRP / Selling</th>
                  <th className="p-4">Final Customer Price</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition ${
                        isSelected ? "bg-primary/5 font-medium" : ""
                      }`}
                    >
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(item.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <GenericProduceImage
                            src={item.image_url}
                            alt={item.name_en}
                            fallbackType="product"
                            className="h-10 w-10 rounded-xl object-cover border shadow-sm shrink-0"
                          />
                          <div>
                            <div className="font-bold text-foreground">{item.name_en}</div>
                            <div className="text-xs font-tamil text-muted-foreground">{item.name_ta || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-medium text-foreground">{item.categories?.name || "Uncategorized"}</div>
                        <div className="text-muted-foreground">{item.brands?.name || "Direct Farm"}</div>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-bold font-mono text-foreground">{item.unit}</span>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {(item.presets || []).join(", ")}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono">
                        <div>₹{item.selling_price || item.price}</div>
                        {item.discount_percent > 0 && (
                          <div className="text-emerald-600 font-bold">{item.discount_percent}% off</div>
                        )}
                      </td>
                      <td className="p-4 font-bold text-primary font-mono">₹{item.price} / {item.unit}</td>
                      <td className="p-4">
                        <Badge variant={item.active ? "default" : "secondary"} className="text-[10px]">
                          {item.active ? "Active" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(item)}
                            className="h-8 text-xs gap-1"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSingleDeleteTarget(item)}
                            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
                            title="Delete item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* CSV / Excel Bulk Import Modal */}
      <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Bulk Import Master Produce (Excel / CSV)</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-950">Download pre-formatted sample template</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Fill the columns: <strong>NameEn, NameTa, Category, Unit, Presets, MinQty, MaxQty, ProcurementCost, MRP, DiscountPercent, Brand, Active</strong>.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadSampleItemsTemplate("xlsx")}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.xlsx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSampleItemsTemplate("csv")}
                  className="rounded-xl text-xs font-semibold gap-1.5 border-amber-600/40 text-amber-900 hover:bg-amber-500/10 h-8"
                >
                  <Download className="h-3.5 w-3.5" />
                  Sample (.csv)
                </Button>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
              <div className="text-xs font-semibold text-foreground">Select your filled produce items spreadsheet</div>
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
          <DialogTitle className="text-lg font-bold">Delete Selected Items?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected produce item(s) from the master catalogue?
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
              {isDeleting ? "Deleting..." : `Yes, Delete ${selectedIds.length} Items`}
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
          <DialogTitle className="text-lg font-bold">Delete Master Item?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{singleDeleteTarget?.name_en}</strong> ({singleDeleteTarget?.name_ta})?
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
              {isDeleting ? "Deleting..." : "Yes, Delete Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Master Item Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingItem ? `Edit ${editingItem.name_en}` : "Add New Produce Item"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Image Uploader */}
            <div>
              <Label className="text-xs font-semibold">Produce Photo (Auto 1:1 Aspect Square)</Label>
              <div className="mt-1.5 flex items-center gap-4">
                <ImageUploader
                  currentImageUrl={imageUrl}
                  onImageSelected={(url) => setImageUrl(url)}
                  aspectRatio={1}
                  label="Upload Item Photo"
                  className="w-28 h-28"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Max 1024 × 1024 resolution.</p>
                  <p>• Clean transparent or white background recommended.</p>
                  <p>• Tap Crop icon to position picture.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Item Name (English)</Label>
                <Input
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Country Tomato"
                  className="mt-1 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Tamil Name (தமிழ் பெயர்)</Label>
                <Input
                  value={nameTa}
                  onChange={(e) => setNameTa(e.target.value)}
                  placeholder="e.g. நாட்டுத் தக்காளி"
                  className="mt-1 rounded-xl text-sm font-tamil"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Produce Category</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.name_ta})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Brand / Farm Partner</Label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm bg-background"
                >
                  <option value="">Direct Farm (No specific brand)</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.name_ta})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Packaging & Quantities */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Base Measuring Unit</Label>
                <select
                  value={unit}
                  onChange={(e) => {
                    const u = e.target.value;
                    setUnit(u);
                    if (!editingItem) {
                      if (u === "Gram") {
                        setPresetsStr("100, 250, 500");
                        setMinQty(100);
                        setMaxQty(1000);
                      } else if (u === "Nos") {
                        setPresetsStr("2, 5, 10");
                        setMinQty(2);
                        setMaxQty(25);
                      } else if (u === "Litre") {
                        setPresetsStr("0.5, 1, 2");
                        setMinQty(0.5);
                        setMaxQty(10);
                      } else if (u === "Ml") {
                        setPresetsStr("250, 500, 1000");
                        setMinQty(250);
                        setMaxQty(5000);
                      } else {
                        setPresetsStr("0.5, 1, 2");
                        setMinQty(0.5);
                        setMaxQty(10);
                      }
                    }
                  }}
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
                <Label className="text-xs font-semibold">Packaging Options / Presets</Label>
                <Input
                  value={presetsStr}
                  onChange={(e) => setPresetsStr(e.target.value)}
                  placeholder="e.g. 250g, 500g, 1kg OR 2 nos:25 | 5 nos:55 | 10 nos:100"
                  className="mt-1 rounded-xl text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  <strong>Mode 1 (Standard):</strong> <code>250g, 500g, 1kg</code> | <strong>Mode 2 (Tiered Packs):</strong> <code>2 nos:25 | 5 nos:55 | 10 nos:100</code>
                </p>
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
