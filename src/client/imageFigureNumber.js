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

export function onRouteDidUpdate({ location }) {
  // Only run on blog and doc pages
  if (!location.pathname.match(/\/blog\//) && !location.pathname.match(/\/docs\//)) {
    return;
  }

  const locale = localeFromPathname(location.pathname);

  // A single rAF tick is sufficient: Docusaurus has already committed the new
  // page content to the DOM by the time onRouteDidUpdate fires. Using rAF
  // instead of multiple staggered setTimeouts avoids duplicate caption
  // injections when routes are navigated quickly.
  requestAnimationFrame(() => addFigureNumbers(locale));
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
    const parentClass = img.parentElement?.className || "";
    const isLogo = parentClass.includes("logo") || img.alt.includes("logo");
    const isIcon = img.width < 100 || img.height < 100;
    return !isLogo && !isIcon;
  });

  let figureCount = 0;

  images.forEach((img) => {
    const altText = img.getAttribute("alt") || "";
    if (!altText.trim()) {
      return;
    }

    figureCount++;

    // Wrap in <figure> if not already wrapped
    let figure = img.closest("figure");
    if (!figure) {
      figure = document.createElement("figure");
      img.parentNode.insertBefore(figure, img);
      figure.appendChild(img);
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
