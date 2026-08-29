import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getPinLock, savePinLock, unlockPin, clearPinLock } from "@/lib/pin-lock";
import { claimSuperAdmin } from "@/lib/admin.functions";
import { BrandSplit } from "@/components/brand/BrandSplit";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff sign in | Fresh Nalla Kadai" },
      {
        name: "description",
        content:
          "Fresh Nalla Kadai back office sign in for branch staff — manage ordering cycles, availability and procurement.",
      },
      { property: "og:title", content: "Staff sign in | Fresh Nalla Kadai" },
      {
        property: "og:description",
        content: "Back office access for Fresh Nalla Kadai branch staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"pin" | "password" | "setPin">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState<{ label: string } | null>(null);

  useEffect(() => {
    const l = getPinLock();
    if (l) {
      setLocked({ label: l.label });
      setMode("pin");
    }
  }, []);

  async function afterSession(label: string) {
    try {
      await claimSuperAdmin({ data: { email: label, name: label } });
    } catch {
      /* role already assigned elsewhere */
    }
    navigate({ to: "/admin" });
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return void toast.error(error.message);
    if (!data.session) return void toast.error("Sign in failed. Please try again.");
    setMode("setPin");
  }

  async function signUp() {
    if (!email || password.length < 8)
      return void toast.error("Enter an email and a password of at least 8 characters.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/auth" },
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    if (!data.session)
      return void toast.success("Account created. Check your email to confirm, then sign in.");
    setMode("setPin");
  }

  async function storePin(skip: boolean) {
    if (skip) return afterSession(email);
    if (!/^\d{4}$/.test(pin)) return void toast.error("The PIN must be exactly 4 digits.");
    if (pin !== pin2) return void toast.error("The two PINs do not match.");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.refresh_token;
    if (!token) return void toast.error("Session expired. Please sign in again.");
    await savePinLock({ pin, mobile: "", label: email || "Admin", refreshToken: token });
    toast.success("PIN saved on this device.");
    afterSession(email);
  }

  async function pinSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) return void toast.error("Enter your 4-digit PIN.");
    setBusy(true);
    const token = await unlockPin(pin);
    if (!token) {
      setBusy(false);
      return void toast.error("Incorrect PIN.");
    }
    const { error } = await supabase.auth.refreshSession({ refresh_token: token });
    setBusy(false);
    if (error) {
      clearPinLock();
      setLocked(null);
      setMode("password");
      return void toast.error("This device needs a fresh sign in.");
    }
    navigate({ to: "/admin" });
  }

  return (
    <BrandSplit
      variant="store"
      eyebrow="Back office"
      headline="Organic & traditional food products"
      tamil="இயற்கை உணவு — நேரடி விவசாயியிடமிருந்து"
    >
      <div className="card-warm p-6">

          {mode === "pin" && (
            <form onSubmit={pinSignIn} className="space-y-4">
              <div>
                <h2 className="text-xl">Welcome back</h2>
                <p className="text-sm text-muted-foreground">{locked?.label}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">4-digit PIN</Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.6em]"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Unlock
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline"
                onClick={() => {
                  clearPinLock();
                  setLocked(null);
                  setPin("");
                  setMode("password");
                }}
              >
                Use email and password instead
              </button>
            </form>
          )}

          {mode === "password" && (
            <form onSubmit={signIn} className="space-y-4">
              <h2 className="text-xl">Staff sign in</h2>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Sign in
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={signUp}
              >
                Create the first admin account
              </Button>
            </form>
          )}

          {mode === "setPin" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl">Set a quick PIN</h2>
                <p className="text-sm text-muted-foreground">
                  Next time on this device you can sign in with just 4 digits.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="np">New PIN</Label>
                <Input
                  id="np"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.6em]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="np2">Confirm PIN</Label>
                <Input
                  id="np2"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.6em]"
                />
              </div>
              <Button className="w-full" onClick={() => storePin(false)}>
                Save PIN and continue
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline"
                onClick={() => storePin(true)}
              >
                Skip for now
              </button>
            </div>
          )}
      </div>
    </BrandSplit>

  );
}
