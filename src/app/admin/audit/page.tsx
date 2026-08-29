"use client";

import React, { useEffect, useState } from "react";
import { getAuditLogsAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { toast } from "sonner";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const list = await getAuditLogsAction();
      setLogs(list);
    } catch (err: any) {
      toast.error("Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Audit Trail & Action Log</h1>
        <p className="text-xs text-muted-foreground">
          Immutable chronological record of administrative actions, order edits, and cycle updates
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading audit log...</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground border">
          No administrative actions recorded yet.
        </div>
      ) : (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 text-xs">
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-semibold text-foreground">{log.actor_label || "Admin"}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {log.entity} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ""}
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                    {JSON.stringify(log.after || log.before || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
