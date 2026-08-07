"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "../../../AdminSidebar";
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
  date: "",
  summary: "",
  content: "",
  status: "Draft",
  featured_image_url: "",
  video_url: "",
  tags: "",
};

export default function EditWriteup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<WriteupFormData>(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const router = useRouter();

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
        (document.getElementById("edit-form") as HTMLFormElement | null)?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/writeups/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          category: data.category || "",
          date: data.date || new Date(data.created_at).toISOString().split("T")[0],
          summary: data.summary || "",
          content: data.content || "",
          status: data.status || "Draft",
          featured_image_url: data.featured_image_url || data.image_url || "",
          video_url: data.video_url || "",
          tags: Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || ""),
        });
        setLoading(false);
      })
      .catch(() => { setError("Failed to load writeup."); setLoading(false); });
  }, [id]);

  const set = (k: keyof WriteupFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => f ? { ...f, [k]: e.target.value } : f);

  const isVideoMode = Boolean(form.video_url?.trim());

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!isVideoMode && !form.content.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      content: sanitizeMdxContent(form.content),
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const res = await fetch(`/api/admin/writeups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setSuccess("Saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save.");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Loading writeup...</p>
      </main>
    </div>
  );

  if (!form) return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-alert admin-alert-error">⚠ {error || "Writeup not found."}</div>
        <Link href="/admin" className="btn btn-ghost">← Back to Dashboard</Link>
      </main>
    </div>
  );

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">{isVideoMode ? "Edit Video" : "Edit Writeup"}</h1>
            <p className="admin-page-subtitle" style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {form.slug}
              {isVideoMode ? " · Personal → Videos" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href={`/blogs/${form.slug}`} target="_blank" className="btn btn-ghost">
              👁 Preview
            </Link>
            <Link href={isVideoMode ? "/admin/videos" : "/admin"} className="btn btn-ghost">
              ← {isVideoMode ? "Videos" : "Dashboard"}
            </Link>
            <button form="edit-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error">⚠ {error}</div>}
        {success && <div className="admin-alert admin-alert-success">✓ {success}</div>}

        <form id="edit-form" onSubmit={handleSave} className="admin-form">
          {/* Title */}
          <div className="admin-card">
            <div className="form-field">
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                style={{ fontSize: "18px", fontWeight: 600 }}
                value={form.title}
                onChange={set("title")}
                placeholder="Writeup title..."
                required
              />
            </div>
          </div>

          {/* Meta */}
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
                <span className="form-hint">URL: /blogs/{form.slug}</span>
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
                onChange={(category) => setForm((f) => (f ? { ...f, category } : f))}
              />
              <div className="form-field">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={form.date} onChange={set("date")} />
              </div>
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-input" value={form.tags} onChange={set("tags")}
                placeholder="ctf, web, xss" />
            </div>

            <div className="form-field" style={{ marginTop: "16px" }}>
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                Featured Image URL
                <ImageUploader onUploadSuccess={(url) => setForm((f) => ({ ...f, featured_image_url: url }))} />
              </label>
              <input className="form-input" value={form.featured_image_url} onChange={set("featured_image_url")} 
                placeholder="https://... (or upload an image above)" />
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
                placeholder="https://youtube.com/watch?v=..."
              />
              {isVideoMode && (
                <span className="form-hint">
                  With category Personal, this appears on the Videos tab.
                </span>
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
                    ? "Shown on the video card and preview panel..."
                    : "Short description shown in blog list..."
                }
                rows={3}
              />
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
                    ? "## Notes, timestamps, links..."
                    : "# Your writeup content here..."
                }
              />
              <span className="form-hint">
                {isVideoMode
                  ? "Optional. Appears in the video preview panel and on the full post page."
                  : "Supports Markdown. Use Upload Image to insert at the cursor, or drag an image into the editor toolbar."}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingBottom: "40px" }}>
            <Link href="/admin" className="btn btn-ghost">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
