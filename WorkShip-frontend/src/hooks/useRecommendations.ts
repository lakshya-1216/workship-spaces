/**
 * useRecommendations
 *
 * Fetches personalised workspace recommendations from the backend.
 * Sends the user's recently-viewed IDs (from localStorage) so the engine
 * can factor them into the preference profile even without a login.
 *
 * When the user is authenticated the backend also weighs in their
 * wishlist and booking history automatically.
 *
 * The hook re-fetches whenever `recentIds` or `token` changes, ensuring
 * the section updates dynamically as the user interacts with the platform.
 */

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

export type RecommendedWorkspace = {
  _id: string;
  title: string;
  city?: string;
  address?: string;
  price?: number;
  category?: string;
  amenities?: string[];
  images?: string[];
  rating?: number;
  numReviews?: number;
};

type RecommendationsResult = {
  recommendations: RecommendedWorkspace[];
  personalised: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useRecommendations({
  recentIds,
  token,
  limit = 4,
}: {
  recentIds: string[];
  token: string | null;
  limit?: number;
}): RecommendationsResult {
  const [recommendations, setRecommendations] = useState<RecommendedWorkspace[]>([]);
  const [personalised, setPersonalised] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (recentIds.length > 0) {
          params.set("recentIds", recentIds.slice(0, 20).join(","));
        }

        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(apiUrl(`/workspaces/recommendations?${params}`), { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json() as { recommendations: RecommendedWorkspace[]; personalised: boolean };
        if (!cancelled) {
          setRecommendations(data.recommendations || []);
          setPersonalised(data.personalised ?? false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load recommendations");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecommendations();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, limit, tick, recentIds.join(",")]);

  return { recommendations, personalised, loading, error, refresh };
}
