"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LuLayoutDashboard,
  LuFileText,
  LuVideo,
  LuTag,
  LuBriefcase,
  LuImage,
  LuSlidersHorizontal,
  LuMail,
  LuSettings,
  LuTrash2,
  LuExternalLink,
  LuLogOut,
  LuMenu,
  LuX,
} from "react-icons/lu";
import type { IconType } from "react-icons/lib";

const CONTENT_LINKS: { href: string; label: string; icon: IconType; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: LuLayoutDashboard, exact: true },
  { href: "/admin/writeups", label: "Writeups", icon: LuFileText },
  { href: "/admin/videos", label: "Videos", icon: LuVideo },
  { href: "/admin/categories", label: "Categories", icon: LuTag },
  { href: "/admin/projects", label: "Projects", icon: LuBriefcase },
];

const SITE_LINKS: { href: string; label: string; icon: IconType }[] = [
  { href: "/admin/gallery", label: "Gallery", icon: LuImage },
  { href: "/admin/image-settings", label: "Image Styling", icon: LuSlidersHorizontal },
  { href: "/admin/subscribers", label: "Subscribers", icon: LuMail },
  { href: "/admin/settings", label: "Settings", icon: LuSettings },
  { href: "/admin/trash", label: "Trash", icon: LuTrash2 },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <button
        className="admin-hamburger"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <LuX size={18} /> : <LuMenu size={18} />}
      </button>

      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={closeSidebar}
      />

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-logo">
          <span className="admin-logo-badge">Y</span>
          <div className="admin-logo-text">
            <h2>YNUBSEC</h2>
            <p>Admin Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-section">Content</p>
          {CONTENT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              className={isActive(pathname, link.href, link.exact) ? "active" : ""}
            >
              <span className="admin-nav-icon">
                <link.icon size={16} />
              </span>
              <span className="admin-nav-label">{link.label}</span>
            </Link>
          ))}

          <p className="admin-nav-section">Site</p>
          {SITE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeSidebar}
              className={isActive(pathname, link.href) ? "active" : ""}
            >
              <span className="admin-nav-icon">
                <link.icon size={16} />
              </span>
              <span className="admin-nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/blogs" target="_blank" rel="noreferrer" className="admin-view-site">
            <LuExternalLink size={15} />
            <span className="admin-nav-label">View site</span>
          </Link>
          <button type="button" className="admin-logout-btn" onClick={handleLogout}>
            <LuLogOut size={15} />
            <span className="admin-nav-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
