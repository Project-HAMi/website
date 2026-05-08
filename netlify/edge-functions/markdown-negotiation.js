const SKIP_EXTENSIONS = new Set([
  '.avif',
  '.css',
  '.gif',
  '.ico',
  '.jpg',
  '.jpeg',
  '.js',
  '.json',
  '.map',
  '.png',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml',
  '.woff',
  '.woff2',
]);

function hasSkippedExtension(pathname) {
  const lastSegment = pathname.split('/').pop() || '';
  const dotIndex = lastSegment.lastIndexOf('.');
  return dotIndex >= 0 && SKIP_EXTENSIONS.has(lastSegment.slice(dotIndex).toLowerCase());
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(text) {
  return decodeEntities(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlToMarkdown(html, pageUrl) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'HAMi';
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1] || '';
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  let markdown = main
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n\n#### $1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]+alt=["']([^"']*)["'][^>]*>/gi, '$1')
    .replace(/<[^>]+>/g, ' ');

  markdown = normalizeWhitespace(markdown.replace(/[ \t]{2,}/g, ' '));
  const header = [`# ${normalizeWhitespace(title)}`];

  if (description) {
    header.push('', normalizeWhitespace(description));
  }

  header.push('', `Source: ${pageUrl}`);
  return normalizeWhitespace(`${header.join('\n')}\n\n${markdown}`);
}

function estimateTokens(markdown) {
  if (!markdown) return 0;
  return Math.ceil(markdown.split(/\s+/).filter(Boolean).length * 1.35);
}

export default async (request, context) => {
  const accept = request.headers.get('accept') || '';
  const url = new URL(request.url);

  if (!accept.toLowerCase().includes('text/markdown') || request.method !== 'GET' || hasSkippedExtension(url.pathname)) {
    return;
  }

  const response = await context.next();
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok || !contentType.toLowerCase().includes('text/html')) {
    return response;
  }

  const markdown = htmlToMarkdown(await response.text(), url.toString());
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/markdown; charset=utf-8');
  headers.set('vary', 'Accept');
  headers.set('x-markdown-tokens', String(estimateTokens(markdown)));

  return new Response(markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const config = {
  path: '/*',
};
