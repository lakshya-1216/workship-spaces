import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Calendar, IndianRupee, Plus, Star, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { HostProtectedRoute } from "@/components/HostProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";

type HostTab = "overview" | "listings" | "earnings";
type HostListing = {
  _id: string;
  title: string;
  city?: string;
  address?: string;
  price?: number;
  rating?: number;
  images?: string[];
};
type EarningsPoint = {
  date: string;
  label: string;
  earnings: number;
};
type HostStats = {
  totalListings: number;
  totalBookings: number;
  totalGuests: number;
  averageRating: number;
  totalEarnings: number;
  earningsLast7Days: EarningsPoint[];
  listings: HostListing[];
};

export const Route = createFileRoute("/host-dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: HostTab } => ({
    tab: isHostTab(search.tab) ? search.tab : "overview",
  }),
  head: () => ({ meta: [{ title: "Host Dashboard - Workship" }] }),
  component: HostDashboardPage,
});

const TABS: Array<{ id: HostTab; label: string }> = [
  { id: "overview", label: "Dashboard" },
  { id: "listings", label: "Listings" },
  { id: "earnings", label: "Earnings" },
];
const LIVE_REFRESH_MS = 5000;

function isHostTab(value: unknown): value is HostTab {
  return value === "overview" || value === "listings" || value === "earnings";
}

function HostDashboardPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { hostToken } = useAuth();
  const activeTab = search.tab || "overview";
  const [stats, setStats] = useState<HostStats>(() => getEmptyStats());
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<HostListing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const earningsPath = useMemo(
    () => buildEarningsPath(stats.earningsLast7Days),
    [stats.earningsLast7Days],
  );

  const loadHostStats = useCallback(
    async ({ showLoading = false, showError = false } = {}) => {
      if (!hostToken) return;

      if (showLoading) setLoading(true);
      try {
        const response = await fetch(apiUrl("/host/stats"), {
          headers: {
            Authorization: `Bearer ${hostToken}`,
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Could not load host stats");
        }

        setStats({
          ...getEmptyStats(),
          ...data,
          earningsLast7Days: Array.isArray(data.earningsLast7Days)
            ? data.earningsLast7Days
            : getEmptyStats().earningsLast7Days,
          listings: Array.isArray(data.listings) ? data.listings : [],
        });
      } catch (error) {
        if (showError) {
          toast.error(error instanceof Error ? error.message : "Could not load host stats");
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [hostToken],
  );

  async function handleDelete(workspace: HostListing) {
    if (!hostToken) return;
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/workspaces/${workspace._id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${hostToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not delete workspace");

      // Optimistic UI — remove instantly from local state
      setStats((prev) => ({
        ...prev,
        listings: prev.listings.filter((l) => l._id !== workspace._id),
        totalListings: Math.max(0, prev.totalListings - 1),
      }));
      setConfirmDelete(null);
      toast.success(`"${workspace.title}" deleted successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workspace");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!hostToken) return;

    void loadHostStats({ showLoading: true, showError: true });

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void loadHostStats();
      }
    };
    const refreshOnFocus = () => {
      void loadHostStats();
    };

    const intervalId = window.setInterval(refreshIfVisible, LIVE_REFRESH_MS);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [loadHostStats, hostToken]);

  return (
    <HostProtectedRoute>
      {confirmDelete && (
        <DeleteConfirmModal
          title={confirmDelete.title}
          deleting={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-6">
          <div>
            <p className="text-sm text-muted-foreground">Host workspace</p>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Host dashboard</h1>
          </div>
          <Link
            to="/host-add-listing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add listing
          </Link>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-lg border border-border bg-surface p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  void navigate({
                    to: "/host-dashboard",
                    search: { tab: tab.id } as never,
                    replace: true,
                  });
                }}
                className={`flex w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </aside>

          <main>
            {activeTab === "overview" && (
              <section className="space-y-6">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  <Stat
                    icon={IndianRupee}
                    label="Earnings"
                    value={loading ? "..." : `Rs ${stats.totalEarnings}`}
                    trend="Last 7 days"
                  />
                  <Stat
                    icon={Calendar}
                    label="Bookings"
                    value={loading ? "..." : String(stats.totalBookings)}
                    trend={`${stats.totalListings} listings`}
                  />
                  <Stat
                    icon={Users}
                    label="Guests"
                    value={loading ? "..." : String(stats.totalGuests)}
                    trend="Unique guests"
                  />
                  <Stat
                    icon={Star}
                    label="Avg. rating"
                    value={
                      loading ? "..." : stats.averageRating ? stats.averageRating.toFixed(2) : "New"
                    }
                    trend="Host listings"
                  />
                </div>
                <Panel title="This week">
                  <div className="grid gap-3 sm:grid-cols-7">
                    {stats.earningsLast7Days.map((day) => {
                      const earned = day.earnings > 0;
                      return (
                        <div
                          key={day.date}
                          className={`rounded-lg border p-4 text-sm ${
                            earned
                              ? "border-primary/40 bg-primary/15"
                              : "border-border bg-background"
                          }`}
                        >
                          <p className="font-semibold">{day.label}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {earned ? `Rs ${day.earnings}` : "No earnings"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </section>
            )}

            {activeTab === "listings" && (
              <Panel title="Listings">
                <div className="grid gap-3">
                  {stats.listings.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                      No listings yet.
                    </div>
                  )}
                  {stats.listings.map((workspace) => (
                    <div
                      key={workspace._id}
                      className="flex flex-col gap-4 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center"
                    >
                      <img
                        src={
                          workspace.images?.[0] ||
                          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80"
                        }
                        alt={workspace.title}
                        className="h-28 w-full rounded-md object-cover sm:w-40"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{workspace.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {workspace.city || workspace.address || "Location unavailable"} - Rs{" "}
                          {workspace.price || 0}/hr - {workspace.rating || "New"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          to="/workspace/$id"
                          params={{ id: workspace._id }}
                          className="rounded-lg border border-border px-3 py-2 text-center text-sm font-semibold hover:bg-secondary"
                        >
                          Preview
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(workspace)}
                          aria-label={`Delete ${workspace.title}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {activeTab === "earnings" && (
              <Panel title="Earnings">
                <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                  <div>
                    <svg viewBox="0 0 600 220" className="h-56 w-full rounded-lg bg-background">
                      <defs>
                        <linearGradient id="host-earnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={earningsPath.area} fill="url(#host-earnings)" />
                      <path
                        d={earningsPath.line}
                        stroke="var(--primary-hover)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-5">
                    <p className="text-sm text-muted-foreground">Estimated payout</p>
                    <p className="mt-2 font-display text-3xl font-bold">
                      {loading ? "..." : `Rs ${stats.totalEarnings}`}
                    </p>
                    <p className="mt-2 text-sm text-success">
                      {stats.totalBookings} host booking{stats.totalBookings === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </Panel>
            )}
          </main>
        </div>
      </div>
    </HostProtectedRoute>
  );
}

function getEmptyStats(): HostStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    totalListings: 0,
    totalBookings: 0,
    totalGuests: 0,
    averageRating: 0,
    totalEarnings: 0,
    earningsLast7Days: Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      return {
        date: date.toISOString(),
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        earnings: 0,
      };
    }),
    listings: [],
  };
}

function buildEarningsPath(points: EarningsPoint[]) {
  const values = points.length ? points : getEmptyStats().earningsLast7Days;
  const max = Math.max(...values.map((point) => point.earnings), 0);
  const chartPoints = values.map((point, index) => {
    const x = index * 100;
    const y = max > 0 ? 180 - (point.earnings / max) * 135 : 165;
    return { x, y };
  });
  const line = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L600 220 L0 220 Z`;

  return { line, area };
}

function Stat({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary-hover">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
        <ArrowUpRight className="h-3 w-3" /> {trend}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DeleteConfirmModal({
  title,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in-up">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-popover p-6 shadow-[var(--shadow-pop)]">
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
        <h2 className="mt-3 font-display text-lg font-bold">Delete listing?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">"{title}"</span>? This
          action cannot be undone and the listing will be removed from all public
          pages.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
