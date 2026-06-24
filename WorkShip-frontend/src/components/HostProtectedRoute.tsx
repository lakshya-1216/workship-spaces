import { Navigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function HostProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isHostLoggedIn, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isHostLoggedIn) {
    return <Navigate to="/host" replace />;
  }

  return <>{children}</>;
}
