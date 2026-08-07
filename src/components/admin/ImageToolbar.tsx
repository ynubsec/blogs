"use client";

import { useState } from "react";
import styles from "./ImageToolbar.module.scss";

interface ImageToolbarProps {
  onInsertImage: (html: string) => void;
}

type Alignment = "left" | "center" | "right" | "full";

export function ImageToolbar({ onInsertImage }: ImageToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [alignment, setAlignment] = useState<Alignment>("center");
  const [width, setWidth] = useState("100%");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  const resetForm = () => {
    setImageUrl("");
    setAltText("");
    setAlignment("center");
    setWidth("100%");
    setPreview(null);
    setError("");
    setIsOpen(false);
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    if (url) {
      setPreview(url);
      setError("");
    }
  };

  const generateHtml = () => {
    if (!imageUrl.trim()) {
      setError("Image URL is required");
      return;
    }

    const alt = altText || "Image";
    let html = "";

    // Generate simple img tag - will auto-convert to ZoomableImage via rehype transform
    if (alignment === "center") {
      html = `<img src="${imageUrl}" alt="${alt}" align="center" width="${width}" />\n`;
    } else if (alignment === "left") {
      html = `<img src="${imageUrl}" alt="${alt}" align="left" width="${width}" />\n`;
    } else if (alignment === "right") {
      html = `<img src="${imageUrl}" alt="${alt}" align="right" width="${width}" />\n`;
    } else {
      html = `<img src="${imageUrl}" alt="${alt}" width="${width}" />\n`;
    }

    onInsertImage(html);
    resetForm();
  };

  return (
    <>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.insertButton}
          onClick={() => setIsOpen(true)}
          title="Insert image from URL"
        >
          🖼️ Insert Image
        </button>
      </div>

      {isOpen && (
        <div 
          className={styles.modalOverlay} 
          onClick={resetForm} 
          onKeyDown={(e) => {
            if (e.key === "Escape") resetForm();
          }}
          role="presentation"
        >
          <div 
            className={styles.modal} 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >  <div className={styles.modalHeader}>
              <h3>Insert Image</h3>              <p style={{ fontSize: "12px", color: "var(--text-muted, #98989f)", margin: "4px 0 0 0" }}>Images become clickable & zoomable automatically</p>              <button
                type="button"
                className={styles.closeBtn}
                onClick={resetForm}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="image-url">Image URL *</label>
                <input
                  id="image-url"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="alt-text">Alt Text</label>
                <input
                  id="alt-text"
                  type="text"
                  placeholder="Describe the image"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="alignment">Alignment</label>
                  <select
                    id="alignment"
                    value={alignment}
                    onChange={(e) => setAlignment(e.target.value as Alignment)}
                    className={styles.select}
                  >
                    <option value="center">Center</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="full">Full Width</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="width">Width</label>
                  <input
                    id="width"
                    type="text"
                    placeholder="e.g., 100%, 80%, 600px"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.widthPresets}>
                <button
                  type="button"
                  onClick={() => setWidth("100%")}
                  className={styles.preset}
                >
                  Full (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setWidth("80%")}
                  className={styles.preset}
                >
                  Large (80%)
                </button>
                <button
                  type="button"
                  onClick={() => setWidth("60%")}
                  className={styles.preset}
                >
                  Medium (60%)
                </button>
                <button
                  type="button"
                  onClick={() => setWidth("50%")}
                  className={styles.preset}
                >
                  Half (50%)
                </button>
              </div>

              {preview && (
                <div className={styles.preview}>
                  <p>Preview:</p>
                  <div className={styles.previewBox}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Preview" />
                  </div>
                </div>
              )}

              {error && <div className={styles.error}>{error}</div>}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={resetForm}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.insertBtn}
                onClick={generateHtml}
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
