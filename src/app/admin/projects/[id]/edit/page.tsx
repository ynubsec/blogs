"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminSidebar } from "../../../AdminSidebar";
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
  date: "",
  summary: "",
  content: "",
  status: "Draft",
  featured_image_url: "",
  images: "",
  technologies: "",
  live_url: "",
  github_url: "",
};

export default function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [form, setForm] = useState<ProjectFormData>(empty);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/admin/projects/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setForm({
            title: data.title || "",
            slug: data.slug || "",
            date: data.date || "",
            summary: data.summary || "",
            content: data.content || "",
            status: data.status || "Draft",
            featured_image_url: data.featured_image_url || "",
            images: Array.isArray(data.images) ? data.images.join(", ") : "",
            technologies: Array.isArray(data.technologies) ? data.technologies.join(", ") : "",
            live_url: data.live_url || "",
            github_url: data.github_url || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const set = (k: keyof ProjectFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
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

    const res = await fetch(`/api/admin/projects/${id}`, {
      method: "PATCH",
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

  if (loading) {
    return (
      <div className="admin-shell">
        <AdminSidebar />
        <main className="admin-main">
          <p style={{ color: "#64748b" }}>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Edit Project</h1>
          </div>
          <button form="project-form" type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
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
                <input className="form-input" value={form.slug} onChange={set("slug")} />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={set("status")}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
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
              <label className="form-label">Summary</label>
              <textarea className="form-textarea" value={form.summary} onChange={set("summary")} rows={3} />
            </div>
          </div>

          <div className="admin-card">
            <div className="form-field">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Content *</span>
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
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
