import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Star } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";

type WorkspaceCardData = {
  _id?: string;
  id?: string;
  title: string;
  city?: string;
  country?: string;
  address?: string;
  price?: number;
  pricePerHour?: number;
  rating?: number;
  amenities?: string[];
  images?: string[];
  host?: {
    superhost?: boolean;
  };
};

export function WorkspaceCard({
  ws,
  priority = false,
  onHover,
}: {
  ws: WorkspaceCardData;
  priority?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const [idx, setIdx] = useState(0);
  const { isAuthenticated } = useAuth();
  const { isSaved, toggle } = useWishlist();

  const images =
    ws.images && ws.images.length > 0
      ? ws.images
      : [
          "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1024&q=80",
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1024&q=80",
        ];

  const id = ws._id || ws.id || "";
  const price = ws.price ?? ws.pricePerHour ?? 0;
  const location = ws.address || [ws.city, ws.country].filter(Boolean).join(", ");
  const liked = isAuthenticated && id ? isSaved(id) : false;

  async function toggleSave(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!id) return;
    await toggle(id);
  }

  return (
    <Link
      to="/workspace/$id"
      params={{ id }}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      className="group block w-full min-w-0 max-w-full animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <article className="min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-card shadow-[var(--shadow-soft)] transition-colors duration-200 hover:border-border">
        {/* Compact marketplace image — consistent 4/3 ratio on all breakpoints */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <img
            src={images[idx]}
            alt={ws.title}
            loading={priority ? "eager" : "lazy"}
            width={1024}
            height={768}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(event) => {
                  event.preventDefault();
                  setIdx(i);
                }}
                className={`h-1 rounded-full transition-all ${
                  i === idx ? "w-4 bg-white" : "w-1 bg-white/70"
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={toggleSave}
            className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 touch-manipulation items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all hover:bg-black/45 active:scale-95"
            aria-label="Save to wishlist"
          >
            <Heart
              className={`h-[15px] w-[15px] transition-all ${liked ? "fill-rose-500 text-rose-500" : ""}`}
            />
          </button>
          {ws.host?.superhost && (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-surface/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground shadow-sm">
              Superhost
            </span>
          )}
        </div>

        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-5 text-foreground">
                {ws.title}
              </p>
              <p className="mt-1 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-primary-soft/60 px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
              <Star className="h-3 w-3 fill-clay text-clay" />
              <span>{ws.rating || "New"}</span>
            </div>
          </div>

          {ws.amenities && ws.amenities.length > 0 && (
            <p className="mt-1.5 truncate text-xs text-faint">
              {ws.amenities.slice(0, 4).join(" · ")}
            </p>
          )}

          <div className="mt-2.5 flex items-end justify-between border-t border-border pt-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="text-[15px] font-bold text-foreground">₹{price}</span>
              <span> / hour</span>
            </p>
            <span className="text-xs font-semibold text-primary-hover">View space</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
