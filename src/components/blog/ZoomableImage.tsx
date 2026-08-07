"use client";

import { useState, useEffect, useRef } from "react";
import { Media } from "@once-ui-system/core";
import styles from "./ZoomableImage.module.scss";

interface ZoomableImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  marginBottom?: string;
  marginTop?: string;
  inline?: boolean;
  inlineStyles?: React.CSSProperties | string;
}

interface BlogImageSettings {
  darkThemeBackground: string;
  borderRadius: string;
  padding: string;
  boxShadow: string;
  hoverScale: number;
  margin: string;
  imageBackground: string;
  coverAspectRatio: string;
  coverWidth: string;
  inlineImageMaxHeight: string;
  inlineImageMaxWidth: string;
}

// Fetch blog image styling once per session (module-level cache)
let imageSettingsCache: Promise<BlogImageSettings | null> | null = null;
function getBlogImageSettings(): Promise<BlogImageSettings | null> {
  if (!imageSettingsCache) {
    imageSettingsCache = fetch("/api/admin/image-settings")
      .then((res) => (res.ok ? (res.json() as Promise<BlogImageSettings>) : null))
      .catch(() => null);
  }
  return imageSettingsCache;
}

/* ── Inline SVG icons (crisp, theme-colored — no emoji) ── */

function MagnifierIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ZoomableImage({
  src,
  alt,
  priority = false,
  sizes = "(min-width: 1024px) 800px, (min-width: 768px) 100vw, 100vw",
  marginBottom = "16",
  marginTop = "8",
  inline = false,
  inlineStyles,
}: ZoomableImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [imageSettings, setImageSettings] = useState<BlogImageSettings | null>(null);

  // Apply admin-configured image styling (theme-aware, defaults match current look)
  useEffect(() => {
    let cancelled = false;
    getBlogImageSettings().then((settings) => {
      if (!cancelled) setImageSettings(settings);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Parse inlineStyles if it's a string (from MDX)
  const parsedInlineStyles =
    typeof inlineStyles === "string"
      ? JSON.parse(inlineStyles)
      : (inlineStyles || {});

  // Handle keyboard navigation
  useEffect(() => {
    if (!isZoomed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsZoomed(false);
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
      if (e.key === "+") {
        e.preventDefault();
        setScale((s) => Math.min(s + 0.2, 3));
      }
      if (e.key === "-") {
        e.preventDefault();
        setScale((s) => Math.max(s - 0.2, 1));
      }
      if (e.key === "0") {
        e.preventDefault();
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomed]);

  // Lock body scroll while the lightbox is open (kills background-scroll glitch)
  useEffect(() => {
    if (!isZoomed) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isZoomed]);

  // Native non-passive wheel listener so preventDefault actually stops page scroll
  useEffect(() => {
    if (!isZoomed) return;
    const modal = modalRef.current;
    if (!modal) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.max(1, Math.min(s + delta, 3)));
    };

    modal.addEventListener("wheel", onWheel, { passive: false });
    return () => modal.removeEventListener("wheel", onWheel);
  }, [isZoomed]);

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (scale === 1) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPanning || !imageRef.current) return;
    const newX = e.clientX - panStart.x;
    const newY = e.clientY - panStart.y;
    setPan({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    if (scale === 1) return;
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (!isPanning || e.touches.length !== 1) return;
    const newX = e.touches[0].clientX - panStart.x;
    const newY = e.touches[0].clientY - panStart.y;
    setPan({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const resetZoom = () => {
    setIsZoomed(false);
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const containerStyle: React.CSSProperties = {
    marginTop: marginTop ? `${marginTop}px` : undefined,
    marginBottom: marginBottom ? `${marginBottom}px` : undefined,
    backgroundColor: "transparent",
    display: "block",
    width: "100%",
    ...parsedInlineStyles,
  };

  // Admin image-styling settings (only override when configured)
  if (imageSettings) {
    if (!parsedInlineStyles.padding) containerStyle.padding = imageSettings.padding;
    if (!parsedInlineStyles.borderRadius) containerStyle.borderRadius = imageSettings.borderRadius;
    if (!parsedInlineStyles.boxShadow) containerStyle.boxShadow = imageSettings.boxShadow;
    (containerStyle as Record<string, string>)["--img-bg-dark"] = imageSettings.darkThemeBackground;
    (containerStyle as Record<string, string>)["--img-hover-scale"] = String(imageSettings.hoverScale);
  }

  const imageStyle: React.CSSProperties = {
    maxWidth: "100%",
    height: "auto",
    borderRadius: imageSettings?.borderRadius || "8px",
    ...(imageSettings ? { backgroundColor: imageSettings.imageBackground } : {}),
    // Inline body images: cap height/width from admin settings and center when
    // the cap shrinks them (floated left/right aligned images keep their margins).
    ...(imageSettings && inline
      ? {
          display: "block",
          margin: "0 auto",
          maxHeight: imageSettings.inlineImageMaxHeight || "auto",
          maxWidth: imageSettings.inlineImageMaxWidth || "100%",
        }
      : {}),
    ...parsedInlineStyles,
  };

  return (
    <>
      <div style={containerStyle}>
        <button
          className={styles.imageContainer}
          onClick={() => setIsZoomed(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setIsZoomed(true);
            }
          }}
          type="button"
          aria-label={`Click to zoom image: ${alt}`}
          style={{
            cursor: "zoom-in",
            display: "block",
            width: "100%",
            backgroundColor: "transparent",
            border: "none",
            padding: "0",
            margin: "0",
            position: "relative",
          }}
        >
          {inline ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              style={imageStyle}
            />
          ) : (
            <Media
              src={src}
              alt={alt}
              priority={priority}
              sizes={sizes}
              border="neutral-alpha-medium"
              radius="m"
              enlarge
            />
          )}
          <span className={styles.zoomIcon}>
            <MagnifierIcon />
          </span>
        </button>
      </div>

      {isZoomed && (
        <div
          className={styles.backdrop}
          onClick={resetZoom}
          role="button"
          aria-label="Close image zoom"
        >
          <div
            ref={modalRef}
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              className={styles.zoomedImage}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                if (scale === 1) resetZoom();
              }}
              style={{
                transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
                cursor: scale > 1 ? (isPanning ? "grabbing" : "grab") : "pointer",
              }}
            />

            <button
              className={styles.closeButton}
              onClick={resetZoom}
              type="button"
              aria-label="Close zoomed image (Esc)"
              title="Close (Esc)"
            >
              <CloseIcon />
            </button>

            {scale > 1 && (
              <button
                className={styles.resetButton}
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                }}
                type="button"
                aria-label="Reset zoom (Press 0)"
                title="Reset zoom (0)"
              >
                <ResetIcon />
              </button>
            )}

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.zoomButton}
                onClick={() => setScale((s) => Math.max(1, s - 0.2))}
                title="Zoom out (−)"
                aria-label="Zoom out"
                disabled={scale <= 1}
              >
                −
              </button>
              <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
              <button
                type="button"
                className={styles.zoomButton}
                onClick={() => setScale((s) => Math.min(s + 0.2, 3))}
                title="Zoom in (+)"
                aria-label="Zoom in"
                disabled={scale >= 3}
              >
                +
              </button>
            </div>

            <div className={styles.hint}>
              {scale > 1 ? "Drag to pan · Scroll to zoom · 0 to reset" : "Click to close · Scroll to zoom"}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
