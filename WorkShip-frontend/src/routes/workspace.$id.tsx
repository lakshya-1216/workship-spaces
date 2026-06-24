import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  Heart,
  Map,
  MapPin,
  MessageCircle,
  Share,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { WorkspaceLocationMap } from "@/components/WorkspaceLocationMap";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { apiUrl } from "@/lib/api";
import { openConversation } from "@/lib/chat-store";
import { toast } from "sonner";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

type WorkspaceReview = {
  _id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    name?: string;
    profilePicture?: string;
  };
};

type WorkspaceDetail = {
  _id: string;
  title: string;
  description?: string;
  city?: string;
  address?: string;
  location?: {
    type?: string;
    coordinates?: number[];
  };
  price: number;
  capacity?: number;
  amenities?: string[];
  images?: string[];
  rating?: number;
  numReviews?: number;
  host?: {
    name?: string;
    email?: string;
    profilePicture?: string;
  };
  reviews?: WorkspaceReview[];
};

export const Route = createFileRoute("/workspace/$id")({
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/workspaces/${params.id}`));
    if (!res.ok) throw notFound();

    const ws = (await res.json()) as WorkspaceDetail;
    if (!ws || !ws._id) throw notFound();

    return { ws };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.ws.title} - Workship` },
          { name: "description", content: loaderData.ws.description || "" },
          { property: "og:title", content: loaderData.ws.title },
          { property: "og:description", content: loaderData.ws.description || "" },
          { property: "og:image", content: loaderData.ws.images?.[0] || FALLBACK_IMAGE },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-32 text-center">
      <h1 className="font-display text-3xl font-bold">Workspace not found</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-primary-hover underline">
        Back to home
      </Link>
    </div>
  ),
  component: WorkspacePage,
});

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80";

function WorkspacePage() {
  const { ws } = Route.useLoaderData();
  const navigate = useNavigate();
  const [hours, setHours] = useState(3);
  const [date, setDate] = useState("");
  const [contacting, setContacting] = useState(false);
  const { isAuthenticated, token } = useAuth();
  const { isSaved, toggle } = useWishlist();
  const { trackView } = useRecentlyViewed();

  // Track this workspace as recently viewed
  useEffect(() => {
    trackView(ws._id);
  }, [ws._id, trackView]);

  async function handleContactHost() {
    if (!isAuthenticated || !token) {
      navigate({ to: "/login" });
      return;
    }
    setContacting(true);
    try {
      // Kick off chat store init in background (connects socket, loads conversations)
      // but don't await it — we pass the token directly to openConversation instead.
      const { initChat } = await import("@/lib/chat-store");
      void initChat(token);

      // Pass the token explicitly so openConversation works even if initChat
      // hasn't completed yet (activeToken may still be null on fresh page loads).
      const convId = await openConversation(ws._id, token);
      navigate({ to: "/chat", search: { conv: convId } as never });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("cannot message yourself")) {
        toast.info("This is your own workspace — you can't chat with yourself.");
      } else {
        toast.error(msg || "Could not open conversation. Please try again.");
      }
    } finally {
      setContacting(false);
    }
  }

  async function copyWorkspaceLink(url: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error("Clipboard unavailable");
    }
  }

  async function handleShareWorkspace() {
    const currentUrl = window.location.href;
    const shareData = {
      title: ws.title,
      text: "Check out this workspace on Workship",
      url: currentUrl,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        toast.success("Share sheet opened");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await copyWorkspaceLink(currentUrl);
      toast.success("Link copied successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share workspace link");
    }
  }



  const id = ws._id;
  const liked = isAuthenticated && isSaved(id);
  const images = ws.images?.length ? ws.images : [FALLBACK_IMAGE];
  const reviews = ws.reviews || [];
  const rating = ws.rating || 0;
  const reviewCount = ws.numReviews ?? reviews.length;
  const subtotal = ws.price * hours;
  const fee = Math.round(subtotal * 0.1);
  const total = subtotal + fee;

  // Build Google Maps URL from GeoJSON coordinates [lng, lat]
  const mapsUrl = buildMapsUrl(ws.location, ws.address, ws.city);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{ws.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-foreground" />
              {rating ? rating.toFixed(1) : "New"} - {reviewCount} review
              {reviewCount === 1 ? "" : "s"}
            </span>
            <span className="text-muted-foreground">-</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {ws.city || "Location unavailable"}
            </span>
          </div>
        </div>

        {/* ── Action pills: Save / Share / Open in Maps / Copy Address ── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggle(id)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all hover:scale-105 ${
              liked
                ? "border-rose-400 bg-rose-50 text-rose-500 dark:bg-rose-950"
                : "border-border hover:bg-secondary"
            }`}
            aria-label="Save to wishlist"
          >
            <Heart
              className={`h-4 w-4 transition-all ${liked ? "fill-rose-500 text-rose-500" : ""}`}
            />
            {liked ? "Saved" : "Save"}
          </button>

          <button
            onClick={handleShareWorkspace}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-all hover:bg-secondary"
          >
            <Share className="h-4 w-4" /> Share
          </button>

          {/* Open in Maps */}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open workspace location in Google Maps"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary-hover"
            >
              <Map className="h-4 w-4" /> Open in Maps
            </a>
          ) : (
            <span
              title="Location unavailable"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm opacity-40"
            >
              <Map className="h-4 w-4" /> Open in Maps
            </span>
          )}


        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl">
        <img
          src={images[0]}
          alt={ws.title}
          width={1024}
          height={768}
          className="col-span-4 row-span-2 h-[420px] w-full object-cover md:col-span-2"
        />
        {[1, 2, 0, 1].map((imageIndex, key) => (
          <img
            key={key}
            src={images[imageIndex % images.length]}
            alt=""
            loading="lazy"
            width={512}
            height={384}
            className="hidden h-[206px] w-full object-cover md:block"
          />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex items-center justify-between gap-4 border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <img
                src={ws.host?.profilePicture || "https://i.pravatar.cc/80"}
                alt={ws.host?.name || "Host"}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
              <div>
                <p className="text-sm text-muted-foreground">Hosted by</p>
                <p className="font-display text-lg font-bold">{ws.host?.name || "Host"}</p>
              </div>
            </div>
            <button
              onClick={handleContactHost}
              disabled={contacting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)] disabled:opacity-60"
            >
              <MessageCircle className="h-4 w-4" />
              {contacting ? "Opening chat…" : "Chat with host"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 border-b border-border py-6 md:grid-cols-3">
            <Highlight
              icon={Users}
              title="Up to ${cap}"
              desc="Comfortable, ergonomic setup"
              cap={ws.capacity}
            />
            <Highlight
              icon={ShieldCheck}
              title="Verified host"
              desc="Identity and space verified by Workship"
            />
            <Highlight
              icon={Calendar}
              title="Free cancellation"
              desc="Up to 24 hours before booking"
            />
          </div>

          <div className="border-b border-border py-6">
            <h2 className="font-display text-2xl font-bold">About this space</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {ws.description || "No description has been added for this workspace yet."}
            </p>
          </div>

          <div className="border-b border-border py-6">
            <h2 className="font-display text-2xl font-bold">What this space offers</h2>
            {(ws.amenities || []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No amenities listed yet.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(ws.amenities || []).map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <WorkspaceLocationMap
            location={ws.location}
            title={ws.title}
            address={ws.address}
            city={ws.city}
            mapsUrl={mapsUrl}
          />

          <div className="py-6">
            <h2 className="font-display text-2xl font-bold">Reviews</h2>
            {reviews.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-border p-8 text-center">
                <p className="font-semibold">No reviews yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reviews from completed bookings will show here.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {reviews.map((review) => (
                  <ReviewCard key={review._id} review={review} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky booking sidebar ── */}
        <div>
          <div className="sticky top-24 rounded-3xl border border-border bg-surface-elevated p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-bold">Rs {ws.price}</span>
              <span className="text-sm text-muted-foreground">/ hour</span>
            </div>
            <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-border">
              <label className="border-r border-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider">Date</p>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-1 w-full bg-transparent text-sm outline-none"
                />
              </label>
              <label className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider">Hours</p>
                <select
                  value={hours}
                  onChange={(event) => setHours(Number(event.target.value))}
                  className="mt-1 w-full bg-transparent text-sm outline-none"
                >
                  {[1, 2, 3, 4, 6, 8].map((hour) => (
                    <option key={hour} value={hour}>
                      {hour} hour{hour > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Link
              to="/booking/$id"
              params={{ id: ws._id }}
              search={{ date, hours } as never}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover hover:shadow-[var(--shadow-glow)]"
            >
              Book now
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              You won't be charged yet
            </p>

            {/* Location actions */}
            <div className="mt-5 flex flex-col gap-2">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary-hover active:scale-[0.98]"
                >
                  <Map className="h-4 w-4" /> Open in Maps
                </a>
              ) : (
                <span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium opacity-40">
                  <Map className="h-4 w-4" /> Location unavailable
                </span>
              )}

            </div>

            <div className="mt-5 space-y-2 text-sm">
              <Row label={`Rs ${ws.price} x ${hours} hours`} value={`Rs ${subtotal}`} />
              <Row label="Service fee" value={`Rs ${fee}`} />
              <hr className="my-2 border-border" />
              <Row label="Total" value={`Rs ${total}`} bold />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: WorkspaceReview }) {
  const reviewerName = review.user?.name || "Workship user";

  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <img
          src={review.user?.profilePicture || "https://i.pravatar.cc/80"}
          alt={reviewerName}
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
        />
        <div>
          <p className="text-sm font-semibold">{reviewerName}</p>
          <div className="mt-1 flex items-center gap-2">
            <Stars rating={review.rating} />
            {review.updatedAt && (
              <span className="text-xs text-muted-foreground">{formatDate(review.updatedAt)}</span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {review.comment || "This user left a rating without a written review."}
      </p>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex text-xs text-primary-hover">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`h-3.5 w-3.5 ${value <= rating ? "fill-primary-hover" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  desc,
  cap,
}: {
  icon: typeof MapPin;
  title: string;
  desc: string;
  cap?: number;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="h-5 w-5 shrink-0 text-primary-hover" />
      <div>
        <p className="text-sm font-semibold">
          {cap ? title.replace("${cap}", String(cap)) : title}
        </p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-bold" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span className={bold ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

/**
 * Builds a Google Maps URL from the workspace's GeoJSON location.
 *
 * GeoJSON stores coordinates as [longitude, latitude].
 * Google Maps `?query=` expects latitude,longitude — so we swap.
 *
 * Fallback chain:
 *   1. coordinates  → lat,lng query  (most precise, opens Maps app on mobile)
 *   2. address      → text search
 *   3. city         → text search
 *   4. null         → button disabled
 */
export function buildMapsUrl(
  location?: { type?: string; coordinates?: number[] } | null,
  address?: string | null,
  city?: string | null,
): string | null {
  if (location?.type === "Point" && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    if (
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      lng >= -180 && lng <= 180 &&
      lat >= -90  && lat <= 90
    ) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
  }

  const text = address || city;
  if (text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  }

  return null;
}
