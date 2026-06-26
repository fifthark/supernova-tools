"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();

  // The public player board (/tournament-lite/board/<token> and /live/<token>) is
  // read-only and must not surface admin tools or navigation. The admin login
  // page is a focused gate and also hides the nav.
  if (
    pathname?.startsWith("/tournament-lite/board") ||
    pathname?.startsWith("/live") ||
    pathname === "/tournaments/login"
  ) {
    return null;
  }

  const links = [
    { href: "/", label: "Tournament Calculator" },
    { href: "/fb-ads", label: "FB Ads Dashboard" },
    { href: "/scheduler", label: "Scheduler" },
    { href: "/court-sheets", label: "Court Sheets" },
    { href: "/tournament-lite", label: "Tournament Lite" },
  ];

  return (
    <nav className="nav-bar">
      <span className="nav-brand">SuperNova Tools</span>
      <div className="nav-links">
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? "nav-link-active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
