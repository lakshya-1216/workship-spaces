import { Link } from "@tanstack/react-router";
import logo from "../assets/logo.png";

export function Logo({
  className = "",
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label="Workship home"
      className={`flex items-center gap-1.5 md:gap-2 ${className}`}
    >
      <img src={logo} alt="Workship" className="h-8 md:h-15 w-auto object-contain" />
      {showWordmark && (
        <span className="font-display text-[22px] leading-none md:text-2xl">Workship</span>
      )}
    </Link>
  );
}
