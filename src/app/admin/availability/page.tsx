"use client";

import React, { useEffect, useState } from "react";
import { getCyclesAction, getCycleAvailabilityAction, saveCycleItemAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Save, Copy } from "lucide-react";
import { toast } from "sonner";

export default function AdminAvailabilityPage() {
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycleId) loadAvailability(selectedCycleId);
  }, [selectedCycleId]);

  async function loadCycles() {
    try {
      const list = await getCyclesAction();
      setCycles(list);
      if (list.length > 0) setSelectedCycleId(list[0].id);
    } catch (err: any) {
      toast.error("Failed to load cycles");
    }
  }

  async function loadAvailability(cycleId: string) {
    setLoading(true);
    try {
      const res = await getCycleAvailabilityAction(cycleId);
      setItems(res.items);
    } catch (err: any) {
      toast.error("Failed to load availability matrix");
    } finally {
      setLoading(false);
    }
  }

  function handleToggleInclude(index: number) {
    const updated = [...items];
    updated[index].included = !updated[index].included;
    setItems(updated);
  }

  function handleFieldChange(index: number, field: string, val: any) {
    const updated = [...items];
    updated[index][field] = val;
    setItems(updated);
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      for (const item of items) {
        await saveCycleItemAction("demo-admin", selectedCycleId, {
          itemId: item.id,
          included: item.included,
          price: Number(item.price) || 0,
          capQty: item.capQty ? Number(item.capQty) : null,
          minQty: item.minQty ? Number(item.minQty) : null,
          maxQty: item.maxQty ? Number(item.maxQty) : null,
        });
      }
      toast.success("All cycle items and prices saved!");
      loadAvailability(selectedCycleId);
    } catch (err: any) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  const filtered = items.filter(
    (i) =>
      i.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      (i.nameTa && i.nameTa.toLowerCase().includes(search.toLowerCase())) ||
      (i.category && i.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Cycle Availability & Pricing</h1>
          <p className="text-xs text-muted-foreground">
            Select items offered for this cycle, configure rates, and set inventory caps
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="rounded-xl border p-2.5 text-sm font-medium"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                Cycle #{c.cycle_no} ({c.branches?.name})
              </option>
            ))}
          </select>

          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className="rounded-xl bg-primary text-white gap-2"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by name in Tamil or English, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border bg-card py-2.5 pl-10 pr-4 text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading items matrix...</div>
      ) : (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
                <tr>
                  <th className="p-4 w-12 text-center">Offer</th>
                  <th className="p-4">Item (English / தமிழ்)</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4 w-32">Price (₹)</th>
                  <th className="p-4 w-28">Max Cap</th>
                  <th className="p-4 w-28">Min Limit</th>
                  <th className="p-4 w-28">Max Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={item.included ? "bg-primary/5" : "opacity-60"}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={item.included}
                        onChange={() => handleToggleInclude(idx)}
                        className="h-4 w-4 rounded accent-primary"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-foreground">{item.nameEn}</div>
                      <div className="text-xs text-muted-foreground font-tamil">{item.nameTa}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs font-semibold text-muted-foreground">{item.unit}</td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="any"
                        value={item.price || ""}
                        onChange={(e) => handleFieldChange(idx, "price", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="h-9 w-28 rounded-lg text-sm font-bold"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        value={item.capQty || ""}
                        onChange={(e) => handleFieldChange(idx, "capQty", parseFloat(e.target.value) || null)}
                        placeholder="None"
                        className="h-9 w-24 rounded-lg text-xs"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="any"
                        value={item.minQty || ""}
                        onChange={(e) => handleFieldChange(idx, "minQty", parseFloat(e.target.value) || null)}
                        className="h-9 w-24 rounded-lg text-xs"
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        step="any"
                        value={item.maxQty || ""}
                        onChange={(e) => handleFieldChange(idx, "maxQty", parseFloat(e.target.value) || null)}
                        className="h-9 w-24 rounded-lg text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
