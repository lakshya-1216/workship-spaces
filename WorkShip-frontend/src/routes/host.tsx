import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  IndianRupee,
  KeyRound,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";

type HostAuthMode = "login" | "signup";

export const Route = createFileRoute("/host")({
  head: () => ({ meta: [{ title: "Host Access - Workship" }] }),
  component: HostAccessPage,
});

function HostAccessPage() {
  const { token, user, setUser, loginHost, isHostLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<HostAuthMode>("login");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function loginAsHost(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Invalid host credentials");
      }
      if (data.user?._id !== user?._id) {
        throw new Error("Use the same account you are currently signed in with.");
      }
      if (!data.user?.isHost) {
        throw new Error("This account is not a host yet. Create host access first.");
      }

      loginHost(data.token);
      setUser(data.user);
      toast.success("Host mode enabled");
      void navigate({ to: "/host-dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enter host mode");
    } finally {
      setLoading(false);
    }
  }

  async function createHostAccess(event: React.FormEvent) {
    event.preventDefault();

    if (!token) {
      toast.error("Please log in to continue");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl("/auth/become-host"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not create host access");
      }

      loginHost(data.token);
      if (data.user) setUser(data.user);
      toast.success("Host access created");
      void navigate({ to: "/host-dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create host access");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <section className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-primary-hover">Workship Hosts</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Host mode, separate from your trips.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Keep browsing, booking, wishlists, messages, and profile access while unlocking host
              tools through a separate host session.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <HostBenefit
                icon={BriefcaseBusiness}
                title="Host dashboard"
                text="Review listings, bookings, guests, and earnings."
              />
              <HostBenefit
                icon={IndianRupee}
                title="Add listings"
                text="Publish spaces only after host access is enabled."
              />
              <HostBenefit
                icon={MessageCircle}
                title="Host messages"
                text="Use a host entry point for guest conversations."
              />
              <HostBenefit
                icon={ShieldCheck}
                title="Normal account stays"
                text="Exit host mode without signing out."
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 rounded-[2rem] bg-primary/20 opacity-70 blur-xl" />
            <div className="relative rounded-[2rem] border border-primary/20 bg-surface-elevated/95 p-6 shadow-[var(--shadow-card)] backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary-hover">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold">Host access</h2>
                  <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
                </div>
              </div>

              {isHostLoggedIn ? (
                <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                  <p className="font-semibold">Host mode is already active.</p>
                  <Link
                    to="/host-dashboard"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
                  >
                    Open host dashboard <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-2 rounded-xl border border-border bg-background p-1">
                    {(["login", "signup"] as const).map((item) => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          mode === item
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        type="button"
                      >
                        {item === "login" ? "Host Login" : "Host Signup"}
                      </button>
                    ))}
                  </div>

                  {mode === "login" ? (
                    <form onSubmit={loginAsHost} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="host-email">Email</Label>
                        <Input
                          id="host-email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="bg-background/50 focus-visible:ring-primary/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="host-password">Password</Label>
                        <Input
                          id="host-password"
                          type="password"
                          required
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="bg-background/50 focus-visible:ring-primary/30"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-primary py-6 text-base font-bold hover:bg-primary-hover"
                      >
                        {loading ? "Checking..." : "Enter host mode"}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={createHostAccess} className="space-y-5">
                      <div className="rounded-2xl border border-border bg-background p-4">
                        <p className="text-sm font-semibold">Create host access for {user?.name}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          This enables hosting for your current account and starts a host session.
                          Your normal login remains active.
                        </p>
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-primary py-6 text-base font-bold hover:bg-primary-hover"
                      >
                        {loading ? "Creating..." : "Create host access"}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

function HostBenefit({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CheckCircle2;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary-hover">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
