import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Loader2 } from "lucide-react";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useWishlist } from "@/contexts/WishlistContext";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — Workship" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items, isLoading } = useWishlist();

  // items are the populated workspace objects returned by GET /auth/wishlist
  const saved = items as Array<{
    _id: string;
    title: string;
    city?: string;
    country?: string;
    address?: string;
    price?: number;
    pricePerHour?: number;
    rating?: number;
    amenities?: string[];
    images?: string[];
    host?: { superhost?: boolean };
  }>;

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Your wishlist</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${saved.length} workspace${saved.length !== 1 ? "s" : ""} saved for later.`}
            </p>
          </div>
          <Link to="/search" className="text-sm font-semibold text-primary-hover hover:underline">
            Browse more →
          </Link>
        </header>

        {isLoading ? (
          <div className="mt-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading your saved workspaces…</p>
          </div>
        ) : saved.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border p-16 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-display text-xl font-bold">Nothing saved yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap the ♥ on any workspace to save it here.
            </p>
            <Link
              to="/search"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Explore workspaces
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((ws) => (
              <WorkspaceCard key={ws._id} ws={ws} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
