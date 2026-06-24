/**
 * useRecentlyViewed
 *
 * Tracks the last N workspace IDs the user has visited.
 * Data is persisted to localStorage so it survives page refreshes.
 *
 * Usage:
 *   const { recentIds, trackView } = useRecentlyViewed();
 *   // In workspace detail page: trackView(ws._id)
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "workship_recently_viewed";
const MAX_IDS = 20;

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>(() => readIds());

  // Keep state in sync if another tab modifies localStorage
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setRecentIds(readIds());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const trackView = useCallback((id: string) => {
    if (!id) return;
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((v) => v !== id)].slice(0, MAX_IDS);
      writeIds(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentIds([]);
  }, []);

  return { recentIds, trackView, clearHistory };
}
