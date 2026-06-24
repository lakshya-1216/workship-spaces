import { Link } from "@tanstack/react-router";
import logo from "../assets/logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-1.5 md:gap-2 ${className}`}>
      <img src={logo} alt="Workship" className="h-8 md:h-15 w-auto object-contain" />
      <span className="font-display text-lg md:text-xl font-bold tracking-tight">Workship</span>
    </Link>
  );
}
