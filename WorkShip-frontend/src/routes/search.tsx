import { createFileRoute, Link } from "@tanstack/react-router";
import { Grid3x3, List, Map as MapIcon, SlidersHorizontal, Star, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SearchResultsMap } from "@/components/SearchResultsMap";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { AiIntentChips } from "@/components/AiIntentChips";
import { apiUrl } from "@/lib/api";
import {
  generateAiTags,
  parseAiSearchQuery,
  rankSemanticResults,
  TAG_EMOJIS,
  TAG_LABELS,
  type RankedWorkspace,
} from "@/lib/ai-search";

// ─── Route types ──────────────────────────────────────────────────────────────

type SearchParams = {
  category?: string;
  q?: string;
  aiQuery?: string;
  amenities?: string;
  maxPrice?: number;
  capacity?: number;
};

type WorkspaceResult = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  city?: string;
  country?: string;
  address?: string;
  price?: number;
  pricePerHour?: number;
  rating?: number;
  numReviews?: number;
  reviewCount?: number;
  amenities?: string[];
  images?: string[];
  category?: string;
  capacity?: number;
  available?: boolean;
  location?: {
    type?: string;
    coordinates?: [number, number];
  };
  // Computed client-side after fetch — never sent by API
  aiTags?: string[];
};

// ─── Route definition ─────────────────────────────────────────────────────────

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    category: typeof s.category === "string" ? s.category : "",
    q: typeof s.q === "string" ? s.q : "",
    aiQuery: typeof s.aiQuery === "string" ? s.aiQuery : "",
    amenities: typeof s.amenities === "string" ? s.amenities : "",
    maxPrice: typeof s.maxPrice === "number" ? s.maxPrice : undefined,
    capacity: typeof s.capacity === "number" ? s.capacity : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Search workspaces - Workship" },
      {
        name: "description",
        content: "Search cities and filter by price, amenities, ratings and more.",
      },
    ],
  }),
  component: SearchPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80";

const ALL_AMENITIES = [
  "Wi-Fi",
  "Coffee",
  "Quiet",
  "Monitor",
  "Whiteboard",
  "Outdoor",
  "Phone booths",
  "Printer",
];

// ─── Utility functions ────────────────────────────────────────────────────────

function getWorkspaceId(workspace: WorkspaceResult) {
  return workspace._id || workspace.id || "";
}

function getPrice(workspace: WorkspaceResult) {
  return workspace.price ?? workspace.pricePerHour ?? 0;
}

function getRating(workspace: WorkspaceResult) {
  return workspace.rating ?? 0;
}

function getReviewCount(workspace: WorkspaceResult) {
  return workspace.numReviews ?? workspace.reviewCount ?? 0;
}

function getLocationText(workspace: WorkspaceResult) {
  return (
    [workspace.city, workspace.country].filter(Boolean).join(", ") ||
    workspace.address ||
    "Location not set"
  );
}

function parseAmenityParam(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── AI Match Badge ───────────────────────────────────────────────────────────

function AiMatchBadge({
  matchPct,
  matchReasons,
}: {
  matchPct: number;
  matchReasons: string[];
}) {
  const [open, setOpen] = useState(false);

  // Colour tiers
  const tier =
    matchPct >= 85
      ? "high"
      : matchPct >= 70
        ? "medium"
        : "low";

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-default select-none transition-all ${
          tier === "high"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
            : tier === "medium"
              ? "bg-primary/15 text-primary-hover border border-primary/25"
              : "bg-secondary text-muted-foreground border border-border"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tier === "high"
              ? "bg-emerald-500"
              : tier === "medium"
                ? "bg-primary-hover"
                : "bg-muted-foreground/50"
          }`}
        />
        {matchPct}% Match
      </span>

      {/* Tooltip popover with reasons */}
      {open && matchReasons.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 z-50 min-w-[160px] rounded-xl border border-border bg-surface-elevated shadow-lg p-3 animate-fade-in pointer-events-none">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Why this matches
          </p>
          <ul className="space-y-1">
            {matchReasons.slice(0, 4).map((reason) => {
              // find the tag key for this reason
              const tagKey = Object.keys(TAG_LABELS).find((k) => TAG_LABELS[k] === reason);
              const emoji = tagKey ? (TAG_EMOJIS[tagKey] ?? "✓") : "✓";
              return (
                <li key={reason} className="flex items-center gap-1.5 text-[11px] font-medium">
                  <span>{emoji}</span>
                  <span>{reason}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

function SearchPage() {
  const { category, q, aiQuery, amenities, maxPrice, capacity } = Route.useSearch();
  const [view, setView] = useState<"grid" | "list" | "map">("grid");
  const [price, setPrice] = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [amen, setAmen] = useState<string[]>([]);
  const [minCapacity, setMinCapacity] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [sort, setSort] = useState("recommended");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sync filter state from URL params
  useEffect(() => {
    setPrice(typeof maxPrice === "number" ? maxPrice : 1000);
    setAmen(parseAmenityParam(amenities));
    setMinCapacity(typeof capacity === "number" ? capacity : 0);
    setMinRating(0);
  }, [amenities, capacity, maxPrice]);

  // Fetch workspaces from API + augment with aiTags
  useEffect(() => {
    const controller = new AbortController();

    async function fetchWorkspaces() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const city = q?.trim();
        if (city) params.set("location", city);
        if (category) params.set("category", category);

        const res = await fetch(apiUrl(`/workspaces${params.toString() ? `?${params}` : ""}`), {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch workspaces");

        const data = await res.json();
        const raw: WorkspaceResult[] = Array.isArray(data) ? data : [];

        // Augment each workspace with computed aiTags (client-side, no API needed)
        const augmented = raw.map((ws) => ({
          ...ws,
          aiTags: generateAiTags(ws),
        }));

        setWorkspaces(augmented);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message || "Something went wrong while loading workspaces");
          setWorkspaces([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchWorkspaces();
    return () => controller.abort();
  }, [category, q]);

  // ── Parse the AI query (once per aiQuery change) ──────────────────────
  const parsedAi = useMemo(() => {
    if (!aiQuery?.trim()) return null;
    // We don't have the cities list here, but city extraction from q is
    // already handled by the API call above. Pass [] — city routing is done.
    return parseAiSearchQuery(aiQuery, []);
  }, [aiQuery]);

  // ── Filter + rank ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Step 1: hard filters (price, rating, amenities, capacity)
    let results = workspaces.filter(
      (workspace) =>
        getPrice(workspace) <= price &&
        getRating(workspace) >= minRating &&
        amen.every((item) => workspace.amenities?.includes(item)) &&
        (minCapacity === 0 || (workspace.capacity ?? 0) >= minCapacity),
    );

    // Step 2: AI semantic ranking (when AI query present + sort = recommended)
    if (parsedAi && sort === "recommended") {
      const ranked: RankedWorkspace<WorkspaceResult>[] = rankSemanticResults(
        results,
        parsedAi,
      );
      // Attach matchPct + matchReasons to workspace objects for rendering
      return ranked.map((r) => ({
        ...r.workspace,
        _matchPct: r.matchPct,
        _matchReasons: r.matchReasons,
      }));
    }

    // Step 3: Legacy sort (no AI query, or user overrode sort)
    if (sort === "price-asc") results = [...results].sort((a, b) => getPrice(a) - getPrice(b));
    if (sort === "price-desc") results = [...results].sort((a, b) => getPrice(b) - getPrice(a));
    if (sort === "rating") results = [...results].sort((a, b) => getRating(b) - getRating(a));
    return results;
  }, [workspaces, price, minRating, amen, minCapacity, sort, parsedAi]);

  // ── Event handlers ────────────────────────────────────────────────────

  function toggleAmen(item: string) {
    setAmen((previous) =>
      previous.includes(item) ? previous.filter((value) => value !== item) : [...previous, item],
    );
  }

  function handleMarkerHover(id: string) {
    setHoveredMarkerId(id);
    setHoverId(id);
  }

  function handleMarkerLeave() {
    setHoveredMarkerId(null);
    setHoverId(null);
  }

  function handleMarkerClick(id: string) {
    setActiveWorkspaceId(id);
    setHoverId(id);
    setTimeout(() => {
      const cardElement = cardRefsRef.current.get(id);
      if (cardElement) {
        cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }

  function handlePreviewClose() {
    setActiveWorkspaceId(null);
    setHoverId(null);
    setHoveredMarkerId(null);
  }

  // ── Derived UI state ──────────────────────────────────────────────────

  const activeFilters = [
    price < 1000 && `Up to ₹${price}/hr`,
    minRating > 0 && `${minRating} star+`,
    minCapacity > 0 && `${minCapacity}+ people`,
    ...amen,
  ].filter(Boolean) as string[];

  const isAiMode = !!(parsedAi && aiQuery?.trim());

  // ── Filters panel (shared between sidebar + mobile drawer) ────────────
  const FiltersInner = (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold mb-3">Price per hour</h3>
        <input
          type="range"
          min={0}
          max={1000}
          step={50}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full h-2 accent-[var(--primary-hover)] cursor-pointer"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>₹0</span>
          <span className="font-semibold text-foreground">₹{price}</span>
          <span>₹1000</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Minimum rating</h3>
        <div className="flex gap-2 flex-wrap">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                minRating === r
                  ? "border-primary bg-primary/15 text-primary-hover shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <Star className="h-3 w-3 fill-current" /> {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-3">Amenities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_AMENITIES.map((a) => (
            <button
              key={a}
              onClick={() => toggleAmen(a)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 text-left ${
                amen.includes(a)
                  ? "border-primary bg-primary/15 text-primary-hover shadow-sm"
                  : "border-border hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:gap-3">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                {loading
                  ? "Searching..."
                  : isAiMode
                    ? `${filtered.length} AI-matched workspaces`
                    : `${filtered.length} workspaces`}
              </h1>
              {q && (
                <p className="text-sm text-muted-foreground mt-1">
                  Results in <span className="font-semibold text-foreground">{q}</span>
                </p>
              )}
              {isAiMode && !q && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <span className="text-primary-hover">✦</span>
                  Ranked by AI relevance
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm outline-none transition-colors hover:border-primary/30"
                >
                  <option value="recommended">
                    {isAiMode ? "AI Recommended" : "Recommended"}
                  </option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top rated</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1">
                  {(
                    [
                      ["grid", Grid3x3],
                      ["list", List],
                      ["map", MapIcon],
                    ] as const
                  ).map(([v, Icon]) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`rounded-lg p-2 transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      aria-label={v}
                      title={v.charAt(0).toUpperCase() + v.slice(1)}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/30 md:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </button>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground">Filters:</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary-hover"
                  >
                    {filter}
                  </span>
                ))}
                <button
                  onClick={() => {
                    setPrice(1000);
                    setMinRating(0);
                    setAmen([]);
                    setMinCapacity(0);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
                >
                  ✕ Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar filters */}
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-6">Filters</h2>
              {FiltersInner}
            </div>
          </aside>

          <div className="w-full">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                <div className="inline-flex h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary mb-4" />
                <p className="font-medium">
                  {isAiMode ? "Finding best matches with AI..." : "Loading workspaces..."}
                </p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-dashed border-red-500/40 bg-red-50/20 p-12 text-center">
                <p className="font-display text-lg font-bold text-red-600">
                  Could not load workspaces
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-12 text-center">
                <p className="font-display text-xl font-bold">No workspaces found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try another city or widen your filters.
                </p>
              </div>
            ) : (
              <>
                {/* ── PART 4: AI Intent Explanation Chips ── */}
                {isAiMode && parsedAi && (
                  <AiIntentChips
                    intentTags={parsedAi.intentTags}
                    query={aiQuery ?? ""}
                    resultCount={filtered.length}
                  />
                )}

                {view === "map" ? (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto">
                      {filtered.map((w) => {
                        const id = getWorkspaceId(w);
                        const isHovered = hoverId === id;
                        const isActive = activeWorkspaceId === id;
                        const matchPct = (w as WorkspaceResult & { _matchPct?: number })._matchPct;
                        const matchReasons = (w as WorkspaceResult & { _matchReasons?: string[] })._matchReasons ?? [];

                        return (
                          <div
                            key={id}
                            ref={(el) => {
                              if (el) cardRefsRef.current.set(id, el);
                            }}
                            onMouseEnter={() => {
                              setHoverId(id);
                              setHoveredMarkerId(id);
                            }}
                            onMouseLeave={() => {
                              setHoverId(null);
                              setHoveredMarkerId(null);
                            }}
                            onClick={() => handleMarkerClick(id)}
                            className={`rounded-xl border bg-surface p-4 transition-all duration-200 cursor-pointer ${
                              isActive
                                ? "border-teal-500 shadow-lg ring-1 ring-teal-500/20 bg-teal-50/20 dark:bg-teal-950/10"
                                : isHovered
                                  ? "border-teal-400 shadow-md"
                                  : "border-border hover:border-teal-400/50"
                            }`}
                          >
                            <Link to="/workspace/$id" params={{ id }} className="flex gap-3">
                              <img
                                src={w.images?.[0] || FALLBACK_IMAGE}
                                alt={w.title}
                                width={140}
                                height={120}
                                className="h-24 w-24 shrink-0 rounded-lg object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-1">
                                  <p className="truncate text-sm font-semibold">{w.title}</p>
                                  {isAiMode && matchPct !== undefined && (
                                    <AiMatchBadge matchPct={matchPct} matchReasons={matchReasons} />
                                  )}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                  {getLocationText(w)}
                                </p>
                                <div className="mt-2 flex items-center gap-1 text-xs">
                                  <Star className="h-3 w-3 fill-foreground" /> {getRating(w) || "New"} (
                                  {getReviewCount(w)} reviews)
                                </div>
                                <p className="mt-2 text-sm">
                                  <span className="font-bold text-lg">₹{getPrice(w)}</span>
                                  <span className="text-muted-foreground text-xs">/hr</span>
                                </p>
                              </div>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                    <div className="lg:col-span-2 rounded-2xl border border-border bg-background overflow-hidden h-[70vh] sticky top-32">
                      <SearchResultsMap
                        workspaces={filtered}
                        activeWorkspaceId={activeWorkspaceId}
                        hoveredWorkspaceId={hoveredMarkerId}
                        onMarkerHover={handleMarkerHover}
                        onMarkerLeave={handleMarkerLeave}
                        onMarkerClick={handleMarkerClick}
                        onPreviewClose={handlePreviewClose}
                      />
                    </div>
                  </div>
                ) : view === "list" ? (
                  <div className="space-y-4">
                    {filtered.map((w) => {
                      const id = getWorkspaceId(w);
                      const matchPct = (w as WorkspaceResult & { _matchPct?: number })._matchPct;
                      const matchReasons = (w as WorkspaceResult & { _matchReasons?: string[] })._matchReasons ?? [];

                      return (
                        <Link
                          key={id}
                          to="/workspace/$id"
                          params={{ id }}
                          className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                        >
                          <img
                            src={w.images?.[0] || FALLBACK_IMAGE}
                            alt={w.title}
                            width={300}
                            height={200}
                            className="h-32 w-full sm:h-40 sm:w-48 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                {getLocationText(w)}
                              </p>
                              {isAiMode && matchPct !== undefined && (
                                <AiMatchBadge matchPct={matchPct} matchReasons={matchReasons} />
                              )}
                            </div>
                            <h3 className="font-display text-base sm:text-lg font-bold mt-1">
                              {w.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {w.description}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {w.amenities?.slice(0, 5).map((a) => (
                                <span
                                  key={a}
                                  className="rounded-md bg-secondary px-2 py-1 text-[11px] font-medium"
                                >
                                  {a}
                                </span>
                              ))}
                              {(w.amenities?.length ?? 0) > 5 && (
                                <span className="text-[11px] text-muted-foreground font-medium">
                                  +{(w.amenities?.length ?? 0) - 5} more
                                </span>
                              )}
                            </div>
                            {/* AI match reasons inline for list view */}
                            {isAiMode && matchReasons.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {matchReasons.slice(0, 3).map((reason) => {
                                  const tagKey = Object.keys(TAG_LABELS).find(
                                    (k) => TAG_LABELS[k] === reason,
                                  );
                                  const emoji = tagKey ? (TAG_EMOJIS[tagKey] ?? "✓") : "✓";
                                  return (
                                    <span
                                      key={reason}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary-hover border border-primary/15"
                                    >
                                      {emoji} {reason}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-between py-2 sm:pr-3 gap-4">
                            <div className="flex items-center gap-1 text-sm font-semibold">
                              <Star className="h-4 w-4 fill-foreground" /> {getRating(w) || "New"}
                            </div>
                            <div className="text-right">
                              <p className="text-lg sm:text-xl font-bold">₹{getPrice(w)}</p>
                              <span className="text-xs text-muted-foreground">/hour</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  /* Grid view */
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((w) => {
                      const matchPct = (w as WorkspaceResult & { _matchPct?: number })._matchPct;
                      const matchReasons = (w as WorkspaceResult & { _matchReasons?: string[] })._matchReasons ?? [];
                      return (
                        <div key={getWorkspaceId(w)} className="relative">
                          {isAiMode && matchPct !== undefined && (
                            <div className="absolute top-3 left-3 z-10">
                              <AiMatchBadge matchPct={matchPct} matchReasons={matchReasons} />
                            </div>
                          )}
                          <WorkspaceCard ws={w} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-background p-6 animate-fade-in-up"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Filters</h2>
              <button
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg p-2 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {FiltersInner}
            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Show {filtered.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
