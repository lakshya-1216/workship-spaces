import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, ArrowRight, Wand2, CalendarCheck, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import heroImg from "@/assets/hero-workspace.jpg";
import { CategoryRail } from "@/components/CategoryRail";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { apiUrl } from "@/lib/api";
import { parseAiSearchQuery } from "@/lib/ai-search";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useRecommendations } from "@/hooks/useRecommendations";

type WorkspaceSummary = {
  _id?: string;
  id?: string;
  title: string;
  city?: string;
  country?: string;
  address?: string;
  price?: number;
  pricePerHour?: number;
  category?: string;
  rating?: number;
  amenities?: string[];
  images?: string[];
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Workship — Inspiring workspaces, booked by the hour" },
      {
        name: "description",
        content:
          "Discover private studios, coworking lounges, meeting rooms and rooftops near you. Real-time chat with hosts.",
      },
      { property: "og:title", content: "Workship — Inspiring workspaces" },
      { property: "og:description", content: "Book the perfect place to work, in 60 seconds." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [cat, setCat] = useState("all");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [aiQuery, setAiQuery] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // ── Dynamic city counts ──────────────────────────────────────────────────
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/workspaces/city-counts?limit=6"))
      .then((r) => r.json())
      .then((data: { city: string; count: number }[]) => {
        setTopCities(Array.isArray(data) ? data : []);
      })
      .catch(() => setTopCities([]))
      .finally(() => setCitiesLoading(false));
  }, []);

  const { recentIds } = useRecentlyViewed();
  const { recommendations, personalised, loading: recLoading } = useRecommendations({
    recentIds,
    token,
    limit: 4,
  });

  useEffect(() => {
    fetch(apiUrl("/workspaces/cities"))
      .then((response) => response.json())
      .then((data: string[]) => {
        setCities(Array.isArray(data) ? data : []);
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    async function fetchWorkspaces() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("location", searchTerm);
        if (minPrice) params.append("minPrice", minPrice.toString());
        if (cat !== "all") params.append("category", cat);
        if (selectedAmenities.length > 0) params.append("amenities", selectedAmenities.join(","));

        const queryString = params.toString();
        const url = apiUrl(`/workspaces${queryString ? `?${params}` : ""}`);

        const res = await fetch(url);
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} from ${url}: ${detail || res.statusText}`);
        }
        const data: unknown = await res.json();
        setWorkspaces(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        console.error("[Workship] fetchWorkspaces failed:", { err });
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Could not load workspaces. Is the backend running?");
      } finally {
        setLoading(false);
      }
    }
    fetchWorkspaces();
  }, [cat, searchTerm, minPrice, selectedAmenities]);

  const featured = workspaces.slice(0, 8);

  function submitAiSearch(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = aiQuery.trim();
    const parsed = parseAiSearchQuery(trimmed, cities);

    navigate({
      to: "/search",
      search: {
        q: parsed.city || undefined,
        category: parsed.category || undefined,
        aiQuery: trimmed || undefined,
        amenities: parsed.amenities.length > 0 ? parsed.amenities.join(",") : undefined,
        maxPrice: parsed.maxPrice,
        capacity: parsed.capacity,
      } as never,
    });
  }

  return (
    <div>
      {/* ── Category discovery bar — part of the header ───────────────────── */}
      {/* Sticks below the navbar: mobile header is taller (h-16 bar + h-12
          search + pb-3 = 7.75rem), desktop header is just h-16. */}
      <section className="sticky top-[7.75rem] z-20 min-w-0 border-b border-border-subtle bg-background/95 backdrop-blur-sm md:top-16">
        <div className="mx-auto min-w-0 max-w-7xl px-4 md:px-6">
          <CategoryRail active={cat} onChange={setCat} />
        </div>
      </section>

      {/* ── Editorial hero ──────────────────────────────────────────────── */}
      <section className="border-b border-border-subtle bg-surface">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:px-6 md:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:py-16">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
              Workspaces by the hour
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
              Find a place <em className="font-display font-normal italic">that feels like work.</em>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Quiet studios, sunlit lofts and rooftop desks — book by the hour, chat with hosts
              in real time, and just show up.
            </p>

            {/* AI search */}
            <form onSubmit={submitAiSearch} className="mt-7 w-full max-w-xl">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-elevated p-2 pl-4 shadow-[var(--shadow-soft)] transition-colors focus-within:border-primary/60">
                <Wand2 className="h-4 w-4 shrink-0 text-primary" />
                <input
                  value={aiQuery}
                  onChange={(event) => setAiQuery(event.target.value)}
                  placeholder="Try 'quiet workspace in Delhi under ₹300'"
                  aria-label="Describe your ideal workspace"
                  className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-foreground outline-none placeholder:text-faint"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <Search className="h-4 w-4 shrink-0" /> Search
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-muted-foreground">Popular:</span>
                {[
                  "quiet workspace in Delhi under 300",
                  "meeting room for 10 people in Bangalore",
                  "workspace with parking and coffee",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setAiQuery(suggestion)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-5">
              <Link
                to="/search"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-soft px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-hover-surface"
              >
                Browse all spaces <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="min-w-0">
            <img
              src={heroImg}
              alt="A premium Workship workspace"
              width={1024}
              height={768}
              className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Popular cities ──────────────────────────────────────────────── */}
      {(citiesLoading || topCities.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 pt-10 md:px-6 md:pt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">Popular cities</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Neighborhoods members love right now.
              </p>
            </div>
            <Link
              to="/search"
              className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
            >
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {citiesLoading
              ? // Skeleton placeholders
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                ))
              : topCities.map((item) => (
                  <Link
                    key={item.city}
                    to="/search"
                    search={{ q: item.city } as never}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.city}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.count} {item.count === 1 ? "space" : "spaces"}
                      </p>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      )}

      {/* ── Featured workspaces ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold md:text-2xl">Featured workspaces</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Finding standout spaces…"
                : `${workspaces.length} space${workspaces.length !== 1 ? "s" : ""}${
                    cat !== "all" ? " in this category" : " across every category"
                  }.`}
            </p>
          </div>
          <Link
            to="/search"
            search={cat !== "all" ? ({ category: cat } as never) : undefined}
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center p-12 text-muted-foreground">Loading workspaces...</div>
        ) : error ? (
          <div className="flex justify-center p-12 text-destructive">Error: {error}</div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="font-display text-2xl italic">Nothing here yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another category, or browse everything.
            </p>
            <Link
              to="/search"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Browse all spaces <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid min-w-0 grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((workspace, i) => (
              <WorkspaceCard key={workspace._id || workspace.id} ws={workspace} priority={i < 4} />
            ))}
          </div>
        )}
      </section>

      {/* ── Recommended ─────────────────────────────────────────────────── */}
      <section className="border-y border-border-subtle bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
                {personalised ? "Recommended for you" : "Trending spaces"}
              </p>
              <h2 className="mt-2 text-xl font-bold md:text-2xl">
                {personalised ? "Based on what you usually love" : "Most popular right now"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {personalised
                  ? "Curated from your browsing, saves and bookings."
                  : "Highly rated spaces loved by the Workship community."}
              </p>
            </div>
            <Link
              to="/search"
              search={cat !== "all" ? ({ category: cat } as never) : undefined}
              className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline md:inline-flex"
            >
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-5 sm:mt-8 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-4">
            {recLoading ? (
              // Skeleton cards while loading
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-xl bg-muted" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))
            ) : recommendations.length === 0 ? (
              <p className="col-span-4 py-8 text-center text-muted-foreground">
                No recommendations available yet.
              </p>
            ) : (
              recommendations.map((workspace) => (
                <WorkspaceCard key={workspace._id} ws={workspace} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── How Workship works ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <h2 className="text-xl font-bold md:text-2xl">How Workship works</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          From search to desk in three quiet steps.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Search,
              title: "Describe your day",
              text: "Tell search what you need — quiet corners, big tables, fast Wi-Fi — and browse real spaces.",
            },
            {
              icon: CalendarCheck,
              title: "Book by the hour",
              text: "Pick a time, confirm in seconds and pay only for the hours you use.",
            },
            {
              icon: KeyRound,
              title: "Just show up",
              text: "Chat with your host in real time, walk in, and do your best work.",
            },
          ].map((step) => (
            <div key={step.title} className="rounded-xl border border-border bg-surface p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <step.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Host CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6 md:pb-20">
        <div className="rounded-xl bg-forest text-forest-foreground">
          <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:p-10">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">For hosts</p>
              <h2 className="mt-2 font-display text-3xl leading-tight md:text-4xl">
                <em className="italic">Turn your space into income.</em>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-forest-foreground/75 md:text-base">
                List your studio, loft or meeting room on Workship and welcome members who
                treat it like their own.
              </p>
            </div>
            <Link
              to="/host"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-surface px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-hover-surface"
            >
              Become a host <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
