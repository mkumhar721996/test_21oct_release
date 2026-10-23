"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { UserSummary } from "@/components/auth/user-summary";

const NAV = [
  { id: "home", label: "Home", href: "/" },
  { id: "defects", label: "Defects", href: "/defects" },
  { id: "reports", label: "Reports", href: "/reports" },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="container shell-bar">
          <Link className="shell-brand" href="/">
            Web App
          </Link>
          <button
            className="btn btn-secondary btn-icon shell-toggle"
            type="button"
            aria-controls="main-nav"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            &#9776;
          </button>
          <nav className={`shell-nav${open ? " is-open" : ""}`} id="main-nav" aria-label="Main">
            <ul>
              {NAV.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    data-nav-key={item.id}
                    aria-current={isActive(item.href, pathname) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <UserSummary />
        </div>
      </header>
      <main className="shell-main">
        <div className="container">{children}</div>
      </main>
      <footer className="shell-footer">
        <div className="container">Web App</div>
      </footer>
    </div>
  );
}
