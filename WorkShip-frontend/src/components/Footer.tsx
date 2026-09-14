import { Link } from "@tanstack/react-router";
import { Github, Instagram, Twitter } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#29332b] bg-[#29332b] text-[#f4f1e9]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-4 md:px-6">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-[#dce2d4]/80">
            Workship is the easiest way to discover and book inspiring places to work — by the hour, day or week.
          </p>
          <div className="mt-6 flex gap-2">
            {[Twitter, Instagram, Github].map((Icon, i) => (
              <a key={i} href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#dce2d4]/25 text-[#dce2d4] transition-colors hover:border-[#7c8b72] hover:text-white">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#f4f1e9]">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm text-[#dce2d4]/80">
            <li><Link to="/search" className="hover:text-[#f4f1e9]">Workspaces</Link></li>
            <li><Link to="/search" className="hover:text-[#f4f1e9]">Map view</Link></li>
            <li><Link to="/host" className="hover:text-[#f4f1e9]">Become a host</Link></li>
            <li><Link to="/dashboard" className="hover:text-[#f4f1e9]">My bookings</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#f4f1e9]">Company</h4>
          <ul className="mt-4 space-y-2 text-sm text-[#dce2d4]/80">
            <li><a className="hover:text-[#f4f1e9]" href="#">About</a></li>
            <li><a className="hover:text-[#f4f1e9]" href="#">Contact</a></li>
            <li><a className="hover:text-[#f4f1e9]" href="#">Privacy</a></li>
            <li><a className="hover:text-[#f4f1e9]" href="#">Terms</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#dce2d4]/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-[#dce2d4]/60 md:flex-row md:px-6">
          <p>© {new Date().getFullYear()} Workship. Designed for future enthusiasts.</p>
        </div>
      </div>
    </footer>
  );
}
