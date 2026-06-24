import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { apiUrl } from "@/lib/api";

interface WishlistContextType {
  /** Set of workspace _id strings currently in the wishlist */
  wishlistIds: Set<string>;
  /** Returns true if the workspace is in the wishlist */
  isSaved: (id: string) => boolean;
  /** Toggle a workspace in/out of wishlist; returns new saved state */
  toggle: (id: string) => Promise<boolean>;
  /** Full workspace objects (populated) from the last GET /auth/wishlist */
  items: unknown[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/wishlist"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: Array<{ _id: string }> = await res.json();
      setItems(data);
      setWishlistIds(new Set(data.map((ws) => ws._id)));
    } catch {
      // Silently ignore network errors for wishlist refresh
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load wishlist whenever the user logs in
  useEffect(() => {
    if (isAuthenticated && token) {
      refresh();
    } else {
      // Clear when logged out
      setWishlistIds(new Set());
      setItems([]);
    }
  }, [isAuthenticated, token, refresh]);

  const isSaved = useCallback((id: string) => wishlistIds.has(id), [wishlistIds]);

  const toggle = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) {
        toast.error("Please log in to save workspaces");
        return false;
      }

      // Optimistic update
      const wasSaved = wishlistIds.has(id);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });

      try {
        const res = await fetch(apiUrl(`/auth/wishlist/${id}`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not update wishlist");

        // Sync with server truth
        setWishlistIds(new Set((data.wishlist as Array<{ _id: string }>).map((ws) => ws._id)));
        setItems(data.wishlist);
        toast.success(data.saved ? "Saved to wishlist ❤️" : "Removed from wishlist");
        return data.saved as boolean;
      } catch (err) {
        // Rollback optimistic update
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(id);
          else next.delete(id);
          return next;
        });
        toast.error(err instanceof Error ? err.message : "Could not update wishlist");
        return wasSaved;
      }
    },
    [token, wishlistIds],
  );

  return (
    <WishlistContext.Provider value={{ wishlistIds, isSaved, toggle, items, isLoading, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
