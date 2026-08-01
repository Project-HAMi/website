import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";

const MARKDOWN_IMAGE_SCOPE =
  ".theme-doc-markdown, .theme-blog-markdown, article.markdown, .markdown";

const BLOCKED_SCOPE =
  ".no-lightbox, .avatar, .table-of-contents, .pagination-nav, .navbar, .footer";

const MERMAID_CONTAINER = ".docusaurus-mermaid-container";

function isImageHref(href = "") {
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i.test(href);
}

function shouldOpenLightbox(image) {
  if (!(image instanceof HTMLImageElement)) {
    return false;
  }

  if (!image.closest(MARKDOWN_IMAGE_SCOPE)) {
    return false;
  }

  if (image.closest(BLOCKED_SCOPE)) {
    return false;
  }

  return Boolean(image.currentSrc || image.src);
}

function sanitizeSvgIds(clone) {
  const uniqueSuffix = `-lb-${Math.random().toString(36).substring(2, 8)}`;
  const allElements = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const idMap = new Map();

  allElements.forEach((el) => {
    const oldId = el.getAttribute("id");
    if (oldId) {
      const newId = `${oldId}${uniqueSuffix}`;
      idMap.set(oldId, newId);
      el.setAttribute("id", newId);
    }
  });

  if (idMap.size > 0) {
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        let val = attr.value;
        let changed = false;

        idMap.forEach((newId, oldId) => {
          if (val.includes(`#${oldId}`)) {
            val = val.replace(new RegExp(`#${oldId}\\b`, "g"), `#${newId}`);
            changed = true;
          }

          if (attr.name === "aria-labelledby" || attr.name === "aria-describedby") {
            const tokens = val.split(/\s+/);
            if (tokens.includes(oldId)) {
              val = tokens.map((t) => (t === oldId ? newId : t)).join(" ");
              changed = true;
            }
          }
        });

        if (changed) {
          el.setAttribute(attr.name, val);
        }
      });
    });
  }

  return clone;
}

function getImageCaption(image) {
  const figureCaption = image.closest("figure")?.querySelector("figcaption")?.textContent;

  return (
    figureCaption ||
    image.getAttribute("aria-label") ||
    image.getAttribute("title") ||
    image.getAttribute("alt") ||
    ""
  );
}

const EMPTY_STATE = { open: false, mode: null, src: "", alt: "", caption: "", svg: null };

/**
 * Declarative React Portal lightbox. A single instance is mounted by the
 * root Layout so there is exactly one owner of the global click listener,
 * DOM node, and focus lifecycle - no cross-component reference counting.
 */
export default function ImageLightbox() {
  const [state, setState] = useState(EMPTY_STATE);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const svgHostRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const close = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const handleImageClick = useCallback((event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const mermaidContainer = target.closest(MERMAID_CONTAINER);
    if (
      mermaidContainer &&
      mermaidContainer.closest(MARKDOWN_IMAGE_SCOPE) &&
      !mermaidContainer.closest(BLOCKED_SCOPE)
    ) {
      const svg = mermaidContainer.querySelector("svg");
      if (svg) {
        const figure = mermaidContainer.closest("figure.mermaid-figure");
        const captionText = figure?.querySelector("figcaption")?.textContent || "";
        lastFocusedRef.current = document.activeElement;
        setState({
          open: true,
          mode: "svg",
          src: "",
          alt: "",
          caption: captionText,
          svg: sanitizeSvgIds(svg.cloneNode(true)),
        });
        return;
      }
    }

    const image = target instanceof HTMLImageElement ? target : target.closest("img");
    if (!shouldOpenLightbox(image)) {
      return;
    }

    const parentLink = image.closest("a");
    if (parentLink) {
      const href = parentLink.getAttribute("href") || "";
      const sameAsImage =
        href === image.currentSrc || href === image.src || href === image.getAttribute("src");
      if (!sameAsImage && !isImageHref(href)) {
        return;
      }
      event.preventDefault();
    }

    const caption = getImageCaption(image);
    lastFocusedRef.current = document.activeElement;
    setState({
      open: true,
      mode: "image",
      src: image.currentSrc || image.src,
      alt: image.alt || caption,
      caption,
      svg: null,
    });
  }, []);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return undefined;
    }

    document.addEventListener("click", handleImageClick);
    return () => document.removeEventListener("click", handleImageClick);
  }, [handleImageClick]);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return undefined;
    }

    document.body.classList.toggle("hami-lightbox-open", state.open);

    if (!state.open) {
      return undefined;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        close();
        return;
      }

      if (event.key === "Tab") {
        // The close button is the only focusable element in the dialog,
        // so trap focus on it regardless of shift.
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("hami-lightbox-open");
      if (lastFocusedRef.current instanceof HTMLElement) {
        lastFocusedRef.current.focus();
      }
      lastFocusedRef.current = null;
    };
  }, [state.open, close]);

  useEffect(() => {
    const host = svgHostRef.current;
    if (!host) {
      return undefined;
    }

    host.replaceChildren();
    if (state.mode === "svg" && state.svg) {
      const clone = state.svg;
      clone.style.maxWidth = "none";
      clone.style.width = "100%";
      clone.style.height = "100%";
      clone.removeAttribute("height");
      clone.removeAttribute("width");
      host.appendChild(clone);
    }

    return () => host.replaceChildren();
  }, [state.svg, state.mode]);

  if (!ExecutionEnvironment.canUseDOM) {
    return null;
  }

  const hasCaption = Boolean(state.caption && state.caption.trim());

  return ReactDOM.createPortal(
    <div
      ref={dialogRef}
      className="hami-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      data-has-caption={hasCaption ? "true" : "false"}
      hidden={!state.open}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          close();
        }
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className="hami-lightbox__close"
        aria-label="Close image preview"
        onClick={close}
      >
        &times;
      </button>
      <img
        className="hami-lightbox__image"
        src={state.mode === "image" ? state.src : undefined}
        alt={state.mode === "image" ? state.alt : ""}
        hidden={state.mode !== "image"}
        onClick={close}
      />
      <div
        ref={svgHostRef}
        className="hami-lightbox__svg"
        hidden={state.mode !== "svg"}
        onClick={close}
      />
      <p className="hami-lightbox__caption" hidden={!hasCaption}>
        {state.caption}
      </p>
    </div>,
    document.body,
  );
}
