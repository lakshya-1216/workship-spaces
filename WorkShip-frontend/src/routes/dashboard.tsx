import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Heart,
  KeyRound,
  Loader2,
  Settings2,
  User2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthUser, useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabId } => ({
    tab: isTabId(search.tab) ? search.tab : "overview",
  }),
  head: () => ({ meta: [{ title: "Dashboard - Workship" }] }),
  component: DashboardPage,
});

type WorkspaceSummary = {
  _id: string;
  title: string;
  city?: string;
  address?: string;
  price?: number;
  images?: string[];
  amenities?: string[];
  rating?: number;
  numReviews?: number;
};

type Booking = {
  _id: string;
  workspace: WorkspaceSummary | null;
  date: string;
  hours: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentId?: string;
  paymentMethod?: string;
  paymentProvider?: string;
  createdAt?: string;
};

type TabId = "overview" | "bookings" | "wishlist" | "profile" | "security";

const TABS: Array<{ id: TabId; label: string; icon: typeof Calendar }> = [
  { id: "overview", label: "Overview", icon: CheckCircle2 },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "profile", label: "Profile", icon: Settings2 },
  { id: "security", label: "Security", icon: KeyRound },
];

function isTabId(value: unknown): value is TabId {
  return (
    value === "overview" ||
    value === "bookings" ||
    value === "wishlist" ||
    value === "profile" ||
    value === "security"
  );
}

function DashboardPage() {
  const { token, user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<TabId>(search.tab || "overview");
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [wishlist, setWishlist] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token],
  );

  useEffect(() => {
    if (!token) return;

    async function loadDashboard() {
      setLoading(true);

      try {
        const [profileRes, bookingsRes, wishlistRes] = await Promise.all([
          fetch(apiUrl("/auth/me"), { headers }),
          fetch(apiUrl("/bookings/user"), { headers }),
          fetch(apiUrl("/auth/wishlist"), { headers }),
        ]);

        if (!profileRes.ok) throw new Error("Could not load your profile");
        if (!bookingsRes.ok) throw new Error("Could not load your bookings");
        if (!wishlistRes.ok) throw new Error("Could not load your wishlist");

        const nextProfile = (await profileRes.json()) as AuthUser;
        const nextBookings = (await bookingsRes.json()) as Booking[];
        const nextWishlist = (await wishlistRes.json()) as WorkspaceSummary[];

        setProfile(nextProfile);
        setUser(nextProfile);
        setBookings(nextBookings);
        setWishlist(nextWishlist);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Dashboard failed to load");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [headers, setUser, token]);

  useEffect(() => {
    setTab(search.tab || "overview");
  }, [search.tab]);

  const upcomingBookings = bookings.filter(
    (booking) => booking.status !== "cancelled" && new Date(booking.date) >= startOfToday(),
  );
  const pastBookings = bookings.filter(
    (booking) => booking.status === "cancelled" || new Date(booking.date) < startOfToday(),
  );
  const totalSpent = bookings
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + booking.totalPrice, 0);
  const pendingCount = bookings.filter((booking) => booking.status === "pending").length;

  function updateProfileField(field: keyof AuthUser, value: string) {
    setProfile((current) => (current ? { ...current, [field]: value } : current));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSavingProfile(true);
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone || "",
          profilePicture: profile.profilePicture || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not save profile");

      setProfile(data);
      setUser(data);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);

    try {
      const res = await fetch(apiUrl("/auth/password"), {
        method: "PUT",
        headers,
        body: JSON.stringify(passwords),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update password");

      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function cancelBooking(id: string) {
    try {
      const res = await fetch(apiUrl(`/bookings/${id}/cancel`), {
        method: "PATCH",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not cancel booking");

      setBookings((current) =>
        current.map((booking) => (booking._id === id ? data.booking : booking)),
      );
      toast.success("Booking cancelled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel booking");
    }
  }

  async function removeWishlist(workspaceId: string) {
    try {
      const res = await fetch(apiUrl(`/auth/wishlist/${workspaceId}`), {
        method: "PUT",
        headers,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update wishlist");

      setWishlist(data.wishlist);
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update wishlist");
    }
  }

  function signOut() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
              {profile?.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="font-display text-3xl font-bold md:text-4xl">
                {profile?.name || "Your dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/search"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
            >
              Browse spaces
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-lg border border-border bg-surface p-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  void navigate({
                    to: "/dashboard",
                    search: { tab: item.id } as never,
                    replace: true,
                  });
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  tab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </aside>

          <main>
            {loading ? (
              <div className="flex min-h-72 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading dashboard...
              </div>
            ) : (
              <>
                {tab === "overview" && (
                  <section className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard label="Upcoming" value={upcomingBookings.length} />
                      <StatCard label="Pending" value={pendingCount} />
                      <StatCard label="Saved" value={wishlist.length} />
                      <StatCard label="Total spent" value={`Rs ${totalSpent}`} />
                    </div>
                    <Panel title="Next bookings">
                      {upcomingBookings.length === 0 ? (
                        <EmptyState
                          title="No upcoming bookings"
                          text="Book a workspace and it will appear here."
                        />
                      ) : (
                        <div className="grid gap-3">
                          {upcomingBookings.slice(0, 3).map((booking) => (
                            <BookingRow
                              key={booking._id}
                              booking={booking}
                              onCancel={cancelBooking}
                            />
                          ))}
                        </div>
                      )}
                    </Panel>
                  </section>
                )}

                {tab === "bookings" && (
                  <section className="space-y-6">
                    <Panel title="Upcoming bookings">
                      {upcomingBookings.length === 0 ? (
                        <EmptyState
                          title="No upcoming bookings"
                          text="Your confirmed and pending reservations will show here."
                        />
                      ) : (
                        <div className="grid gap-3">
                          {upcomingBookings.map((booking) => (
                            <BookingRow
                              key={booking._id}
                              booking={booking}
                              onCancel={cancelBooking}
                            />
                          ))}
                        </div>
                      )}
                    </Panel>
                    <Panel title="Past and cancelled">
                      {pastBookings.length === 0 ? (
                        <EmptyState
                          title="No history yet"
                          text="Completed trips will be listed here."
                        />
                      ) : (
                        <div className="grid gap-3">
                          {pastBookings.map((booking) => (
                            <BookingRow key={booking._id} booking={booking} />
                          ))}
                        </div>
                      )}
                    </Panel>
                  </section>
                )}

                {tab === "wishlist" && (
                  <Panel title="Wishlist">
                    {wishlist.length === 0 ? (
                      <EmptyState
                        title="Nothing saved yet"
                        text="Save workspaces you want to revisit later."
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                        {wishlist.map((workspace) => (
                          <div key={workspace._id} className="space-y-3">
                            <WorkspaceCard ws={workspace} />
                            <button
                              onClick={() => removeWishlist(workspace._id)}
                              className="w-full rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>
                )}

                {tab === "profile" && profile && (
                  <Panel title="Profile">
                    <form onSubmit={saveProfile} className="grid max-w-2xl gap-4">
                      <Field
                        label="Full name"
                        value={profile.name}
                        onChange={(value) => updateProfileField("name", value)}
                        required
                      />
                      <Field
                        label="Email"
                        type="email"
                        value={profile.email}
                        onChange={(value) => updateProfileField("email", value)}
                        required
                      />
                      <Field
                        label="Phone"
                        value={profile.phone || ""}
                        onChange={(value) => updateProfileField("phone", value)}
                      />
                      <Field
                        label="Profile picture URL"
                        value={profile.profilePicture || ""}
                        onChange={(value) => updateProfileField("profilePicture", value)}
                      />
                      <div className="rounded-lg border border-border bg-background p-4 text-sm">
                        <span className="text-muted-foreground">Account role</span>
                        <p className="mt-1 font-semibold capitalize">{profile.role}</p>
                      </div>
                      <button
                        disabled={savingProfile}
                        className="w-fit rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
                      >
                        {savingProfile ? "Saving..." : "Save profile"}
                      </button>
                    </form>
                  </Panel>
                )}

                {tab === "security" && (
                  <Panel title="Security">
                    <form onSubmit={changePassword} className="grid max-w-xl gap-4">
                      <Field
                        label="Current password"
                        type="password"
                        value={passwords.currentPassword}
                        onChange={(value) =>
                          setPasswords((current) => ({ ...current, currentPassword: value }))
                        }
                        required
                      />
                      <Field
                        label="New password"
                        type="password"
                        value={passwords.newPassword}
                        onChange={(value) =>
                          setPasswords((current) => ({ ...current, newPassword: value }))
                        }
                        required
                      />
                      <button
                        disabled={changingPassword}
                        className="w-fit rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-70"
                      >
                        {changingPassword ? "Updating..." : "Update password"}
                      </button>
                    </form>
                  </Panel>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: Booking["status"]) {
  if (status === "confirmed") return "bg-green-500/10 text-green-600";
  if (status === "cancelled") return "bg-red-500/10 text-red-600";
  return "bg-yellow-500/10 text-yellow-700";
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <XCircle className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel?: (id: string) => void }) {
  const workspace = booking.workspace;
  const paymentStatus = booking.paymentId ? "Completed" : "Pending";

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center">
      <img
        src={
          workspace?.images?.[0] ||
          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80"
        }
        alt={workspace?.title || "Workspace"}
        className="h-28 w-full rounded-md object-cover sm:w-36"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold">{workspace?.title || "Deleted workspace"}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(booking.status)}`}
          >
            {booking.status}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              booking.paymentId
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-yellow-500/10 text-yellow-700"
            }`}
          >
            {paymentStatus}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {workspace?.city || workspace?.address || "Location unavailable"} -{" "}
          {formatDate(booking.date)} - {booking.hours} hour{booking.hours > 1 ? "s" : ""}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">₹{booking.totalPrice}</p>
          {booking.paymentMethod && (
            <p className="text-xs text-muted-foreground">{booking.paymentMethod}</p>
          )}
          {booking.paymentId && (
            <p className="font-mono text-xs text-primary-hover">{booking.paymentId}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 sm:flex-col">
        {workspace?._id && (
          <Link
            to="/bookings/$id"
            params={{ id: booking._id }}
            className="rounded-lg border border-border px-3 py-2 text-center text-sm hover:bg-secondary"
          >
            View
          </Link>
        )}
        {onCancel && booking.status !== "cancelled" && (
          <button
            onClick={() => onCancel(booking._id)}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
