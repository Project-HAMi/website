import {useEffect} from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const MARKDOWN_IMAGE_SCOPE =
  '.theme-doc-markdown, .theme-blog-markdown, article.markdown, .markdown';

const BLOCKED_SCOPE =
  '.no-lightbox, .avatar, .table-of-contents, .pagination-nav, .navbar, .footer';

function isImageHref(href = '') {
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

function ensureLightbox() {
  let root = document.querySelector('.hami-lightbox');
  if (root) {
    return root;
  }

  root = document.createElement('div');
  root.className = 'hami-lightbox';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Image preview');
  root.hidden = true;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'hami-lightbox__close';
  closeButton.setAttribute('aria-label', 'Close image preview');
  closeButton.textContent = '×';

  const lightboxImage = document.createElement('img');
  lightboxImage.className = 'hami-lightbox__image';
  lightboxImage.alt = '';

  const caption = document.createElement('p');
  caption.className = 'hami-lightbox__caption';

  root.appendChild(closeButton);
  root.appendChild(lightboxImage);
  root.appendChild(caption);
  document.body.appendChild(root);

  const close = () => {
    root.hidden = true;
    document.body.classList.remove('hami-lightbox-open');
    lightboxImage.removeAttribute('src');
    lightboxImage.alt = '';
    caption.textContent = '';
  };

  root.addEventListener('click', (event) => {
    if (event.target === root) {
      close();
    }
  });

  lightboxImage.addEventListener('click', close);

  closeButton.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) {
      close();
    }
  });

  root.__hamiLightboxOpen = ({src, alt}) => {
    lightboxImage.src = src;
    lightboxImage.alt = alt || '';
    caption.textContent = alt || '';
    root.hidden = false;
    document.body.classList.add('hami-lightbox-open');
  };

  return root;
}

function handleImageClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const image = target instanceof HTMLImageElement ? target : target.closest('img');
  if (!shouldOpenLightbox(image)) {
    return;
  }

  const parentLink = image.closest('a');
  if (parentLink) {
    const href = parentLink.getAttribute('href') || '';
    const sameAsImage =
      href === image.currentSrc || href === image.src || href === image.getAttribute('src');
    if (!sameAsImage && !isImageHref(href)) {
      return;
    }
    event.preventDefault();
  }

  const lightbox = ensureLightbox();
  lightbox.__hamiLightboxOpen({
    src: image.currentSrc || image.src,
    alt: image.alt || '',
  });
}

export default function useImageLightbox() {
  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM || window.__hamiLightboxInitialized) {
      return undefined;
    }

    window.__hamiLightboxInitialized = true;
    document.addEventListener('click', handleImageClick);

    return () => {
      document.removeEventListener('click', handleImageClick);
      window.__hamiLightboxInitialized = false;
    };
  }, []);
}
