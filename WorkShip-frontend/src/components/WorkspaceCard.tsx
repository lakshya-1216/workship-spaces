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
      className="group block animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <article className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[var(--shadow-soft)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-[var(--shadow-card)]">
        <div className="relative aspect-[5/4] overflow-hidden bg-muted">
          <img
            src={images[idx]}
            alt={ws.title}
            loading={priority ? "eager" : "lazy"}
            width={1024}
            height={768}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(event) => {
                  event.preventDefault();
                  setIdx(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-white" : "w-1.5 bg-white/70"
                }`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={toggleSave}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all hover:bg-black/45"
            aria-label="Save to wishlist"
          >
            <Heart className={`h-4 w-4 transition-all ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
          {ws.host?.superhost && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-900 shadow-sm">
              Superhost
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-5 text-foreground">{ws.title}</p>
              <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{ws.rating || "New"}</span>
            </div>
          </div>

          {ws.amenities && ws.amenities.length > 0 && (
            <div className="mt-3 flex min-h-6 flex-wrap gap-1.5 overflow-hidden">
              {ws.amenities.slice(0, 3).map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-secondary px-2 py-1 text-[10.5px] font-medium text-muted-foreground"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">
              <span className="text-base font-bold text-foreground">₹{price}</span>
              <span> / hour</span>
            </p>
            <span className="text-xs font-semibold text-primary-hover">View space</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
