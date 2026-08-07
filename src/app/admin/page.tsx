"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  LuSquarePen,
  LuVideo,
  LuTag,
  LuSettings,
  LuEye,
  LuTrash2,
} from "react-icons/lu";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminToast } from "@/lib/adminToast";

interface Writeup {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  created_at: string;
  date: string;
  summary: string;
  tags: string[];
}

type SortField = "title" | "slug" | "status" | "category" | "date";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

export default function AdminDashboard() {
  const [writeups, setWriteups] = useState<Writeup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Writeup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [projectsCount, setProjectsCount] = useState<number>(0);
  const [subscribersCount, setSubscribersCount] = useState<number>(0);
  const { addToast } = useAdminToast();

  useEffect(() => {
    fetchWriteups();
    fetchProjects();
    fetchSubscribers();
  }, []);

  const fetchWriteups = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/writeups");
    if (res.ok) setWriteups(await res.json());
    setLoading(false);
  };

  const fetchProjects = async () => {
    const res = await fetch("/api/admin/projects");
    if (res.ok) {
      const data = await res.json();
      setProjectsCount(data.length);
    }
  };

  const fetchSubscribers = async () => {
    const res = await fetch("/api/admin/subscribers");
    if (res.ok) {
      const data = await res.json();
      setSubscribersCount(data.length);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/writeups/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setWriteups((w) => w.filter((x) => x.id !== deleteTarget.id));
      addToast("success", `"${deleteTarget.title}" deleted successfully.`);
    } else {
      addToast("error", "Failed to delete. Try again.");
    }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      const res = await fetch(`/api/admin/writeups/${id}`, { method: "DELETE" });
      if (res.ok) ok++; else fail++;
    }
    if (ok > 0) {
      setWriteups((w) => w.filter((x) => !selectedIds.has(x.id)));
      addToast("success", `Deleted ${ok} writeup(s).`);
    }
    if (fail > 0) addToast("error", `Failed to delete ${fail} writeup(s).`);
    setSelectedIds(new Set());
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      const res = await fetch(`/api/admin/writeups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) ok++; else fail++;
    }
    if (ok > 0) {
      setWriteups((w) =>
        w.map((x) => (selectedIds.has(x.id) ? { ...x, status } : x)),
      );
      addToast("success", `Updated ${ok} writeup(s) to "${status}".`);
    }
    if (fail > 0) addToast("error", `Failed to update ${fail} writeup(s).`);
    setSelectedIds(new Set());
  };

  const sorted = useMemo(() => {
    let list = [...writeups];
    const cmp = (a: string | undefined, b: string | undefined) => {
      const va = a ?? "";
      const vb = b ?? "";
      return va.localeCompare(vb);
    };
    list.sort((a, b) => {
      let r = 0;
      switch (sortField) {
        case "title": r = cmp(a.title, b.title); break;
        case "slug": r = cmp(a.slug, b.slug); break;
        case "status": r = cmp(a.status, b.status); break;
        case "category": r = cmp(a.category, b.category); break;
        case "date": r = cmp(a.date || a.created_at, b.date || b.created_at); break;
      }
      return sortDir === "asc" ? r : -r;
    });
    return list;
  }, [writeups, sortField, sortDir]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === sorted.length && sorted.length > 0) return new Set();
      return new Set(sorted.map((w) => w.id));
    });
  }, [sorted]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const lowercaseSearch = search.toLowerCase();
  const filtered = useMemo(
    () =>
      sorted.filter((w) => {
        const matchSearch =
          w.title?.toLowerCase().includes(lowercaseSearch) ||
          w.slug?.toLowerCase().includes(lowercaseSearch);
        const matchFilter =
          filter === "all" ||
          (filter === "published" && w.status === "Published") ||
          (filter === "draft" && w.status !== "Published");
        return matchSearch && matchFilter;
      }),
    [sorted, lowercaseSearch, filter],
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  const gotoPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  const total = writeups.length;
  const published = writeups.filter((w) => w.status === "Published").length;
  const drafts = total - published;
  const last7 = writeups.filter((w) => {
    const d = new Date(w.date || w.created_at);
    return Date.now() - d.getTime() < 7 * 86400000;
  }).length;

  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Dashboard</h1>
            <p className="admin-page-subtitle">Manage your writeups and blog posts</p>
          </div>
          <Link href="/admin/writeups/new" className="btn btn-primary">
            + New Writeup
          </Link>
        </div>

        <div className="admin-quick-grid">
          <Link href="/admin/writeups/new" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuSquarePen size={20} />
            </span>
            <strong>New writeup</strong>
            <small>Blog post</small>
          </Link>
          <Link href="/admin/writeups/new?mode=video" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuVideo size={20} />
            </span>
            <strong>New video</strong>
            <small>Personal tab</small>
          </Link>
          <Link href="/admin/categories" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuTag size={20} />
            </span>
            <strong>Categories</strong>
            <small>Flow map nav</small>
          </Link>
          <Link href="/admin/settings" className="admin-quick-card">
            <span className="admin-quick-icon">
              <LuSettings size={20} />
            </span>
            <strong>Settings</strong>
            <small>Site config</small>
          </Link>
        </div>

        <div className="admin-stats-grid">
          <div className="admin-stat-card published">
            <div className="admin-stat-number">{published}</div>
            <div className="admin-stat-label">Published</div>
          </div>
          <div className="admin-stat-card draft">
            <div className="admin-stat-number">{drafts}</div>
            <div className="admin-stat-label">Drafts</div>
          </div>
          <div className="admin-stat-card projects-count">
            <div className="admin-stat-number">{projectsCount}</div>
            <div className="admin-stat-label">Projects</div>
          </div>
          <div className="admin-stat-card subscribers-count">
            <div className="admin-stat-number">{subscribersCount}</div>
            <div className="admin-stat-label">Subscribers</div>
          </div>
          <div className="admin-stat-card total">
            <div className="admin-stat-number">{total}</div>
            <div className="admin-stat-label">Total Posts</div>
          </div>
          <div className="admin-stat-card" style={{ "--accent": "#a78bfa" } as React.CSSProperties}>
            <div className="admin-stat-number">{last7}</div>
            <div className="admin-stat-label">Last 7 Days</div>
          </div>
        </div>

        <div className="admin-toolbar">
          <input
            className="admin-search-input"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); setSelectedIds(new Set()); }}
          />
          <select
            className="form-select"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); setSelectedIds(new Set()); }}
            style={{ width: "auto", minWidth: "120px" }}
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>

        <div className={`admin-bulk-bar ${selectedIds.size > 0 ? "visible" : ""}`}>
          <span>{selectedIds.size} selected</span>
          <button className="btn btn-secondary btn-sm" onClick={() => handleBulkStatus("Published")}>
            Publish all
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleBulkStatus("Draft")}>
            Draft all
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
            Delete all
          </button>
        </div>

        {loading ? (
          <div className="admin-table-wrap">
            <div style={{ padding: "16px 0" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-row">
                  <div className="skeleton" />
                  <div className="skeleton" />
                  <div className="skeleton" style={{ width: "60%" }} />
                  <div className="skeleton" style={{ width: "40%" }} />
                  <div className="skeleton" style={{ width: "50%" }} />
                  <div className="skeleton" style={{ width: "30%" }} />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <h3>No writeups found</h3>
            <p>{search ? "Try a different search term." : "Start by creating your first writeup."}</p>
            {!search && (
              <Link href="/admin/writeups/new" className="btn btn-primary">
                + Create First Post
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="checkbox-col">
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={selectedIds.size === sorted.length && sorted.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th onClick={() => handleSort("title")}>
                      Title <SortIcon field="title" />
                    </th>
                    <th onClick={() => handleSort("slug")}>
                      Slug <SortIcon field="slug" />
                    </th>
                    <th onClick={() => handleSort("status")}>
                      Status <SortIcon field="status" />
                    </th>
                    <th onClick={() => handleSort("category")}>
                      Category <SortIcon field="category" />
                    </th>
                    <th onClick={() => handleSort("date")}>
                      Date <SortIcon field="date" />
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={selectedIds.has(w.id)}
                          onChange={() => toggleSelect(w.id)}
                        />
                      </td>
                      <td>
                        <div className="text-truncate">
                          {w.title || <span className="text-muted">(no title)</span>}
                        </div>
                      </td>
                      <td>
                        <span className="text-muted text-small" style={{ fontFamily: "monospace" }}>
                          {w.slug}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${w.status === "Published" ? "badge-published" : "badge-draft"}`}
                        >
                          {w.status || "Draft"}
                        </span>
                      </td>
                      <td>
                        <span className="text-muted text-small">{w.category || "—"}</span>
                      </td>
                      <td>
                        <span className="text-muted text-small">{fmt(w.date || w.created_at)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
                          <Link
                            href={`/blogs/${w.slug}`}
                            target="_blank"
                            className="btn btn-ghost btn-sm btn-icon"
                            title="View post"
                          >
                            <LuEye size={14} />
                          </Link>
                          <Link
                            href={`/admin/writeups/${w.id}/edit`}
                            className="btn btn-ghost btn-sm"
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteTarget(w)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-pagination">
              <div className="admin-pagination-info">
                Showing {filtered.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </div>
              <div className="admin-pagination-btns">
                <button
                  className="admin-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => gotoPage(currentPage - 1)}
                >
                  ‹ Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) {
                    page = i + 1;
                  } else if (currentPage <= 4) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    page = totalPages - 6 + i;
                  } else {
                    page = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={page}
                      className={`admin-page-btn ${page === currentPage ? "active" : ""}`}
                      onClick={() => gotoPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  className="admin-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => gotoPage(currentPage + 1)}
                >
                  Next ›
                </button>
              </div>
            </div>
          </>
        )}

        {deleteTarget && (
          <div className="admin-modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="admin-modal-title">
                <LuTrash2 size={18} /> Delete Writeup
              </h3>
              <p>
                Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
                This action cannot be undone.
              </p>
              <div className="admin-modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
