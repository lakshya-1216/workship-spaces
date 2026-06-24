import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Wait for localStorage hydration to finish before making any redirect decision.
  // Without this guard, the initial null token would instantly send logged-in users
  // to the login page on every page refresh.
  if (isLoading) {
    return null; // or a spinner — keeps the page blank for one frame while reading localStorage
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
