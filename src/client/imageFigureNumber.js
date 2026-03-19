/**
 * Client module to automatically add figure numbers and captions to images
 * based on their alt text in blog posts and docs.
 */
export function onRouteDidUpdate({ location, previousLocation }) {
  // Only run on blog and doc pages
  if (!location.pathname.match(/\/blog\//) && !location.pathname.match(/\/docs\//)) {
    return;
  }

  // Wait for DOM to be ready with multiple attempts
  setTimeout(() => addFigureNumbers(), 100);
  setTimeout(() => addFigureNumbers(), 500);
  setTimeout(() => addFigureNumbers(), 1000);
}

function addFigureNumbers() {
  // Find all images in markdown content
  const articleContent = document.querySelector('article');
  if (!articleContent) {
    console.log('[ImageFigureNumber] No article content found');
    return;
  }

  // Find all images that are not in header or footer
  const images = Array.from(articleContent.querySelectorAll('img')).filter(img => {
    // Filter out logos, avatars, icons
    const parentClass = img.parentElement?.className || '';
    const isLogo = parentClass.includes('logo') || img.alt.includes('logo');
    const isIcon = img.width < 100 || img.height < 100;
    return !isLogo && !isIcon;
  });

  console.log(`[ImageFigureNumber] Found ${images.length} images`);

  let figureCount = 0;

  images.forEach((img) => {
    // Get alt text
    const altText = img.getAttribute('alt') || '';
    if (!altText.trim()) {
      console.log('[ImageFigureNumber] Skipping image with no alt text');
      return;
    }

    // Check if already has figcaption with figure number
    const existingFigure = img.closest('figure');
    if (existingFigure) {
      const existingFigcaption = existingFigure.querySelector('figcaption');
      if (existingFigcaption && existingFigcaption.textContent.match(/^[图Figure]\d+:/)) {
        console.log('[ImageFigureNumber] Image already has figure caption, skipping');
        figureCount++;
        return;
      }
    }

    // Increment counter
    figureCount++;
    console.log(`[ImageFigureNumber] Processing figure ${figureCount}: ${altText}`);

    // Create figure wrapper if it doesn't exist
    let figure = img.closest('figure');
    if (!figure) {
      figure = document.createElement('figure');
      img.parentNode.insertBefore(figure, img);
      figure.appendChild(img);
    }

    // Remove existing figcaption if any (but only if it doesn't have figure number)
    const existingFigcaption = figure.querySelector('figcaption');
    if (existingFigcaption && !existingFigcaption.textContent.match(/^[图Figure]\d+:/)) {
      existingFigcaption.remove();
    } else if (existingFigcaption) {
      // Update existing figcaption with figure number
      const currentLang = document.documentElement.lang || 'en';
      const prefix = currentLang.startsWith('zh') ? '图' : 'Figure';
      existingFigcaption.textContent = `${prefix}${figureCount}: ${altText}`;
      return;
    }

    // Create figcaption with number and alt text
    const figcaption = document.createElement('figcaption');
    const currentLang = document.documentElement.lang || 'en';

    // Use appropriate prefix based on language
    const prefix = currentLang.startsWith('zh') ? '图' : 'Figure';
    figcaption.textContent = `${prefix}${figureCount}: ${altText}`;

    // Append figcaption to figure
    figure.appendChild(figcaption);

    // Add styling class
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

    console.log(`[ImageFigureNumber] Added caption: ${figcaption.textContent}`);
  });
}
