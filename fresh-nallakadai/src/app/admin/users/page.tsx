"use client";

import React, { useEffect, useState } from "react";
import { getAdminUsersAction, saveAdminUserAction, getBranchesAction } from "@/lib/actions/admin";
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
import { Plus, Edit, Shield, UserCog, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"super_admin" | "branch_admin">("branch_admin");
  const [branchId, setBranchId] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [uList, bList] = await Promise.all([getAdminUsersAction(), getBranchesAction()]);
      setUsers(uList);
      setBranches(bList);
      if (bList.length > 0) setBranchId(bList[0].id);
    } catch (err: any) {
      toast.error("Failed to load store operators");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("branch_admin");
    setActive(true);
    if (branches.length > 0) setBranchId(branches[0].id);
    setModalOpen(true);
  }

  function openEditModal(u: any) {
    setEditingUser(u);
    setEmail(u.email);
    setFullName(u.full_name);
    setPassword("");
    setRole(u.role);
    setBranchId(u.branch_id || (branches[0]?.id ?? ""));
    setActive(u.active);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveAdminUserAction("a0000000-0000-4000-8000-000000000001", {
        id: editingUser?.id,
        email,
        fullName,
        password: password || undefined,
        role,
        branchId: role === "super_admin" ? null : branchId,
        active,
      });

      toast.success(editingUser ? "User updated!" : "Store Operator account created!");
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Store Operators & User Access</h1>
          <p className="text-xs text-muted-foreground">
            Manage Super Admins and Branch Store Operators with role-based access
          </p>
        </div>

        <Button onClick={openCreateModal} className="rounded-xl bg-primary text-white text-xs gap-1.5">
          <Plus className="h-4 w-4" /> Add Store Operator
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading users...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Default Super Admins Cards */}
          <Card className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">Nagan</h3>
                  <p className="text-xs text-muted-foreground font-mono">pingnagan@gmail.com</p>
                </div>
              </div>
              <Badge className="bg-primary text-white text-[10px]">Super Admin</Badge>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-xl">
              Access: <strong>All Branches & Settings</strong>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base">Good Shop Admin</h3>
                  <p className="text-xs text-muted-foreground font-mono">goodshoperode@gmail.com</p>
                </div>
              </div>
              <Badge className="bg-primary text-white text-[10px]">Super Admin</Badge>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-xl">
              Access: <strong>All Branches & Settings</strong>
            </div>
          </Card>

          {/* Dynamic Admin & Store Operator Users */}
          {users.map((u) => (
            <Card key={u.id} className="p-5 rounded-2xl border bg-card shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive/10 text-olive">
                    <UserCog className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base">{u.full_name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                  </div>
                </div>
                <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className="text-[10px]">
                  {u.role === "super_admin" ? "Super Admin" : "Store Operator"}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/60 p-2.5 rounded-xl flex items-center justify-between">
                <span>Branch: <strong>{u.branches?.name || "Global / Super"}</strong></span>
                <span className={u.active ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                  {u.active ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => openEditModal(u)} className="rounded-xl text-xs gap-1">
                  <Edit className="h-3.5 w-3.5" /> Edit Operator
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Store Operator Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingUser ? "Edit Store Operator" : "Create Store Operator Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Full Name / Operator Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Senthil Kumar"
                className="mt-1 rounded-xl text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Login Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@nallakadai.in"
                className="mt-1 rounded-xl text-sm font-mono"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Password {editingUser ? "(Leave blank to keep current)" : ""}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 rounded-xl text-sm"
                required={!editingUser}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Role</Label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full mt-1 rounded-xl border p-2.5 text-sm"
                >
                  <option value="branch_admin">Store Operator</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {role === "branch_admin" && (
                <div>
                  <Label className="text-xs">Assigned Branch</Label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full mt-1 rounded-xl border p-2.5 text-sm"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="userActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <Label htmlFor="userActive" className="text-xs font-semibold">
                Account Active & Allowed to Sign In
              </Label>
            </div>

            <Button type="submit" className="w-full rounded-xl bg-primary text-white font-bold h-11 mt-4">
              {editingUser ? "Save Changes" : "Create Operator"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
