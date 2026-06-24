import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  CheckCheck,
  Menu,
  MessageCircle,
  Search,
  User2,
  X,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { startSimulation, useTotalUnread } from "@/lib/chat-store";
import { useAuth } from "@/contexts/AuthContext";
import { apiUrl } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Booking = {
  _id: string;
  status: "pending" | "confirmed" | "cancelled";
  date: string;
  hours: number;
  totalPrice: number;
  createdAt: string;
  workspace?: {
    _id: string;
    title?: string;
    city?: string;
  };
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: "booking" | "cancelled" | "upcoming";
  bookingId?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function bookingsToNotifications(bookings: Booking[]): NotificationItem[] {
  const now = new Date();
  return bookings
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((b) => {
      const wsName = b.workspace?.title ?? "a workspace";
      const wsCity = b.workspace?.city ? ` in ${b.workspace.city}` : "";
      const bookingDate = new Date(b.date);
      const isUpcoming = bookingDate > now && b.status !== "cancelled";

      if (b.status === "cancelled") {
        return {
          id: b._id,
          title: "Booking cancelled",
          body: `Your booking at ${wsName}${wsCity} has been cancelled.`,
          time: timeAgo(b.createdAt),
          icon: "cancelled" as const,
          bookingId: b._id,
        };
      }
      if (isUpcoming) {
        return {
          id: b._id,
          title: "Upcoming booking",
          body: `You have a session at ${wsName}${wsCity} on ${bookingDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`,
          time: timeAgo(b.createdAt),
          icon: "upcoming" as const,
          bookingId: b._id,
        };
      }
      return {
        id: b._id,
        title: "Booking confirmed",
        body: `Your ${b.hours}h booking at ${wsName}${wsCity} is confirmed. Total: ₹${b.totalPrice}.`,
        time: timeAgo(b.createdAt),
        icon: "booking" as const,
        bookingId: b._id,
      };
    });
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

function NotificationPanel({
  onClose,
  navigate,
}: {
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(apiUrl("/bookings/user"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: Booking[]) => {
        setNotifications(bookingsToNotifications(Array.isArray(data) ? data : []));
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [token]);

  const iconMap = {
    booking: (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary-hover">
        <Calendar className="h-4 w-4" />
      </span>
    ),
    upcoming: (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
        <Bell className="h-4 w-4" />
      </span>
    ),
    cancelled: (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
        <X className="h-4 w-4" />
      </span>
    ),
  };

  return (
    <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-pop)] animate-fade-in-up z-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-bold">Notifications</h3>
        <button
          onClick={() => {
            onClose();
            navigate({ to: "/dashboard" });
          }}
          className="text-xs font-medium text-primary-hover hover:underline"
        >
          View all
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-9 w-9 shrink-0 rounded-2xl bg-secondary" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-2/3 rounded-full bg-secondary" />
                  <div className="h-2 w-full rounded-full bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
            <CheckCheck className="h-8 w-8" />
            <p className="text-sm font-semibold">All caught up!</p>
            <p className="text-xs">No notifications yet. Book a workspace to get started.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    onClose();
                    navigate({ to: "/dashboard" });
                  }}
                  className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  {iconMap[n.icon]}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">{n.time}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border px-4 py-2.5">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="block text-center text-xs font-medium text-primary-hover hover:underline"
          >
            See all bookings →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

function NotificationBell({ token }: { token: string | null }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Compute unread badge: bookings created in the last 7 days
  const refreshUnread = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    const lastSeen = Number(localStorage.getItem("notif_last_seen") ?? 0);
    try {
      const res = await fetch(apiUrl("/bookings/user"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: Booking[] = await res.json();
      const newOnes = data.filter((b) => new Date(b.createdAt).getTime() > lastSeen);
      setUnreadCount(newOnes.length);
    } catch {
      setUnreadCount(0);
    }
  }, [token]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  function handleOpen() {
    setOpen((v) => !v);
    // Mark as seen
    localStorage.setItem("notif_last_seen", String(Date.now()));
    setUnreadCount(0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} navigate={navigate} />}
    </div>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────

function IconButton({
  to,
  label,
  badge,
  children,
}: {
  to: string;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
    >
      {children}
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm animate-pulse-dot">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Lightweight text nav link — no border/bg pill weight */
function NavLink({
  to,
  label,
  search,
}: {
  to: string;
  label: string;
  search?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className="hidden whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground xl:inline-flex"
    >
      {label}
    </Link>
  );
}

/** Pill-style button — used only for "Become a Host" */
function HostButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="hidden items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-accent hover:text-primary-hover lg:inline-flex"
    >
      {label}
    </Link>
  );
}

// ─── CityAutocomplete ─────────────────────────────────────────────────────────

function CityAutocomplete({
  value,
  onChange,
  onSelect,
  onSubmit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (city: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
}) {
  const [allCities, setAllCities] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch all cities on mount
  useEffect(() => {
    setLoading(true);
    fetch(apiUrl("/workspaces/cities"))
      .then((r) => r.json())
      .then((cities: string[]) => {
        setAllCities(Array.isArray(cities) ? cities : []);
      })
      .catch(() => setAllCities([]))
      .finally(() => setLoading(false));
  }, []);

  // Filter suggestions based on input
  const suggestions = value.trim()
    ? allCities.filter((city) => city.toLowerCase().includes(value.toLowerCase()))
    : [];

  // Handle input change
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);

    // Reset debounce timer
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  };

  // Handle suggestion click
  const handleSuggestionClick = (city: string) => {
    onChange(city);
    onSelect(city);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSubmit(e as unknown as React.FormEvent);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (value.trim()) {
          onSubmit(e as unknown as React.FormEvent);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }

    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSuggestions]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.getElementById(`city-suggestion-${selectedIndex}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-elevated pl-4 pr-1.5 py-1.5 shadow-[var(--shadow-soft)] transition-all focus-within:border-primary/50 focus-within:shadow-[var(--shadow-glow)]"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value && setShowSuggestions(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover hover:text-primary-foreground [color:oklch(0.22_0.04_195)]"
        >
          Search
        </button>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-pop)] animate-fade-in-up">
          <ul className="max-h-64 overflow-y-auto">
            {suggestions.map((city, idx) => (
              <li key={city}>
                <button
                  id={`city-suggestion-${idx}`}
                  type="button"
                  onClick={() => handleSuggestionClick(city)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                    idx === selectedIndex
                      ? "bg-primary/10 text-primary-hover font-semibold"
                      : "hover:bg-secondary"
                  }`}
                >
                  {city}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {showSuggestions && value.trim() && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-pop)] animate-fade-in-up">
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {loading ? "Loading cities..." : "No cities match your search"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unread = useTotalUnread();
  const { isAuthenticated, isHostLoggedIn, logout, logoutHost, user, token } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Me";
  const isHostArea = location.pathname.startsWith("/host");

  useEffect(() => {
    startSimulation();
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const city = q.trim();
    navigate({ to: "/search", search: city ? ({ q: city } as never) : ({} as never) });
  }

  function handleLogout() {
    logout();
    setProfileOpen(false);
    navigate({ to: "/", replace: true });
  }

  function handleExitHostMode() {
    logoutHost();
    setProfileOpen(false);
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      {/* ── Main bar ───────────────────────────────────────────────── */}
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between md:justify-start gap-2 md:gap-6 px-4 md:px-10">

        {/* LEFT – Logo */}
        <Logo />

        {/* CENTER – Search (grows to fill space, capped) */}
        <div className="hidden flex-1 md:flex md:justify-center">
          <div className="w-full max-w-md">
            <CityAutocomplete
              value={q}
              onChange={setQ}
              onSelect={(city) => {
                setQ(city);
                navigate({ to: "/search", search: { q: city } as never });
              }}
              onSubmit={submitSearch}
              placeholder="Search by city, e.g. Delhi"
            />
          </div>
        </div>

        {/* RIGHT – Nav actions */}
        <nav className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {/* Lightweight text links – visible on xl+ */}
              <div className="mr-2 hidden items-center gap-5 xl:flex">
                {/* <NavLink to="/search" label="Explore" /> */}
                <NavLink to="/wishlist" label="Wishlist" />
                <NavLink to="/dashboard" label="Dashboard" search={{ tab: "profile" } as never} />
                {isHostLoggedIn ? (
                  <>
                    <NavLink to="/host-dashboard" label="Host Dashboard" />
                    <NavLink to="/add-listing" label="Add Listing" />
                    <NavLink to="/host-messages" label="Host Msgs" />
                  </>
                ) : (
                  <HostButton to="/host" label="Become a Host" />
                )}
              </div>

              {/* Icon cluster */}
              <div className="flex items-center gap-0.5">
                <IconButton to="/chat" label="Messages" badge={unread}>
                  <MessageCircle className="h-4 w-4" />
                </IconButton>
                <NotificationBell token={token} />
              </div>

              {/* Divider */}
              <div className="mx-3 h-6 w-px bg-border" />

              {/* Profile button */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2.5 rounded-full border border-border bg-surface-elevated px-2.5 py-1.5 shadow-[var(--shadow-soft)] transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden text-sm font-medium md:inline">{firstName}</span>
                </button>

                {profileOpen && (
                  <div
                    onMouseLeave={() => setProfileOpen(false)}
                    className="absolute right-0 mt-2.5 w-56 origin-top-right rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-pop)] animate-fade-in-up"
                  >
                    {[
                      { to: "/search", label: "Explore" },
                      { to: "/wishlist", label: "Wishlist" },
                      { to: "/chat", label: "Messages" },
                      { to: "/dashboard", label: "Profile", search: { tab: "profile" } },
                      ...(isHostLoggedIn
                        ? [
                            { to: "/host-dashboard", label: "Host Dashboard" },
                            { to: "/add-listing", label: "Add Listing" },
                            { to: "/host-messages", label: "Host Messages" },
                          ]
                        : [{ to: "/host", label: "Become a Host" }]),
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        search={"search" in item ? (item.search as never) : undefined}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center rounded-xl px-3 py-2 text-sm transition-colors hover:bg-secondary"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {isHostLoggedIn && (
                      <button
                        onClick={handleExitHostMode}
                        className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary"
                      >
                        Exit Host Mode
                      </button>
                    )}
                    <hr className="my-1 border-border" />
                    <button className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary">
                      Help & support
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Guest - Desktop */}
              <div className="mx-1 hidden h-6 w-px bg-border md:block" />
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:block"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-md md:block"
              >
                Sign up
              </Link>

              {/* Guest - Mobile Menu */}
              <div className="relative md:hidden ml-1">
                <button
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground shadow-sm transition-all hover:bg-secondary"
                >
                  <Menu className="h-4 w-4" />
                </button>

                {mobileMenuOpen && (
                  <div
                    onMouseLeave={() => setMobileMenuOpen(false)}
                    className="absolute right-0 mt-2.5 w-48 origin-top-right rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[var(--shadow-pop)] animate-fade-in-up"
                  >
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-primary-hover transition-colors hover:bg-primary/10"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Mobile search row */}
      {!isHostArea && (
        <div className="px-4 pb-3 md:hidden">
          <CityAutocomplete
            value={q}
            onChange={setQ}
            onSelect={(city) => {
              setQ(city);
              navigate({ to: "/search", search: { q: city } as never });
            }}
            onSubmit={submitSearch}
            placeholder="Search by city"
          />
        </div>
      )}
    </header>
  );
}
