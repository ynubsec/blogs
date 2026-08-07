"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "../../AdminSidebar";
import { MarkdownEditor, type MarkdownEditorHandle } from "@/components/admin/MarkdownEditor";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ImageToolbar } from "@/components/admin/ImageToolbar";
import { sanitizeMdxContent } from "@/lib/mdxSanitize";

interface ProjectFormData {
  title: string;
  slug: string;
  date: string;
  summary: string;
  content: string;
  status: string;
  featured_image_url: string;
  images: string;
  technologies: string;
  live_url: string;
  github_url: string;
}

const empty: ProjectFormData = {
  title: "",
  slug: "",
  date: new Date().toISOString().split("T")[0],
  summary: "",
  content: "",
  status: "Draft",
  featured_image_url: "",
  images: "",
  technologies: "",
  live_url: "",
  github_url: "",
};

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function NewProject() {
  const [form, setForm] = useState<ProjectFormData>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const router = useRouter();

  useEffect(() => {
    if (!slugEdited && form.title) {
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
    }
  }, [form.title, slugEdited]);

  const set = (k: keyof ProjectFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (k === "slug") setSlugEdited(true);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const insertImage = (url: string) => {
    editorRef.current?.insertText(`\n![Image](${url})\n`);
  };

  const insertImageHtml = (html: string) => {
    editorRef.current?.insertText(`\n${html}`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        (document.getElementById("project-form") as HTMLFormElement | null)?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.content.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      content: sanitizeMdxContent(form.content),
      images: form.images
        ? form.images.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      technologies: form.technologies
        ? form.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    };

    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/admin/projects");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save.");
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">New Project</h1>
            <p className="admin-page-subtitle">Add a portfolio project</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin/projects" className="btn btn-ghost">
              ← Cancel
            </Link>
            <button form="project-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "💾 Save"}
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error">⚠ {error}</div>}

        <form id="project-form" onSubmit={handleSave} className="admin-form">
          <div className="admin-card">
            <div className="form-field">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={set("title")} required />
            </div>
          </div>

          <div className="admin-card">
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Slug</label>
                <input
                  className="form-input"
                  style={{ fontFamily: "monospace", fontSize: "12px" }}
                  value={form.slug}
                  onChange={set("slug")}
                />
                <span className="form-hint">URL: /work/{form.slug || "your-slug"}</span>
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set("status")}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: "16px" }}>
              <div className="form-field">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={set("date")} />
              </div>
              <div className="form-field">
                <label className="form-label">Technologies (comma-separated)</label>
                <input
                  className="form-input"
                  value={form.technologies}
                  onChange={set("technologies")}
                  placeholder="React, TypeScript, Supabase"
                />
              </div>
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                Featured Image URL
                <ImageUploader
                  onUploadSuccess={(url) => setForm((f) => ({ ...f, featured_image_url: url }))}
                />
              </label>
              <input
                className="form-input"
                value={form.featured_image_url}
                onChange={set("featured_image_url")}
              />
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label">Gallery Images (comma-separated URLs)</label>
              <input className="form-input" value={form.images} onChange={set("images")} />
            </div>

            <div className="form-row" style={{ marginTop: "16px" }}>
              <div className="form-field">
                <label className="form-label">Live URL</label>
                <input className="form-input" value={form.live_url} onChange={set("live_url")} />
              </div>
              <div className="form-field">
                <label className="form-label">GitHub URL</label>
                <input className="form-input" value={form.github_url} onChange={set("github_url")} />
              </div>
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label">Summary</label>
              <textarea className="form-textarea" value={form.summary} onChange={set("summary")} rows={3} />
            </div>
          </div>

          <div className="admin-card">
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Content (Markdown) *</span>
                <ImageUploader onUploadSuccess={insertImage} />
              </label>
              <ImageToolbar onInsertImage={insertImageHtml} />
              <MarkdownEditor
                ref={editorRef}
                value={form.content}
                onChange={(val) => setForm((f) => ({ ...f, content: val }))}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingBottom: "40px" }}>
            <Link href="/admin/projects" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "💾 Save Project"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
