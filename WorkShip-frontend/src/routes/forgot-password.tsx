import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot Password - Workship" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("OTP sent! Check your inbox.");
        // Pass email forward via search params so next pages don't need to re-ask
        void navigate({
          to: "/verify-otp",
          search: { email: email.trim().toLowerCase() } as never,
        });
      } else {
        toast.error(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Server connection failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md relative group">
        {/* Glow */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/30 to-primary/10 opacity-50 blur-xl transition-all group-hover:opacity-100 group-hover:duration-500" />

        <div className="relative rounded-[2rem] border border-primary/20 bg-surface-elevated/90 backdrop-blur-xl p-8 shadow-[var(--shadow-card)]">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary-hover">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="font-display text-3xl font-bold">Forgot password?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your account email and we'll send you a 6-digit OTP to reset your password.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 focus-visible:ring-primary/30"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-6 text-base font-bold transition-all hover:scale-[1.02] hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
              {!loading && <Sparkles className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-semibold text-primary-hover hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
