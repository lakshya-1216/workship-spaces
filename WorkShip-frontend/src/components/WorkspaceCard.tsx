import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
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
      className="group block animate-fade-in-up"
    >
      <div className="relative overflow-hidden rounded-3xl bg-muted shadow-[var(--shadow-soft)] aspect-[4/3]">
        <img
          src={images[idx]}
          alt={ws.title}
          loading={priority ? "eager" : "lazy"}
          width={1024}
          height={768}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.preventDefault();
                setIdx(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60"
              }`}
              aria-label={`Image ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={toggleSave}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:scale-110"
          aria-label="Save to wishlist"
        >
          <Heart className={`h-4 w-4 transition-all ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
        {ws.host?.superhost && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground shadow-sm">
            Superhost
          </span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{ws.title}</p>
          <p className="truncate text-sm text-muted-foreground">{location}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">₹{price}</span>
            <span className="text-muted-foreground"> /hour</span>
          </p>
          {ws.amenities && ws.amenities.length > 0 && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {ws.amenities.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Star className="h-3.5 w-3.5 fill-foreground" />
          <span className="font-medium">{ws.rating || "New"}</span>
        </div>
      </div>
    </Link>
  );
}
