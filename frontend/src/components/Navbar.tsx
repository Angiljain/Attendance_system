"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useEffect } from "react";

export default function Navbar() {
  const { user, logout, loadFromStorage } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  const links = isAdmin
    ? [
        { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
        { href: "/admin/sessions", label: "Sessions", icon: "📋" },
      ]
    : [
        { href: "/student/scan", label: "Scan QR", icon: "📷" },
        { href: "/student/history", label: "History", icon: "📜" },
        { href: "/student/badges", label: "Badges", icon: "🏆" },
      ];

  return (
    <nav className="navbar">
      <div className="nav-brand">📍 Proof of Presence</div>

      <div className="nav-links">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${pathname === link.href ? "active" : ""}`}
          >
            {link.icon} {link.label}
          </Link>
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginLeft: "12px",
            paddingLeft: "12px",
            borderLeft: "1px solid var(--border-color)",
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            {user.name}
            <span className={`badge ${isAdmin ? "badge-warning" : "badge-info"}`} style={{ marginLeft: "8px" }}>
              {user.role}
            </span>
          </span>
          <button
            className="btn-secondary"
            onClick={handleLogout}
            style={{ padding: "6px 14px", fontSize: "0.8rem" }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
