"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Tournament Calculator" },
    { href: "/fb-ads", label: "FB Ads Dashboard" },
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
