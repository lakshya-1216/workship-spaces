import { Link } from "@tanstack/react-router";
import { Github, Instagram, Twitter } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Workship is the easiest way to discover and book inspiring places to work — by the hour, day or week.
          </p>
          <div className="mt-6 flex gap-2">
            {[Twitter, Instagram, Github].map((Icon, i) => (
              <a key={i} href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-hover">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/search" className="hover:text-foreground">Workspaces</Link></li>
            <li><Link to="/search" className="hover:text-foreground">Map view</Link></li>
            <li><Link to="/host" className="hover:text-foreground">Become a host</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground">My bookings</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a className="hover:text-foreground" href="#">About</a></li>
            <li><a className="hover:text-foreground" href="#">Contact</a></li>
            <li><a className="hover:text-foreground" href="#">Privacy</a></li>
            <li><a className="hover:text-foreground" href="#">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row md:px-6">
          <p>© {new Date().getFullYear()} Workship. Designed for future enthusiasts.</p>
        </div>
      </div>
    </footer>
  );
}
