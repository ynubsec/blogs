"use client";

import dynamic from "next/dynamic";
import "easymde/dist/easymde.min.css";
import {
  Component,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type SimpleMDE from "easymde";

const SimpleMdeReact = dynamic(() => import("react-simplemde-editor"), { ssr: false });

export interface MarkdownEditorHandle {
  insertText: (text: string) => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Never let a preview parsing hiccup (e.g. exotic MDX) blank the whole editor. */
class PreviewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Clear the error state once the content changes so a transient hiccup
  // (e.g. pasted malformed HTML) doesn't disable the preview for the session.
  componentDidUpdate(prevProps: { children: ReactNode }) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="preview-pane preview-error">
          Preview isn&apos;t available for this content (it may contain custom components). Save
          and open the post on the site to see it rendered.
        </div>
      );
    }
    return this.props.children;
  }
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, placeholder }, ref) {
    const mdeRef = useRef<SimpleMDE | null>(null);
    const [view, setView] = useState<"write" | "preview">("write");

    // Debounced copy of the value so the preview doesn't re-render per keystroke
    const [preview, setPreview] = useState(value);
    useEffect(() => {
      const t = window.setTimeout(() => setPreview(value), 200);
      return () => window.clearTimeout(t);
    }, [value]);

    useImperativeHandle(ref, () => ({
      insertText(text: string) {
        const cm = mdeRef.current?.codemirror;
        if (cm) {
          cm.replaceSelection(text);
          onChange(cm.getValue());
        } else {
          onChange(value + text);
        }
      },
    }));

    const options = useMemo(() => {
      return {
        spellChecker: false,
        placeholder: placeholder || "# Write your content here...",
        status: false,
        toolbar: [
          "bold", "italic", "heading", "|",
          "quote", "unordered-list", "ordered-list", "|",
          "link", "image", "code", "table", "horizontal-rule", "|",
          {
            name: "image-left",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                '<img src="YOUR_IMAGE_URL" align="left" width="50%" alt="description" />',
              );
            },
            className: "fa fa-align-left",
            title: "Insert Left-Aligned Image",
          },
          {
            name: "image-center",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                '<div align="center">\n  <img src="YOUR_IMAGE_URL" width="80%" alt="description" />\n</div>\n',
              );
            },
            className: "fa fa-align-center",
            title: "Insert Centered Image",
          },
          {
            name: "image-right",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                '<img src="YOUR_IMAGE_URL" align="right" width="50%" alt="description" />',
              );
            },
            className: "fa fa-align-right",
            title: "Insert Right-Aligned Image",
          },
          "|",
          {
            name: "flowchart",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                "```mermaid\nflowchart LR\n    A[Start] --> B{Decision?}\n    B -->|Yes| C[Result 1]\n    B -->|No| D[Result 2]\n```\n",
              );
            },
            className: "fa fa-sitemap",
            title: "Insert Flowchart (Mermaid)",
          },
          "|",
          "fullscreen",
          "|",
          "guide",
        ] as const,
        uploadImage: true,
        imageUploadFunction: async (
          file: File,
          onSuccess: (url: string) => void,
          onError: (error: string) => void,
        ) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/upload", {
              method: "POST",
              body: formData,
              credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.url) {
              onSuccess(data.url);
            } else {
              onError(data.error || "Upload failed");
            }
          } catch (e: unknown) {
            onError(e instanceof Error ? e.message : "Upload failed");
          }
        },
      };
    }, [placeholder]);

    return (
      <div className="live-editor">
        <div className="live-editor-bar">
          <span className="live-editor-title">Edit source</span>
          <div className="live-editor-tabs">
            <button
              type="button"
              className={`live-editor-tab ${view === "write" ? "active" : ""}`}
              onClick={() => setView("write")}
            >
              Edit
            </button>
            <button
              type="button"
              className={`live-editor-tab ${view === "preview" ? "active" : ""}`}
              onClick={() => setView("preview")}
            >
              Show preview
            </button>
          </div>
        </div>

        <div className="live-editor-body">
          <div className="markdown-editor-wrapper">
            <SimpleMdeReact
              value={value}
              onChange={onChange}
              options={options}
              getMdeInstance={(instance) => {
                mdeRef.current = instance;
              }}
            />
          </div>
        </div>

        {view === "preview" && (
          <div className="preview-pane-wrap">
            <PreviewErrorBoundary>
              <div className="preview-pane">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {preview}
                </ReactMarkdown>
              </div>
            </PreviewErrorBoundary>
          </div>
        )}
      </div>
    );
  },
);
