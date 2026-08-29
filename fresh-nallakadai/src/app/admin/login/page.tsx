"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandSplit } from "@/components/brand/BrandSplit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginAction } from "@/lib/actions/admin";
import { toast } from "sonner";
import { ShieldCheck, Lock, Mail } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await adminLoginAction(email, password);
      if (res.success) {
        localStorage.setItem("nk_admin_user", JSON.stringify(res.user));
        toast.success(`Welcome back, ${res.user.fullName}!`);
        router.push("/admin");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  function fillSuperAdmin(emailVal: string) {
    setEmail(emailVal);
    setPassword("Nallakadai@2026");
  }

  return (
    <BrandSplit
      variant="store"
      eyebrow="Operations Management"
      headline="Branch staff & administrator access portal."
      tamil="நிர்வாகி மற்றும் கிளை ஊழியர்கள் உள்நுழைவு."
    >
      <div className="rounded-3xl bg-card p-6 shadow-2xl border border-border">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Admin Portal</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sign in with your administrator email & password</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="pingnagan@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl h-11 pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl h-11 pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-white font-medium shadow hover:bg-primary/90 transition"
          >
            {loading ? "Verifying..." : "Sign In to Operations Portal →"}
          </Button>
        </form>

        {/* Quick Super Admin Test Buttons */}
        <div className="mt-6 rounded-2xl bg-muted/60 p-3 border text-xs space-y-2">
          <div className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
            Quick Super Admin Login:
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => fillSuperAdmin("pingnagan@gmail.com")}
              className="text-left py-1 px-2 rounded-lg bg-card hover:bg-background border text-primary font-mono text-[11px] truncate"
            >
              👑 pingnagan@gmail.com
            </button>
            <button
              type="button"
              onClick={() => fillSuperAdmin("goodshoperode@gmail.com")}
              className="text-left py-1 px-2 rounded-lg bg-card hover:bg-background border text-primary font-mono text-[11px] truncate"
            >
              👑 goodshoperode@gmail.com
            </button>
          </div>
        </div>

        <div className="mt-6 border-t pt-4 text-center">
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground underline">
            ← Back to Customer Storefront
          </a>
        </div>
      </div>
    </BrandSplit>
  );
}
