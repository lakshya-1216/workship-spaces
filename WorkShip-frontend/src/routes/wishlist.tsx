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
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Your wishlist</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${saved.length} workspace${saved.length !== 1 ? "s" : ""} saved for later.`}
            </p>
          </div>
          <Link to="/search" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            Browse more →
          </Link>
        </header>

        {isLoading ? (
          <div className="mt-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading your saved workspaces…</p>
          </div>
        ) : saved.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-surface p-10 text-center sm:p-16">
            <Heart className="mx-auto h-8 w-8 text-clay" />
            <p className="mt-4 font-display text-3xl italic">Nothing saved yet.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Tap the heart on any workspace and it will wait for you here.
            </p>
            <Link
              to="/search"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Explore workspaces
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-y-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-3">
            {saved.map((ws) => (
              <WorkspaceCard key={ws._id} ws={ws} />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
