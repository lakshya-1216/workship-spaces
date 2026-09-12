import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";

export const Route = createFileRoute("/auth/oauth/callback")({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hashParams.get("token");
    const rawUser = hashParams.get("user");
    const error = hashParams.get("error");
    const message = hashParams.get("message");

    if (error || !token || !rawUser) {
      toast.error(message || "Google sign-in failed. Please try again.");
      void navigate({ to: "/login", replace: true });
      return;
    }

    try {
      const user = JSON.parse(rawUser) as AuthUser;
      login(token, user);
      toast.success("Signed in with Google");
      void navigate({ to: "/", replace: true });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      void navigate({ to: "/login", replace: true });
    }
  }, [login, navigate]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 text-sm text-muted-foreground">
      Finishing sign-in...
    </div>
  );
}
