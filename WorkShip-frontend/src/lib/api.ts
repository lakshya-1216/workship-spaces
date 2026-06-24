export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

export function apiUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Drop-in replacement for fetch() that:
 *  - Prepends the API base URL automatically (just pass a path like "/workspaces")
 *  - Intercepts HTTP 401 responses and fires a "workship:session-expired" window
 *    event so AuthContext can log the user out and show a toast from one central place.
 *
 * Usage:
 *   const res = await apiFetch("/workspaces", { headers: { Authorization: `Bearer ${token}` } });
 */
export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = apiUrl(path);
  const res = await fetch(url, init);

  if (res.status === 401) {
    // Clone response so the caller can still read the body if they need to,
    // while we simultaneously dispatch the session-expired event.
    let message = "Unauthorized";
    try {
      const clone = res.clone();
      const body = (await clone.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      // body parse failed — use default message
    }

    window.dispatchEvent(
      new CustomEvent("workship:session-expired", { detail: { message } }),
    );
  }

  return res;
}
