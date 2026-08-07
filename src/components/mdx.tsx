import { MDXRemote, MDXRemoteProps } from "next-mdx-remote/rsc";
import React, { ReactNode } from "react";
import { slugify as transliterate } from "transliteration";
import { MermaidWrapper } from "./MermaidWrapper";
import { MdxCodeBlock } from "./MdxCodeBlock";
import { DiagramSVG } from "./DiagramSVG";
import { ZoomableImage } from "./blog/ZoomableImage";
import remarkGfm from "remark-gfm";
import { remarkMermaid } from "@/lib/remarkMermaid";
import rehypeRaw from "rehype-raw";
import type { Pluggable } from "unified";
import { parseStyleString, rehypeParseInlineStyle } from "@/lib/rehypeParseInlineStyle";
import { remarkParseInlineStyle } from "@/lib/remarkParseInlineStyle";
import { visit } from "unist-util-visit";
import type { Root, Element } from "hast";
import { sanitizeMdxContent } from "@/lib/mdxSanitize";

const rehypeRawWithMdx: Pluggable = [
  rehypeRaw,
  {
    passThrough: [
      "mdxjsEsm",
      "mdxFlowExpression",
      "mdxTextExpression",
      "mdxJsxFlowElement",
      "mdxJsxTextElement",
    ],
  },
];

// Rehype plugin to normalize table structure and fix deprecated HTML attributes
function rehypeFixTablesAndAttributes() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      // Fix deprecated HTML attributes
      if (node.properties) {
        // Convert cellpadding to cellPadding
        if ("cellpadding" in node.properties) {
          node.properties.cellPadding = node.properties.cellpadding;
          delete node.properties.cellpadding;
        }
        // Convert cellspacing to cellSpacing
        if ("cellspacing" in node.properties) {
          node.properties.cellSpacing = node.properties.cellspacing;
          delete node.properties.cellspacing;
        }
        // Remove bgcolor attribute (deprecated, use CSS instead)
        if ("bgcolor" in node.properties) {
          delete node.properties.bgcolor;
        }
      }

      // Fix table structure: wrap direct <tr> children in <tbody>
      if (node.tagName === "table" && node.children) {
        const newChildren: any[] = [];
        let tbodyBuffer: any[] = [];

        for (const child of node.children) {
          if (child.type === "element" && (child.tagName === "thead" || child.tagName === "tbody" || child.tagName === "tfoot")) {
            // If we have buffered <tr> elements, wrap them in tbody first
            if (tbodyBuffer.length > 0) {
              newChildren.push({
                type: "element",
                tagName: "tbody",
                properties: {},
                children: tbodyBuffer,
              });
              tbodyBuffer = [];
            }
            newChildren.push(child);
          } else if (child.type === "element" && child.tagName === "tr") {
            // Buffer <tr> elements to wrap in tbody
            tbodyBuffer.push(child);
          } else if (child.type !== "text" || (child.value && child.value.trim())) {
            // Keep other meaningful children
            newChildren.push(child);
          }
        }

        // Flush remaining buffered <tr> elements
        if (tbodyBuffer.length > 0) {
          newChildren.push({
            type: "element",
            tagName: "tbody",
            properties: {},
            children: tbodyBuffer,
          });
        }

        node.children = newChildren;
      }
    });
  };
}

// Rehype plugin to handle pos=clickable attribute for making divs/elements clickable/zoomable
function rehypeHandleClickableElements() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index: number | undefined, parent: any) => {
      // Check for pos="clickable" or pos=clickable attribute
      if (node.properties && ("pos" in node.properties) && node.properties.pos === "clickable" && index !== undefined && parent) {
        // Find the first img inside this div
        let imgNode: Element | undefined;
        const findImg = (node: any): Element | undefined => {
          if (node.type === "element" && node.tagName === "img") {
            return node;
          }
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
              const found = findImg(child);
              if (found) return found;
            }
          }
          return undefined;
        };

        imgNode = findImg(node);

        if (imgNode) {
          const src = String(imgNode.properties?.src || "");
          const alt = String(imgNode.properties?.alt || "");

          if (src) {
            // Replace the entire clickable div with ZoomableImage component
            parent.children[index] = {
              type: "mdxJsxFlowElement",
              name: "ZoomableImage",
              attributes: [
                { type: "mdxJsxAttribute", name: "src", value: src } as any,
                { type: "mdxJsxAttribute", name: "alt", value: alt } as any,
                { type: "mdxJsxAttribute", name: "sizes", value: "(max-width: 960px) 100vw, 960px" } as any,
                { type: "mdxJsxExpressionAttribute", name: "inline", value: "true" } as any,
              ],
              children: [],
            };
          }
        }
      }
    });
  };
}

// Read an attribute from an MDX JSX element (mdxJsxFlowElement / mdxJsxTextElement)
function getMdxAttr(node: any, name: string): unknown {
  const attr = (node.attributes || []).find(
    (a: any) => a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!attr) return undefined;
  return attr.value && attr.value.type === "mdxJsxAttributeValueExpression"
    ? attr.value.value
    : attr.value;
}

// Build a ZoomableImage JSX node from an img node (hast element OR MDX JSX element).
// Returns null when there is no usable src.
function imgNodeToZoomable(node: any) {
  const isElement = node.type === "element";
  const src = isElement
    ? String(node.properties?.src || "")
    : String(getMdxAttr(node, "src") || "");
  if (!src) return null;

  const alt = isElement
    ? String(node.properties?.alt || "")
    : String(getMdxAttr(node, "alt") || "");
  const width = isElement ? node.properties?.width : getMdxAttr(node, "width");
  const align = isElement ? node.properties?.align : getMdxAttr(node, "align");
  const style = isElement ? node.properties?.style : getMdxAttr(node, "style");
  // MDX expression styles (e.g. style={{...}}) are left alone — only plain CSS strings are parsed
  const styleIsExpression =
    !isElement &&
    (node.attributes || []).some(
      (a: any) =>
        a.type === "mdxJsxAttribute" &&
        a.name === "style" &&
        a.value?.type === "mdxJsxAttributeValueExpression",
    );

  const inlineStyles: Record<string, string | number> = {};
  if (typeof style === "string" && !styleIsExpression) {
    const parsed = parseStyleString(style) ?? {};
    Object.assign(inlineStyles, parsed);
  }

  // Handle alignment
  if (align === "left" || align === "right") {
    inlineStyles.float = align;
    inlineStyles.margin = align === "left" ? "0 1rem 1rem 0" : "0 0 1rem 1rem";
  } else if (align === "center") {
    // Center alignment: use display and margin
    inlineStyles.display = "block";
    inlineStyles.margin = "0 auto";
  }

  // Apply width
  if (width) {
    inlineStyles.width = typeof width === "number" ? `${width}px` : String(width);
  }

  // Keep text elements inline (e.g. <img> inside a paragraph) so MDX still compiles
  const isText = node.type === "mdxJsxTextElement";
  return {
    type: isText ? "mdxJsxTextElement" : "mdxJsxFlowElement",
    name: "ZoomableImage",
    attributes: [
      { type: "mdxJsxAttribute", name: "src", value: src } as any,
      { type: "mdxJsxAttribute", name: "alt", value: alt } as any,
      { type: "mdxJsxAttribute", name: "sizes", value: "(max-width: 960px) 100vw, 960px" } as any,
      { type: "mdxJsxExpressionAttribute", name: "inline", value: "true" } as any,
      { type: "mdxJsxExpressionAttribute", name: "inlineStyles", value: JSON.stringify(inlineStyles) } as any,
    ],
    children: [],
  };
}

// Rehype plugin to transform all img elements into ZoomableImage components.
// Handles BOTH hast <img> elements (markdown images) AND MDX JSX img elements
// (raw HTML <img> tags — MDX v3 parses those natively, so they arrive as
// mdxJsxFlowElement/mdxJsxTextElement nodes and bypass the hast path).
function rehypeTransformImagesToZoomable() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index: number | undefined, parent: any) => {
      if (node.tagName === "img" && index !== undefined && parent) {
        const replacement = imgNodeToZoomable(node);
        if (replacement) parent.children[index] = replacement;
      }
    });

    visit(tree, (node: any, index: number | undefined, parent: any) => {
      if (
        node &&
        (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
        node.name === "img" &&
        index !== undefined &&
        parent
      ) {
        const replacement = imgNodeToZoomable(node);
        if (replacement) parent.children[index] = replacement;
      }
    });
  };
}

function withParsedStyle<T extends { style?: unknown }>(props: T) {
  const { style, ...rest } = props;
  return { ...rest, style: parseStyleString(style) as React.CSSProperties | undefined };
}

function createHtmlElement(tag: "span" | "div") {
  return (props: React.HTMLAttributes<HTMLElement> & { style?: unknown }) => {
    return React.createElement(tag, withParsedStyle(props));
  };
}

/**
 * Preprocess markdown to fix common issues:
 * 1. Ensure fenced code blocks start on a new line (Markdown requires this).
 * 2. Escape curly braces inside code fences so MDX doesn't evaluate them as JSX expressions.
 * 3. Remove any HTML comments which MDX cannot parse.
 * 4. Self-close unclosed HTML void elements (e.g. <img ...> → <img ... />) so MDX can parse them.
 * 5. Convert SVG hyphenated attributes to camelCase (e.g., stroke-width → strokeWidth)
 */
function preprocessMarkdown(content: string): string {
  let processed = content.replace(/([^\n])(\n?```[a-z]*\n)/gi, "$1\n\n$2");

  processed = processed.replace(/```([^\n]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    // Mermaid uses { } in node syntax — do not MDX-escape those blocks
    if (lang.trim().toLowerCase() === "mermaid") return match;
    const escapedCode = code
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}");
    return match.replace(code, escapedCode);
  });

  // Remove HTML comments + self-close unclosed HTML void elements so MDX can parse them.
  processed = sanitizeMdxContent(processed);

  // Convert SVG hyphenated attributes to camelCase for React compatibility
  // This handles attributes like stroke-width, text-anchor, dominant-baseline, etc.
  const svgAttrMap: Record<string, string> = {
    "stroke-width": "strokeWidth",
    "stroke-dasharray": "strokeDasharray",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-miterlimit": "strokeMiterlimit",
    "stroke-opacity": "strokeOpacity",
    "fill-opacity": "fillOpacity",
    "fill-rule": "fillRule",
    "clip-path": "clipPath",
    "clip-rule": "clipRule",
    "font-family": "fontFamily",
    "font-size": "fontSize",
    "font-size-adjust": "fontSizeAdjust",
    "font-style": "fontStyle",
    "font-variant": "fontVariant",
    "font-weight": "fontWeight",
    "text-anchor": "textAnchor",
    "text-decoration": "textDecoration",
    "text-rendering": "textRendering",
    "dominant-baseline": "dominantBaseline",
    "alignment-baseline": "alignmentBaseline",
    "baseline-shift": "baselineShift",
    "glyph-orientation-horizontal": "glyphOrientationHorizontal",
    "glyph-orientation-vertical": "glyphOrientationVertical",
    "marker-start": "markerStart",
    "marker-mid": "markerMid",
    "marker-end": "markerEnd",
    "marker-width": "markerWidth",
    "marker-height": "markerHeight",
    "marker-ref-x": "markerRefX",
    "marker-ref-y": "markerRefY",
    "ref-x": "refX",
    "ref-y": "refY",
    "color-interpolation": "colorInterpolation",
    "color-rendering": "colorRendering",
    "image-rendering": "imageRendering",
    "shape-rendering": "shapeRendering",
    "paint-order": "paintOrder",
    "vector-effect": "vectorEffect",
  };

  // Replace hyphenated SVG attributes with camelCase in both opening and closing tags
  for (const [hyphenated, camelCase] of Object.entries(svgAttrMap)) {
    const regex = new RegExp(`\\b${hyphenated}=`, "gi");
    processed = processed.replace(regex, `${camelCase}=`);
  }

  return processed;
}

import {
  Heading,
  HeadingLink,
  Text,
  InlineCode,
  CodeBlock,
  TextProps,
  MediaProps,
  Accordion,
  AccordionGroup,
  Table,
  Feedback,
  Button,
  Card,
  Grid,
  Row,
  Column,
  Icon,
  Media,
  SmartLink,
  List,
  ListItem,
  Line,
} from "@once-ui-system/core";

type CustomLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

function CustomLink({ href, children, style, ...props }: CustomLinkProps & { style?: unknown }) {
  const safeStyle = parseStyleString(style);
  if (href.startsWith("/")) {
    return (
      <SmartLink href={href} style={safeStyle} {...props}>
        {children}
      </SmartLink>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} style={safeStyle} {...props}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={safeStyle} {...props}>
      {children}
    </a>
  );
}

function createImage(props: MediaProps & { src?: string; style?: unknown; align?: string; width?: string | number }) {
  const { alt, src, style, align, width, ...mediaProps } = props;

  if (!src) {
    console.error("Media requires a valid 'src' property.");
    return null;
  }

  // Build inline styles for any image with styling/alignment/width
  const inlineStyles: React.CSSProperties = {};
  const parsed = parseStyleString(style) ?? {};
  
  // Apply any existing parsed styles
  Object.assign(inlineStyles, parsed);

  // Apply alignment
  if (align === "left" || align === "right") {
    inlineStyles.float = align;
    inlineStyles.margin = align === "left" ? "0 1rem 1rem 0" : "0 0 1rem 1rem";
  }

  // Apply width
  if (width) {
    inlineStyles.width = typeof width === "number" ? `${width}px` : String(width);
  }

  // If image has any styling/alignment/width, use inline mode
  const hasInlineStyles = Object.keys(inlineStyles).length > 0;

  return (
    <ZoomableImage
      src={src}
      alt={alt || ""}
      sizes="(max-width: 960px) 100vw, 960px"
      inline={hasInlineStyles}
      inlineStyles={inlineStyles}
    />
  );
}

function extractText(node: any): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return node.toString();
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && node.props && node.props.children) return extractText(node.props.children);
  return "";
}

function slugify(str: string): string {
  if (!str) return "";
  const strWithAnd = str.replace(/&/g, " and "); // Replace & with 'and'
  return transliterate(strWithAnd, {
    lowercase: true,
    separator: "-", // Replace spaces with -
  }).replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

function createHeading(as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  const CustomHeading = ({
    children,
    ...props
  }: Omit<React.ComponentProps<typeof HeadingLink>, "as" | "id">) => {
    const text = extractText(children);
    const slug = slugify(text);
    return (
      <HeadingLink marginTop="24" marginBottom="12" as={as} id={slug} {...props}>
        {children}
      </HeadingLink>
    );
  };

  CustomHeading.displayName = `${as}`;

  return CustomHeading;
}

function createParagraph({ children }: TextProps) {
  return (
    <Text
      style={{ lineHeight: "175%", wordBreak: "break-word", overflowWrap: "anywhere" }}
      variant="body-default-m"
      onBackground="neutral-medium"
      marginTop="8"
      marginBottom="12"
    >
      {children}
    </Text>
  );
}

function createTable(props: any) {
  return (
    <div className="glass-container">
      <table className="glass-table" {...props} />
    </div>
  );
}

function createTableHeader(props: any) {
  return <th {...props} />;
}

function createTableCell(props: any) {
  return <td {...props} />;
}

function createInlineCode({ children }: { children: ReactNode }) {
  return <InlineCode>{children}</InlineCode>;
}

function createCodeBlock(props: any) {
  // For pre tags that contain code blocks
  if (props.children && props.children.props && props.children.props.className) {
    const { className, children } = props.children.props;

    // Extract language from className (format: language-xxx)
    const language = className.replace("language-", "");

    // remarkMermaid handles ```mermaid (primary)
    if (language === "mermaid") return null;

    const label = language.charAt(0).toUpperCase() + language.slice(1);

    return (
      <MdxCodeBlock
        marginTop="8"
        marginBottom="16"
        codes={[
          {
            code: children,
            language,
            label,
          },
        ]}
        copyButton={true}
      />
    );
  }

  // Fallback for other pre tags or empty code blocks
  return <pre {...props} />;
}

function createList(as: "ul" | "ol") {
  return ({ children }: { children: ReactNode }) => <List as={as}>{children}</List>;
}

function createListItem({ children }: { children: ReactNode }) {
  return (
    <ListItem marginTop="4" marginBottom="8" style={{ lineHeight: "175%" }}>
      {children}
    </ListItem>
  );
}

function createHR() {
  return (
    <Row fillWidth horizontal="center">
      <Line maxWidth="40" />
    </Row>
  );
}

const components = {
  p: createParagraph as any,
  h1: createHeading("h1") as any,
  h2: createHeading("h2") as any,
  h3: createHeading("h3") as any,
  h4: createHeading("h4") as any,
  h5: createHeading("h5") as any,
  h6: createHeading("h6") as any,
  img: createImage as any,
  span: createHtmlElement("span") as any,
  div: createHtmlElement("div") as any,
  a: CustomLink as any,
  code: createInlineCode as any,
  pre: createCodeBlock as any,
  ol: createList("ol") as any,
  ul: createList("ul") as any,
  li: createListItem as any,
  hr: createHR as any,
  table: createTable as any,
  th: createTableHeader as any,
  td: createTableCell as any,
  Heading,
  Text,
  CodeBlock,
  InlineCode,
  Accordion,
  AccordionGroup,
  Table,
  Feedback,
  Button,
  Card,
  Grid,
  Row,
  Column,
  Icon,
  Media,
  SmartLink,
  MermaidChart: MermaidWrapper,
  DiagramSVG,
  ZoomableImage,
};

type CustomMDXProps = MDXRemoteProps & {
  components?: typeof components;
};

export function CustomMDX(props: CustomMDXProps) {
  const source = typeof props.source === "string"
    ? preprocessMarkdown(props.source)
    : props.source;

  return (
    <>
      <MDXRemote
        {...props}
        source={source}
        options={{
          ...props.options,
          mdxOptions: {
            ...props.options?.mdxOptions,
            remarkPlugins: [
              ...(props.options?.mdxOptions?.remarkPlugins || []),
              remarkGfm,
              remarkMermaid,
              remarkParseInlineStyle,
            ],
            rehypePlugins: [
              ...(props.options?.mdxOptions?.rehypePlugins || []),
              rehypeRawWithMdx,
              rehypeFixTablesAndAttributes,
              rehypeHandleClickableElements,
              rehypeParseInlineStyle,
              rehypeTransformImagesToZoomable,
            ],
          },
        }}
        components={{ ...components, ...(props.components || {}) }}
      />
    </>
  );
}