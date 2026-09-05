"use client";

import React, { useEffect, useState } from "react";
import {
  getDatabaseOverviewAction,
  exportDatabaseJsonAction,
  restoreDatabaseAction,
  restoreSnapshotByNameAction,
} from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Users,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  History,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminBackupPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    setLoading(true);
    try {
      const data = await getDatabaseOverviewAction();
      setOverview(data);
    } catch (err: any) {
      toast.error("Failed to load database stats");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadBackup() {
    setDownloading(true);
    try {
      const jsonStr = await exportDatabaseJsonAction();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `nallakadai_store_backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Database backup downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to download database backup");
    } finally {
      setDownloading(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid structure");
        }
        setSelectedFileContent(text);
        setPreviewStats({
          customers: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
          items: Array.isArray(parsed.items) ? parsed.items.length : 0,
          cycles: Array.isArray(parsed.cycles) ? parsed.cycles.length : 0,
          orders: Array.isArray(parsed.orders) ? parsed.orders.length : 0,
          branches: Array.isArray(parsed.branches) ? parsed.branches.length : 0,
          brands: Array.isArray(parsed.brands) ? parsed.brands.length : 0,
        });
        toast.info(`File verified: ${file.name}`);
      } catch (err) {
        setSelectedFileContent(null);
        setPreviewStats(null);
        toast.error("Invalid JSON file. Please select a valid store.json file.");
      }
    };
    reader.readAsText(file);
  }

  async function handleExecuteRestore() {
    if (!selectedFileContent) {
      toast.error("Please select a valid store.json file first");
      return;
    }

    setRestoring(true);
    try {
      const res = await restoreDatabaseAction("demo-admin", selectedFileContent);
      toast.success(
        `🎉 Store restored! Loaded ${res.stats.customers} customers, ${res.stats.items} items, ${res.stats.orders} orders.`
      );
      setRestoreModalOpen(false);
      setSelectedFileContent(null);
      setSelectedFileName(null);
      setPreviewStats(null);
      loadOverview();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore store data");
    } finally {
      setRestoring(false);
    }
  }

  async function handleRestoreSnapshot(filename: string) {
    if (!confirm(`Are you sure you want to restore snapshot "${filename}"? A safety backup will be created first.`)) {
      return;
    }

    try {
      const res = await restoreSnapshotByNameAction("demo-admin", filename);
      toast.success(`Restored from snapshot ${filename}!`);
      loadOverview();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore snapshot");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Database className="h-6 w-6 text-primary" />
            <span>Database Integrity & Backup Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Safeguard, download, and restore your live store database (customers, items, harvest cycles, and orders).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOverview}
            disabled={loading}
            className="rounded-2xl text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={handleDownloadBackup}
            disabled={downloading}
            className="rounded-2xl bg-primary text-white font-bold text-xs h-10 px-4 shadow gap-1.5"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Exporting..." : "Download Live Backup"}
          </Button>

          <Button
            onClick={() => setRestoreModalOpen(true)}
            className="rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-4 shadow gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Restore from File
          </Button>
        </div>
      </div>

      {/* Live Store Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Customers</span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {loading ? "..." : overview?.customerCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Registered customer logins</p>
        </Card>

        <Card className="p-4 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Master Items</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {loading ? "..." : overview?.itemCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Produce catalogue items</p>
        </Card>

        <Card className="p-4 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Harvest Cycles</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {loading ? "..." : overview?.cycleCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Active and past cycles</p>
        </Card>

        <Card className="p-4 rounded-3xl border bg-card shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Orders</span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {loading ? "..." : overview?.orderCount ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Placed & archived orders</p>
        </Card>
      </div>

      {/* Railway Permanent Cloud Storage Guide */}
      <Card className="p-5 rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/5 shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif font-bold text-base text-foreground">
              Automated Zero-Touch Persistence on Railway
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              To guarantee that new build deployments and code patches never reset your live store data, make sure you have attached a <strong>Railway Persistent Volume</strong> mounted at <code className="bg-background px-1.5 py-0.5 rounded font-mono text-emerald-900 border">/app/data</code>.
            </p>
          </div>
        </div>

        <div className="bg-background/80 rounded-2xl p-3.5 text-xs space-y-2 border">
          <div className="font-semibold text-foreground">How to attach Railway Volume (1-Time Setup):</div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Open your <strong>Railway Dashboard</strong> &rarr; Click on your <strong>fresh-nallakadai</strong> service.</li>
            <li>Click the <strong>Volumes</strong> tab (or click <strong>+ New</strong> &rarr; <strong>Volume</strong>).</li>
            <li>Set the Mount Path to: <strong className="font-mono text-foreground">/app/data</strong> &rarr; Click <strong>Save</strong>.</li>
          </ol>
        </div>
      </Card>

      {/* Automated Local Snapshots */}
      <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-serif font-bold text-base text-foreground">
              Automated System Snapshots (data/backups)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {overview?.backups?.length || 0} snapshot(s) available
          </span>
        </div>

        {overview?.backups?.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-center text-xs text-muted-foreground">
            No automatic snapshots recorded yet. Snapshots are created automatically every day on save.
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden divide-y text-xs">
            {overview?.backups?.map((b: any) => (
              <div key={b.filename} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/10">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-mono font-semibold text-foreground">{b.filename}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Created: {new Date(b.createdAt).toLocaleString("en-IN")} • {(b.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreSnapshot(b.filename)}
                  className="rounded-xl text-xs h-8 px-3 border-primary/30 text-primary hover:bg-primary/5"
                >
                  Restore Snapshot
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Restore Database Modal */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-600" />
              <span>Restore Database from File (.json)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your saved <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold">store.json</code> backup file. The system will validate the schema, automatically migrate all fields, and restore your live data immediately.
            </p>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Database className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="text-xs font-semibold text-foreground">
                {selectedFileName ? selectedFileName : "Choose store.json backup file"}
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelected}
                className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>

            {previewStats && (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 space-y-2 text-xs">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Backup File Verified Ready to Restore:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-emerald-900 pt-1">
                  <div>Customers: <strong>{previewStats.customers}</strong></div>
                  <div>Items: <strong>{previewStats.items}</strong></div>
                  <div>Cycles: <strong>{previewStats.cycles}</strong></div>
                  <div>Orders: <strong>{previewStats.orders}</strong></div>
                  <div>Branches: <strong>{previewStats.branches}</strong></div>
                  <div>Brands: <strong>{previewStats.brands}</strong></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                onClick={() => setRestoreModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteRestore}
                disabled={!selectedFileContent || restoring}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 px-5 shadow"
              >
                {restoring ? "Restoring..." : "Execute Instant Restore"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
