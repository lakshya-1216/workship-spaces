import { Outlet, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";

import appCss from "../styles.css?url";
import logoUrl from "../assets/logo.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">We can't find that workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Workship — Book inspiring workspaces by the hour" },
      { name: "description", content: "Discover and book private studios, coworking lounges, meeting rooms and more. Built for focused humans." },
      { name: "author", content: "Workship" },
      { property: "og:title", content: "Workship — Book inspiring workspaces" },
      { property: "og:description", content: "Discover and book inspiring workspaces by the hour, day or week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", href: logoUrl },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat') || location.pathname.startsWith('/host-messages');

  return (
    <AuthProvider>
      <WishlistProvider>
      <div className={isChatPage ? "flex h-dvh flex-col overflow-hidden bg-background text-foreground" : "flex min-h-screen flex-col bg-background text-foreground"}>
        <Navbar />
        <main className={isChatPage ? "flex-1 overflow-hidden" : "flex-1"}>
          <Outlet />
        </main>
        {!isChatPage && <Footer />}
        <Toaster position="top-right" theme="system" richColors closeButton />
      </div>
      </WishlistProvider>
    </AuthProvider>
  );
}
