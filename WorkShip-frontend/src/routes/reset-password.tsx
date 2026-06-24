import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
    otp: typeof search.otp === "string" ? search.otp : "",
  }),
  head: () => ({ meta: [{ title: "Reset Password - Workship" }] }),
  component: ResetPasswordPage,
});

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 6 characters", pass: password.length >= 6 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains a letter", pass: /[a-zA-Z]/.test(password) },
  ];
  const strength = checks.filter((c) => c.pass).length;
  const colors = ["bg-red-500", "bg-yellow-500", "bg-primary"];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              check.pass ? "text-primary-hover" : "text-muted-foreground"
            }`}
          >
            <CheckCircle2 className={`h-3 w-3 ${check.pass ? "fill-primary-hover text-primary-hover" : ""}`} />
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResetPasswordPage() {
  const { email, otp } = Route.useSearch();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Guard: require both email and otp to be present
  useEffect(() => {
    if (!email || !otp) void navigate({ to: "/forgot-password" });
  }, [email, otp, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Password reset successfully! Please log in.");
        void navigate({ to: "/login" });
      } else {
        toast.error(data.message || "Could not reset password. Please start over.");
        if (
          data.message?.toLowerCase().includes("expired") ||
          data.message?.toLowerCase().includes("invalid")
        ) {
          void navigate({ to: "/forgot-password" });
        }
      }
    } catch {
      toast.error("Server connection failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const match = confirm.length > 0 && newPassword === confirm;
  const mismatch = confirm.length > 0 && newPassword !== confirm;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md relative group">
        {/* Glow */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/30 to-primary/10 opacity-50 blur-xl transition-all group-hover:opacity-100 group-hover:duration-500" />

        <div className="relative rounded-[2rem] border border-primary/20 bg-surface-elevated/90 backdrop-blur-xl p-8 shadow-[var(--shadow-card)]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary-hover">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-bold">Set new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a strong password for{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* New password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50 pr-10 focus-visible:ring-primary/30"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`bg-background/50 pr-10 transition-colors focus-visible:ring-primary/30 ${
                    match
                      ? "border-primary focus-visible:ring-primary/30"
                      : mismatch
                      ? "border-red-500/50 focus-visible:ring-red-500/20"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="text-xs text-red-500">Passwords don't match.</p>
              )}
              {match && (
                <p className="flex items-center gap-1 text-xs text-primary-hover">
                  <CheckCircle2 className="h-3 w-3 fill-primary-hover" /> Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || newPassword.length < 6 || newPassword !== confirm}
              className="w-full rounded-xl bg-primary py-6 text-base font-bold transition-all hover:scale-[1.02] hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
            >
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
