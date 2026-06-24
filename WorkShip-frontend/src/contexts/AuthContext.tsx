import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  isHost?: boolean;
  role?: "user" | "host";
};

interface AuthContextType {
  token: string | null;
  hostToken: string | null;
  user: AuthUser | null;
  login: (token: string, user?: AuthUser) => void;
  loginHost: (token: string) => void;
  logout: () => void;
  logoutHost: () => void;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  isHostLoggedIn: boolean;
  /** true while we're still reading from localStorage — don't redirect until this is false */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Must be kept in sync with API_BASE in src/lib/api.ts
const API_BASE =
  (import.meta as Record<string, unknown> & { env?: Record<string, string> }).env
    ?.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:5000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  // Starts true so ProtectedRoute waits before redirecting
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Guard against multiple concurrent 401s all triggering the logout flow
  const sessionExpiredHandled = useRef(false);

  useEffect(() => {
    // Hydrate auth state from localStorage on first mount,
    // then validate the token against the live server.
    const storedToken = localStorage.getItem("token");
    const storedHostToken = localStorage.getItem("hostToken");
    const storedUser = localStorage.getItem("user");

    async function hydrateAndValidate() {
      if (storedToken) {
        // Validate the stored token is still accepted by the current server
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            // Token is valid — hydrate state normally
            const freshUser = (await res.json()) as AuthUser;
            setToken(storedToken);
            setUser(freshUser);
            localStorage.setItem("user", JSON.stringify(freshUser));
          } else {
            // Token is stale/expired — clear everything so user re-logs in
            console.warn("[Auth] Stored token rejected by server (HTTP", res.status, ") — clearing auth state");
            localStorage.removeItem("token");
            localStorage.removeItem("hostToken");
            localStorage.removeItem("user");
          }
        } catch {
          // Network error — server may be down; keep token in state so app doesn't boot-loop
          // but still try to hydrate from localStorage as a fallback
          setToken(storedToken);
          if (storedUser) {
            try { setUser(JSON.parse(storedUser)); } catch { /* ignore */ }
          }
        }
      }

      if (storedHostToken) {
        setHostToken(storedHostToken);
      }

      // Mark hydration complete — only now can ProtectedRoute decide to redirect
      setIsLoading(false);
    }

    hydrateAndValidate();
  }, []);

  // ── Global session-expiry handler ─────────────────────────────────────────
  // apiFetch (src/lib/api.ts) fires this custom event on any HTTP 401.
  // We listen here so a single place handles logout + redirect for the
  // entire app, regardless of which component made the failing request.
  useEffect(() => {
    function handleSessionExpired(event: Event) {
      // Deduplicate: if we've already handled a 401 in this session, ignore
      if (sessionExpiredHandled.current) return;
      sessionExpiredHandled.current = true;

      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const isExpiry =
        !detail?.message ||
        detail.message.toLowerCase().includes("expired") ||
        detail.message.toLowerCase().includes("unauthorized");

      if (!isExpiry) return;

      // Clear all auth state and storage
      localStorage.removeItem("token");
      localStorage.removeItem("hostToken");
      localStorage.removeItem("user");
      setToken(null);
      setHostToken(null);
      setUser(null);

      toast.error("Your session has expired. Please log in again.", {
        id: "session-expired", // prevent duplicate toasts
        duration: 5000,
      });

      void navigate({ to: "/login" });
    }

    window.addEventListener("workship:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("workship:session-expired", handleSessionExpired);
    };
  }, [navigate]);

  const login = useCallback((newToken: string, nextUser?: AuthUser) => {
    // Reset the deduplication guard on fresh login
    sessionExpiredHandled.current = false;

    localStorage.setItem("token", newToken);
    localStorage.removeItem("hostToken");
    setToken(newToken);
    setHostToken(null);

    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
      setUser(nextUser);
    }
  }, []);

  const loginHost = useCallback((newHostToken: string) => {
    localStorage.setItem("hostToken", newHostToken);
    setHostToken(newHostToken);
  }, []);

  const logoutHost = useCallback(() => {
    localStorage.removeItem("hostToken");
    setHostToken(null);
  }, []);

  const logout = useCallback(() => {
    sessionExpiredHandled.current = false;
    localStorage.removeItem("token");
    localStorage.removeItem("hostToken");
    localStorage.removeItem("user");
    setToken(null);
    setHostToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser: AuthUser | null) => {
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    } else {
      localStorage.removeItem("user");
    }

    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        hostToken,
        user,
        login,
        loginHost,
        logout,
        logoutHost,
        setUser: updateUser,
        isAuthenticated: !!token,
        isHostLoggedIn: !!hostToken,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
