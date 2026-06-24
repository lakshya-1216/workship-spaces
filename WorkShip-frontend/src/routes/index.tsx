import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Sparkles, MapPin, ArrowRight, Wand2 } from "lucide-react";
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

  const featured = workspaces.slice(0, 3);

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
      {/* ── Premium Aurora Hero ───────────────────────────────────────────── */}
      <section className="hero-aurora relative overflow-hidden">
        {/* ── Background layers: photo + dark veil ─────────────────────── */}
        <div className="absolute inset-0 -z-10 group">
          <img
            src={heroImg}
            alt=""
            width={1600}
            height={1024}
            className="h-full w-full object-cover opacity-[0.07] dark:opacity-30 transition-transform duration-[3000ms] ease-out group-hover:scale-105"
          />
          {/* Dark fade so image doesn't fight the gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>

        {/* ── Floating aurora orbs ──────────────────────────────────────── */}
        {/* Orb 1 — top-centre emerald primary blob */}
        <div
          className="hero-orb"
          style={{
            width: "65vw",
            height: "55vh",
            top: "-20vh",
            left: "17.5vw",
            background: "radial-gradient(circle, rgba(16,185,129,0.38) 0%, rgba(16,185,129,0.06) 70%, transparent 100%)",
            animationDuration: "16s",
            animationDelay: "0s",
          }}
        />
        {/* Orb 2 — right teal accent */}
        <div
          className="hero-orb"
          style={{
            width: "45vw",
            height: "50vh",
            top: "5vh",
            right: "-10vw",
            background: "radial-gradient(circle, rgba(20,184,166,0.28) 0%, rgba(20,184,166,0.04) 70%, transparent 100%)",
            animationDuration: "20s",
            animationDelay: "-5s",
          }}
        />
        {/* Orb 3 — left cyan accent */}
        <div
          className="hero-orb"
          style={{
            width: "40vw",
            height: "45vh",
            top: "15vh",
            left: "-8vw",
            background: "radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.04) 70%, transparent 100%)",
            animationDuration: "18s",
            animationDelay: "-9s",
          }}
        />
        {/* Orb 4 — bottom-centre gentle bleed for seamless page transition */}
        <div
          className="hero-orb"
          style={{
            width: "60vw",
            height: "30vh",
            bottom: "-10vh",
            left: "20vw",
            background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
            animationDuration: "22s",
            animationDelay: "-12s",
            filter: "blur(60px)",
          }}
        />

        {/* Subtle film-grain for perceived depth */}
        <div className="hero-noise" aria-hidden="true" />

        {/* ── Bottom fade — blends into page background ─────────────────── */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-6 pt-8 text-center md:px-6 md:pb-12 md:pt-16 lg:pb-16 lg:pt-20">
          <div className="flex max-w-4xl flex-col items-center">

            {/* Badge */}
            <span className="inline-flex cursor-default items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary-hover backdrop-blur-md transition-transform hover:scale-105">
              <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">AI-powered workspace discovery</span>
            </span>

            {/* Headline with gradient text */}
            <h1 className="hero-gradient-text mt-6 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-balance transition-all duration-500">
              Find a place that matches the work you came to do.
            </h1>

            {/* Sub-headline */}
            <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-xl">
              From quiet studios to rooftop desks — book by the hour, chat with hosts in real time,
              and just show up.
            </p>

            {/* AI Search box with glow halo */}
            <form
              onSubmit={submitAiSearch}
              className="relative z-10 mt-10 w-full max-w-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Glow halo */}
              <div className="search-glow" aria-hidden="true" />

              <div className="rounded-[2rem] border border-primary/20 bg-surface-elevated/90 p-2.5 shadow-[var(--shadow-card)] backdrop-blur-xl transition-all">
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 rounded-3xl md:rounded-[1.5rem] bg-background/80 px-4 py-4 md:px-5 md:py-4 transition-all focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/30">
                  <div className="flex items-center flex-1 gap-3 border-b border-border/50 pb-3 md:border-none md:pb-0">
                    <Wand2 className="h-5 w-5 md:h-6 md:w-6 animate-pulse text-primary-hover shrink-0" />
                    <input
                      value={aiQuery}
                      onChange={(event) => setAiQuery(event.target.value)}
                      placeholder="Try 'quiet workspace in Delhi under ₹300'"
                      className="flex-1 bg-transparent text-base md:text-lg outline-none placeholder:text-muted-foreground/70 min-w-0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] active:scale-95 w-full md:w-auto mt-2 md:mt-0"
                  >
                    <Search className="h-4 w-4 shrink-0" /> Search
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <span className="mr-1">Try:</span>
                  {[
                    "quiet workspace in Delhi under 300",
                    "meeting room for 10 people in Bangalore",
                    "workspace with parking and coffee",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setAiQuery(suggestion)}
                      className="rounded-full bg-secondary/80 px-3 py-1.5 transition-colors hover:bg-primary/20 hover:text-primary-hover"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </form>

          </div>
        </div>
      </section>

      <section className="sticky top-16 z-20 border-b border-border glass">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <CategoryRail active={cat} onChange={setCat} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {loading ? (
          <div className="flex justify-center p-12 text-muted-foreground">Loading workspaces...</div>
        ) : error ? (
          <div className="flex justify-center p-12 text-red-500">Error: {error}</div>
        ) : workspaces.length === 0 ? (
          <div className="flex justify-center p-12 text-muted-foreground">No workspaces found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {workspaces.map((workspace, i) => (
              <WorkspaceCard key={workspace._id || workspace.id} ws={workspace} priority={i < 4} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-hover">
                <Sparkles className="h-3 w-3" />
                {personalised ? "Recommended for you" : "Trending spaces"}
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
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
              className="hidden items-center gap-1 text-sm font-semibold text-primary-hover hover:underline md:inline-flex"
            >
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {recLoading ? (
              // Skeleton cards while loading
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-3xl bg-muted" />
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
      <br></br>
      {/* ── Popular Cities ─────────────────────────────────────────────────── */}
      {(citiesLoading || topCities.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Popular cities</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {citiesLoading
              ? // Skeleton placeholders
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
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
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <MapPin className="h-4 w-4 text-primary-hover" />
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
    </div>
  );
}
