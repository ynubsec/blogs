"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "../../AdminSidebar";
import { MarkdownEditor, type MarkdownEditorHandle } from "@/components/admin/MarkdownEditor";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { CategoryField } from "@/components/admin/CategoryField";
import { ImageToolbar } from "@/components/admin/ImageToolbar";
import { sanitizeMdxContent } from "@/lib/mdxSanitize";

interface WriteupFormData {
  title: string;
  slug: string;
  category: string;
  date: string;
  summary: string;
  content: string;
  status: string;
  featured_image_url: string;
  video_url: string;
  tags: string;
}

const empty: WriteupFormData = {
  title: "",
  slug: "",
  category: "",
  date: new Date().toISOString().split("T")[0],
  summary: "",
  content: "",
  status: "Draft",
  featured_image_url: "",
  video_url: "",
  tags: "",
};

function toSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function NewWriteupForm() {
  const searchParams = useSearchParams();
  const isVideoMode = searchParams.get("mode") === "video";

  const [form, setForm] = useState<WriteupFormData>({
    ...empty,
    category: isVideoMode ? "Personal" : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        (document.getElementById("writeup-form") as HTMLFormElement | null)?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const insertImage = (url: string) => {
    editorRef.current?.insertText(`\n![Image](${url})\n`);
  };

  const insertImageHtml = (html: string) => {
    editorRef.current?.insertText(`\n${html}`);
  };

  useEffect(() => {
    if (!slugEdited && form.title) {
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
    }
  }, [form.title, slugEdited]);

  const set = (k: keyof WriteupFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (k === "slug") setSlugEdited(true);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!isVideoMode && !form.content.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    if (isVideoMode && !form.video_url.trim()) {
      setError("Video URL is required for personal videos.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      content: sanitizeMdxContent(form.content),
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const res = await fetch("/api/admin/writeups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push(isVideoMode ? "/admin/videos" : "/admin");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{isVideoMode ? "New Video" : "New Writeup"}</h1>
            <p className="admin-page-subtitle">
              {isVideoMode
                ? "Creates a Personal post with a video — shows under Personal → Videos"
                : "Create a new blog post / writeup"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href={isVideoMode ? "/admin/videos" : "/admin"} className="btn btn-ghost">← Cancel</Link>
            <button
              form="writeup-form"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "💾 Publish"}
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error">⚠ {error}</div>}

        <form id="writeup-form" onSubmit={handleSave} className="admin-form">
          {/* Title */}
          <div className="admin-card">
            <div className="form-field">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                style={{ fontSize: "18px", fontWeight: 600 }}
                value={form.title}
                onChange={set("title")}
                placeholder="Enter writeup title..."
                required
              />
            </div>
          </div>

          {/* Meta row */}
          <div className="admin-card">
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Slug</label>
                <input
                  className="form-input"
                  style={{ fontFamily: "monospace", fontSize: "12px" }}
                  value={form.slug}
                  onChange={set("slug")}
                  placeholder="auto-generated-from-title"
                />
                <span className="form-hint">URL: /blogs/{form.slug || "your-slug"}</span>
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
              <CategoryField
                value={form.category}
                onChange={(category) => setForm((f) => ({ ...f, category }))}
              />
              <div className="form-field">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={set("date")}
                />
              </div>
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="form-input"
                value={form.tags}
                onChange={set("tags")}
                placeholder="ctf, web, xss, reverse-engineering"
              />
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                Featured Image URL
                <ImageUploader onUploadSuccess={(url) => setForm((f) => ({ ...f, featured_image_url: url }))} />
              </label>
              <input
                className="form-input"
                value={form.featured_image_url}
                onChange={set("featured_image_url")}
                placeholder="https://... (or upload an image above)"
              />
              {form.featured_image_url && (
                <div style={{ marginTop: "8px", borderRadius: "8px", overflow: "hidden", maxWidth: "200px" }}>
                  <img src={form.featured_image_url} alt="Preview" style={{ width: "100%", height: "auto" }} />
                </div>
              )}
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label">
                Video URL (YouTube / Vimeo){isVideoMode ? " *" : " — optional"}
              </label>
              <input
                className="form-input"
                value={form.video_url || ""}
                onChange={set("video_url")}
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                required={isVideoMode}
              />
              {isVideoMode && (
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                  Category is set to Personal so this appears on the Videos tab.
                </p>
              )}
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label">
                {isVideoMode ? "Short description" : "Summary / Excerpt"}
              </label>
              <textarea
                className="form-textarea"
                value={form.summary}
                onChange={set("summary")}
                placeholder={
                  isVideoMode
                    ? "Shown on the video card and preview panel (optional but recommended)..."
                    : "A short description shown in the blog list..."
                }
                rows={3}
              />
              {isVideoMode && (
                <span className="form-hint">
                  One or two sentences for the gallery hover card and preview sidebar.
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="admin-card">
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  {isVideoMode ? "Video notes & text (Markdown, optional)" : "Content (Markdown) *"}
                </span>
                <ImageUploader onUploadSuccess={insertImage} />
              </label>
              <ImageToolbar onInsertImage={insertImageHtml} />
              <MarkdownEditor
                ref={editorRef}
                value={form.content}
                onChange={(val) => setForm((f) => ({ ...f, content: val }))}
                placeholder={
                  isVideoMode
                    ? "## What this video covers\n\n- Timestamps\n- Links\n- Extra context..."
                    : "# Your writeup content here..."
                }
              />
              <span className="form-hint">
                {isVideoMode
                  ? "Optional. Shown in the video preview panel and on the full post page. Supports Markdown, images, and links."
                  : "Supports Markdown. Use Upload Image to insert at the cursor, or drag an image into the editor toolbar."}
              </span>
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingBottom: "40px" }}>
            <Link href={isVideoMode ? "/admin/videos" : "/admin"} className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : isVideoMode ? "💾 Save Video" : "💾 Save Writeup"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewWriteupPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-shell">
          <AdminSidebar />
          <main className="admin-main">
            <p style={{ color: "#64748b" }}>Loading…</p>
          </main>
        </div>
      }
    >
      <NewWriteupForm />
    </Suspense>
  );
}
