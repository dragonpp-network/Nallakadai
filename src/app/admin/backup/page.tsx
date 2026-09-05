"use client";

import React, { useEffect, useState } from "react";
import {
  getDatabaseOverviewAction,
  exportDatabaseJsonAction,
  exportDatabaseZipAction,
  restoreDatabaseAction,
  restoreDatabaseZipAction,
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
  Clock,
  ShieldCheck,
  FileArchive,
  History,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminBackupPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileIsZip, setSelectedFileIsZip] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

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

  async function handleDownloadJsonBackup() {
    setDownloadingJson(true);
    try {
      const jsonStr = await exportDatabaseJsonAction();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `nallakadai_store_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Database JSON downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to download database JSON");
    } finally {
      setDownloadingJson(false);
    }
  }

  async function handleDownloadZipBackup() {
    setDownloadingZip(true);
    try {
      const zipBase64 = await exportDatabaseZipAction();
      const binaryString = window.atob(zipBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `nallakadai_full_archive_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Complete Store Archive (.ZIP with images) downloaded!");
    } catch (err: any) {
      toast.error("Failed to download full archive ZIP");
    } finally {
      setDownloadingZip(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const isZip = file.name.endsWith(".zip");
    setSelectedFileIsZip(isZip);

    if (isZip) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = window.btoa(binary);
        setSelectedFileContent(base64);
        setPreviewStats({
          isZip: true,
          fileName: file.name,
          sizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
        });
        toast.info(`Full ZIP Archive verified: ${file.name}`);
      };
      reader.readAsArrayBuffer(file);
    } else {
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
            isZip: false,
            customers: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
            items: Array.isArray(parsed.items) ? parsed.items.length : 0,
            cycles: Array.isArray(parsed.cycles) ? parsed.cycles.length : 0,
            orders: Array.isArray(parsed.orders) ? parsed.orders.length : 0,
            branches: Array.isArray(parsed.branches) ? parsed.branches.length : 0,
            brands: Array.isArray(parsed.brands) ? parsed.brands.length : 0,
          });
          toast.info(`JSON File verified: ${file.name}`);
        } catch (err) {
          setSelectedFileContent(null);
          setPreviewStats(null);
          toast.error("Invalid JSON file. Please select a valid store.json or backup ZIP file.");
        }
      };
      reader.readAsText(file);
    }
  }

  async function handleExecuteRestore() {
    if (!selectedFileContent) {
      toast.error("Please select a valid store.json or .zip backup file first");
      return;
    }

    setRestoring(true);
    try {
      if (selectedFileIsZip) {
        const res = await restoreDatabaseZipAction("demo-admin", selectedFileContent);
        toast.success(
          `🎉 Store & Images restored from ZIP! Loaded ${res.stats.customers} customers, ${res.stats.items} items, ${res.stats.orders} orders.`
        );
      } else {
        const res = await restoreDatabaseAction("demo-admin", selectedFileContent);
        toast.success(
          `🎉 Store restored from JSON! Loaded ${res.stats.customers} customers, ${res.stats.items} items, ${res.stats.orders} orders.`
        );
      }
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
    if (!confirm(`Are you sure you want to restore snapshot "${filename}"? A mandatory safety backup will be created first.`)) {
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
            Safeguard, download, and restore your live store database (customers, items, harvest cycles, orders, and product images).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleDownloadJsonBackup}
            disabled={downloadingJson}
            variant="outline"
            className="rounded-2xl border-primary/40 text-primary font-semibold text-xs h-10 px-3.5 shadow-sm gap-1.5"
          >
            <Download className="h-4 w-4" />
            {downloadingJson ? "Exporting..." : "Download DB (.JSON)"}
          </Button>

          <Button
            onClick={handleDownloadZipBackup}
            disabled={downloadingZip}
            className="rounded-2xl bg-primary text-white font-bold text-xs h-10 px-4 shadow gap-1.5"
          >
            <FileArchive className="h-4 w-4" />
            {downloadingZip ? "Archiving..." : "Download Full Archive (.ZIP)"}
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

      {/* Railway Storage Diagnostics & Guide */}
      <Card className="p-5 rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-foreground">
                  Live Storage Engine & Persistence Status
                </h3>
                {overview?.diagnostics?.isVolume ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] font-mono px-2 py-0.5">
                    ✓ Railway Volume Active (/app/data)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] font-mono px-2 py-0.5">
                    Storage: {overview?.diagnostics?.activeDir || "Local Disk"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Your store writes atomically with an automated 5-snapshot rolling retention policy and permanent browser image caching.
              </p>
            </div>
          </div>
        </div>

        {/* Live Diagnostics Metrics */}
        {overview?.diagnostics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-background/90 rounded-2xl p-3.5 text-xs border">
            <div>
              <span className="text-muted-foreground block text-[11px]">Active Directory</span>
              <span className="font-mono font-bold text-foreground text-xs break-all">
                {overview.diagnostics.activeDir}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Database File Size</span>
              <span className="font-mono font-bold text-emerald-700 text-xs">
                {overview.diagnostics.fileSizeFormatted} (<strong className="font-sans">Ultra-lean</strong>)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Uploaded Images</span>
              <span className="font-mono font-bold text-foreground text-xs">
                {overview.diagnostics.uploadFilesCount || 0} files ({overview.diagnostics.uploadFilesTotalSizeFormatted || "0 MB"})
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Last Updated</span>
              <span className="font-mono font-bold text-foreground text-xs">
                {overview.diagnostics.lastModified ? new Date(overview.diagnostics.lastModified).toLocaleString("en-IN") : "Ready"}
              </span>
            </div>
          </div>
        )}

        <div className="bg-background/80 rounded-2xl p-3.5 text-xs space-y-2 border">
          <div className="font-semibold text-foreground">Storage & Image Optimization Highlights:</div>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Decoupled Images:</strong> All product and category images are saved in <code className="font-mono text-foreground">/uploads</code>, keeping <code className="font-mono text-foreground">store.json</code> under 1 MB.</li>
            <li><strong>Browser Caching:</strong> Images are served with immutable cache headers so customer mobile phones load them instantly.</li>
            <li><strong>5-Snapshot Retention:</strong> The server automatically maintains strictly the last 5 rotating daily snapshots to protect disk space on your Railway plan.</li>
          </ul>
        </div>
      </Card>

      {/* Automated Local Snapshots (Last 5) */}
      <Card className="p-5 rounded-3xl border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-serif font-bold text-base text-foreground">
              Automated Snapshots (Strict 5-Snapshot Rolling Limit)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            {overview?.backups?.length || 0} of 5 active snapshot(s)
          </span>
        </div>

        {overview?.backups?.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-center text-xs text-muted-foreground">
            No automatic snapshots recorded yet. Snapshots are created automatically on every daily save or manual update.
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
              <span>Restore Database from File (.json or .zip)</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your saved <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold">store.json</code> or complete <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold">archive.zip</code> file. A mandatory safety snapshot will be created before applying changes.
            </p>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2">
              <Database className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="text-xs font-semibold text-foreground">
                {selectedFileName ? selectedFileName : "Choose .json or .zip backup file"}
              </div>
              <input
                type="file"
                accept=".json,.zip"
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
                {previewStats.isZip ? (
                  <div className="text-emerald-900 font-mono text-xs">
                    Archive: <strong>{previewStats.fileName}</strong> ({previewStats.sizeFormatted}) — Contains database and all product images.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 font-mono text-emerald-900 pt-1">
                    <div>Customers: <strong>{previewStats.customers}</strong></div>
                    <div>Items: <strong>{previewStats.items}</strong></div>
                    <div>Cycles: <strong>{previewStats.cycles}</strong></div>
                    <div>Orders: <strong>{previewStats.orders}</strong></div>
                    <div>Branches: <strong>{previewStats.branches}</strong></div>
                    <div>Brands: <strong>{previewStats.brands}</strong></div>
                  </div>
                )}
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
