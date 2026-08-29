"use client";

import React, { useEffect, useState } from "react";
import { getAdminOrdersAction, markNonCollectionAction } from "@/lib/actions/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Phone } from "lucide-react";
import { toast } from "sonner";

export default function AdminNonCollectionPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const list = await getAdminOrdersAction();
      setOrders(list.filter((o) => o.nonCollected));
    } catch (err: any) {
      toast.error("Failed to load non-collected records");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(orderId: string) {
    try {
      await markNonCollectionAction("demo-admin", orderId, false);
      toast.success("Flag resolved and cleared");
      loadOrders();
    } catch (err: any) {
      toast.error("Failed to update");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Non-Collection & Defaulter Log</h1>
        <p className="text-xs text-muted-foreground">
          Track uncollected or refused orders across cycles to alert staff during subsequent rounds
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading defaulters...</div>
      ) : orders.length === 0 ? (
        <Card className="p-8 rounded-2xl border text-center text-emerald-600 bg-emerald-50/30">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
          <p className="font-semibold text-sm">No Outstanding Non-Collection Flags</p>
          <p className="text-xs text-muted-foreground mt-1">All dispatched customer orders have been successfully collected.</p>
        </Card>
      ) : (
        <Card className="rounded-2xl border overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground font-semibold">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Reason Recorded</th>
                <th className="p-4">Tentative Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/20">
                  <td className="p-4 font-bold text-destructive">{o.orderNo}</td>
                  <td className="p-4 font-semibold text-foreground">{o.customerName}</td>
                  <td className="p-4 text-xs font-mono">{o.mobile}</td>
                  <td className="p-4 text-xs text-muted-foreground">{o.nonCollectionReason || "Not specified"}</td>
                  <td className="p-4 font-semibold">₹{o.tentativeTotal.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(o.id)}
                      className="rounded-xl text-xs"
                    >
                      Clear Flag
                    </Button>
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
