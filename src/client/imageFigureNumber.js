/**
 * Client module to automatically add figure numbers and captions to images
 * based on their alt text in blog posts and docs.
 */

/**
 * Derive the locale from the current pathname so the caption prefix is always
 * consistent with the page the user navigated *to*, not with whatever stale
 * value `document.documentElement.lang` happens to hold during the transition.
 *
 * @param {string} pathname
 * @returns {"zh" | "en"}
 */
function localeFromPathname(pathname) {
  return pathname.startsWith("/zh/") || pathname === "/zh" ? "zh" : "en";
}

/**
 * Only blog and doc pages (including root doc paths like /docs or /zh/docs)
 * get figure numbering.
 *
 * @param {string} pathname
 * @returns {boolean}
 */
function isSupportedRoute(pathname) {
  return /(?:^|\/)(?:blog|docs)(?:$|\/)/.test(pathname);
}

export function onRouteDidUpdate({ location }) {
  if (!isSupportedRoute(location.pathname)) {
    return;
  }

  const locale = localeFromPathname(location.pathname);

  // A single rAF tick is sufficient for committed DOM elements. Using rAF
  // instead of multiple staggered setTimeouts avoids duplicate caption
  // injections when routes are navigated quickly.
  requestAnimationFrame(() => addFigureNumbers(locale));
}

/**
 * Determine if an image is a logo or small icon that should be skipped.
 * Handles images with explicit HTML/CSS width attributes (e.g. <img width="600px">)
 * even when rendered height is 0 before the image finishes loading.
 *
 * @param {HTMLImageElement} img
 * @returns {boolean}
 */
function isIconImage(img) {
  const parentClass = img.parentElement?.className || "";
  const isLogo = parentClass.includes("logo") || (img.alt && img.alt.includes("logo"));
  if (isLogo) {
    return true;
  }

  // Parse explicit width/height attributes (e.g. width="600px" or width="600")
  const attrWidth = parseInt(img.getAttribute("width") || "", 10);
  const attrHeight = parseInt(img.getAttribute("height") || "", 10);

  // If explicit width or height attribute is >= 100, it is a content figure, not an icon
  if ((!isNaN(attrWidth) && attrWidth >= 100) || (!isNaN(attrHeight) && attrHeight >= 100)) {
    return false;
  }

  // If explicit width or height attribute is small (> 0 and < 100), it is an icon
  if (
    (!isNaN(attrWidth) && attrWidth > 0 && attrWidth < 100) ||
    (!isNaN(attrHeight) && attrHeight > 0 && attrHeight < 100)
  ) {
    return true;
  }

  const w = img.naturalWidth || img.clientWidth || img.width;
  const h = img.naturalHeight || img.clientHeight || img.height;

  // If rendered/natural width is >= 100, it is a content figure
  if (w >= 100) {
    return false;
  }

  // If rendered/natural height is >= 100, it is a content figure
  if (h >= 100) {
    return false;
  }

  // If both rendered/natural dimensions are known and small (> 0 and < 100)
  if (w > 0 && w < 100 && h > 0 && h < 100) {
    return true;
  }

  // If width is known and small (> 0 and < 100)
  if (w > 0 && w < 100) {
    return true;
  }

  return false;
}

/**
 * Undo the <figure>/<figcaption> wrapping that this script previously applied
 * to an image, used when a reload reveals the image is actually an icon
 * (e.g. it had no width/height attributes and looked like content pre-load).
 *
 * @param {HTMLImageElement} img
 */
function unwrapAutoFigure(img) {
  const figure = img.closest("figure");
  if (!figure || !figure.dataset.autoFigure) {
    return;
  }
  const wrapped = img.parentElement && img.parentElement.tagName === "A" ? img.parentElement : img;
  figure.parentNode.insertBefore(wrapped, figure);
  figure.remove();
}

/**
 * @param {"zh" | "en"} locale
 */
function addFigureNumbers(locale) {
  // Find all images in markdown content
  const articleContent = document.querySelector("article");
  if (!articleContent) {
    return;
  }

  const prefix = locale === "zh" ? "图" : "Figure";

  // Find all images that are not logos or small icons
  const images = Array.from(articleContent.querySelectorAll("img")).filter((img) => {
    // Re-run captioning when lazy/slow images complete loading
    if (!img.complete && !img.dataset.hasLoadListener) {
      img.dataset.hasLoadListener = "true";
      img.addEventListener(
        "load",
        () => {
          // Re-check the route: by the time a slow image loads, navigation
          // may have moved to a page this script shouldn't touch.
          const pathname = window.location.pathname;
          if (!isSupportedRoute(pathname)) {
            return;
          }
          addFigureNumbers(localeFromPathname(pathname));
        },
        { once: true },
      );
    }
    const isIcon = isIconImage(img);
    if (isIcon) {
      // An earlier pass may have wrapped this image before it finished loading
      // and its true (small) dimensions were known; undo that now.
      unwrapAutoFigure(img);
    }
    return !isIcon;
  });

  let figureCount = 0;

  images.forEach((img) => {
    const altText = img.getAttribute("alt") || "";
    if (!altText.trim()) {
      return;
    }

    figureCount++;

    // Wrap in <figure> if not already wrapped. If the image is inside an anchor link,
    // move the anchor element into the figure to preserve clickable links.
    let figure = img.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      figure.dataset.autoFigure = "true";
      const targetElement =
        img.parentElement && img.parentElement.tagName === "A" ? img.parentElement : img;
      targetElement.parentNode.insertBefore(figure, targetElement);
      figure.appendChild(targetElement);
    }

    // Find or create the <figcaption>, always overwriting its text so that
    // navigating between locales corrects stale captions from a previous run.
    let figcaption = figure.querySelector("figcaption");
    if (!figcaption) {
      figcaption = document.createElement("figcaption");
      figure.appendChild(figcaption);
    }
    figcaption.textContent = `${prefix}${figureCount}: ${altText}`;

    // Apply styles (idempotent — repeated assignment is harmless)
    figure.style.cssText = `
      margin: 2em 0;
      text-align: center;
    `;

    img.style.cssText = `
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    `;

    figcaption.style.cssText = `
      margin-top: 0.8em;
      font-size: 0.9em;
      color: var(--ifm-color-emphasis-600);
      font-style: italic;
    `;
  });
}
