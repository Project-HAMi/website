const SKIP_EXTENSIONS = new Set([
  ".avif",
  ".css",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".js",
  ".json",
  ".map",
  ".png",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
  ".woff",
  ".woff2",
]);

const NAMED_ENTITIES = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
  times: "×",
};

function hasSkippedExtension(pathname) {
  const lastSegment = pathname.split("/").pop() || "";
  const dotIndex = lastSegment.lastIndexOf(".");
  return dotIndex >= 0 && SKIP_EXTENSIONS.has(lastSegment.slice(dotIndex).toLowerCase());
}

// One pass, so `&amp;lt;` isn't decoded twice. Docusaurus emits the hex form.
function decodeEntities(text) {
  return text.replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity) => {
    if (entity[0] !== "#") {
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    }
    const codePoint =
      entity[1] === "x" || entity[1] === "X"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
    const isValid =
      Number.isInteger(codePoint) &&
      codePoint >= 0 &&
      codePoint <= 0x10ffff &&
      !(codePoint >= 0xd800 && codePoint <= 0xdfff);
    return isValid ? String.fromCodePoint(codePoint) : match;
  });
}

function normalizeWhitespace(text) {
  return decodeEntities(text)
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Parks blocks whose whitespace is already exact. U+0000 can't occur in HTML
// text, so the marker can't collide with page content.
function createBlockStore() {
  const blocks = [];
  return {
    stash(content) {
      blocks.push(content);
      return `\u0000${blocks.length - 1}\u0000`;
    },
    restore(text) {
      return text.replace(/\u0000(\d+)\u0000/g, (match, index) => blocks[Number(index)] ?? match);
    },
  };
}

// Same idea as the block-store marker: hide `>` inside quoted attrs so `[^>]*`
// tag scans don't stop early.
const ATTR_GT = "\u0001";

function findTagClose(html, openIndex) {
  let quote = null;
  for (let i = openIndex + 1; i < html.length; i++) {
    const c = html[i];
    if (quote) {
      if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return i;
    }
  }
  return -1;
}

function protectQuotedAngles(html) {
  let result = "";
  let cursor = 0;
  for (let i = 0; i < html.length; i++) {
    if (html[i] !== "<") {
      continue;
    }
    const close = findTagClose(html, i);
    if (close === -1) {
      break;
    }
    result += html.slice(cursor, i);
    result += html.slice(i, close).replace(/>/g, ATTR_GT);
    result += ">";
    cursor = close + 1;
    i = close;
  }
  return result + html.slice(cursor);
}

function restoreQuotedAngles(text) {
  return text.includes(ATTR_GT) ? text.replace(/\u0001/g, ">") : text;
}

// Depth-tracked because the TOC containers nest divs, so the first closing tag
// isn't the matching one.
function dropElements(html, tagName, classPattern) {
  const tag = new RegExp(`<(/?)${tagName}\\b([^>]*)>`, "gi");
  let result = "";
  let cursor = 0;
  let match;

  while ((match = tag.exec(html))) {
    const isClosing = Boolean(match[1]);
    const classes = match[2].match(/\bclass="([^"]*)"/i)?.[1] ?? "";
    if (isClosing || !classPattern.test(classes)) {
      continue;
    }

    let depth = 1;
    let inner;
    while (depth > 0 && (inner = tag.exec(html))) {
      depth += inner[1] ? -1 : 1;
    }

    const end = depth === 0 ? tag.lastIndex : html.length;
    result += html.slice(cursor, match.index);
    cursor = end;
    tag.lastIndex = end;
  }

  return result + html.slice(cursor);
}

function findListClose(html, innerStart) {
  const token = /<\/?(?:ul|ol)\b[^>]*>/gi;
  token.lastIndex = innerStart;
  let depth = 1;
  let match;
  while ((match = token.exec(html))) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) {
      return { innerEnd: match.index, after: match.index + match[0].length };
    }
  }
  return null;
}

function extractDirectLis(inner) {
  const items = [];
  const token = /<\/?(?:ul|ol|li)\b[^>]*>/gi;
  let listDepth = 0;
  let liStart = null;
  let match;

  while ((match = token.exec(inner))) {
    const isClose = match[0].startsWith("</");
    const tag = match[0].match(/<\/?([a-z]+)/i)[1].toLowerCase();

    if (tag === "ul" || tag === "ol") {
      listDepth += isClose ? -1 : 1;
      continue;
    }
    if (listDepth !== 0) {
      continue;
    }
    if (!isClose) {
      if (liStart === null) {
        liStart = match.index + match[0].length;
      }
      continue;
    }
    if (liStart !== null) {
      items.push(inner.slice(liStart, match.index));
      liStart = null;
    }
  }

  return items;
}

function formatListItem(marker, content) {
  const lines = content
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .split("\n")
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return `\n${marker.trimEnd()}`;
  }
  const indent = " ".repeat(marker.length);
  let out = `\n${marker}${lines[0].trimStart()}`;
  for (let i = 1; i < lines.length; i++) {
    out += `\n${indent}${lines[i].trimStart()}`;
  }
  return out;
}

function renderList(inner, ordered) {
  const items = extractDirectLis(inner);
  if (items.length === 0) {
    return "";
  }
  return items
    .map((item, index) => {
      const marker = ordered ? `${index + 1}. ` : `- `;
      return formatListItem(marker, convertLists(item));
    })
    .join("");
}

function convertLists(html) {
  const open = /<(ul|ol)\b[^>]*>/gi;
  let result = "";
  let cursor = 0;
  let match;

  while ((match = open.exec(html))) {
    result += html.slice(cursor, match.index);
    const ordered = match[1].toLowerCase() === "ol";
    const closed = findListClose(html, match.index + match[0].length);
    if (!closed) {
      result += html.slice(match.index);
      return result;
    }
    result += renderList(html.slice(match.index + match[0].length, closed.innerEnd), ordered);
    cursor = closed.after;
    open.lastIndex = closed.after;
  }

  return result + html.slice(cursor);
}

// There are no newlines inside <pre>: each line is a token-line ending in <br>,
// and the indentation sits inside the token spans. So <br> becomes the line
// break, and the other tags go without a space in their place.
function toFencedCode(preHtml) {
  const language = preHtml.match(/<pre\b[^>]*\bclass="[^"]*\blanguage-([\w+#.-]+)/i)?.[1] ?? "";
  const body = decodeEntities(preHtml.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/^\n+/, "")
    .replace(/\s+$/, "");

  if (!body) {
    return "";
  }

  const longestBacktickRun = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}${language}\n${body}\n${fence}`;
}

function inlineToMarkdown(html) {
  return html
    .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(
      /<code\b[^>]*>([\s\S]*?)<\/code>/gi,
      (match, inner) => `\`${inner.replace(/<[^>]+>/g, "")}\``,
    )
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<[^>]+>/g, " ");
}

function toMarkdownTable(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) =>
      [...row[1].matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) =>
        decodeEntities(inlineToMarkdown(cell[2])).replace(/\s+/g, " ").replace(/\|/g, "\\|").trim(),
      ),
    )
    .filter((cells) => cells.length > 0);

  if (rows.length === 0) {
    return "";
  }

  const width = Math.max(...rows.map((cells) => cells.length));
  const toLine = (cells) =>
    `| ${[...cells, ...Array(width - cells.length).fill("")].join(" | ")} |`;
  const hasHeaderRow = /<th\b/i.test(tableHtml);
  const [head, ...body] = hasHeaderRow ? rows : [Array(width).fill(""), ...rows];

  return [toLine(head), `| ${Array(width).fill("---").join(" | ")} |`, ...body.map(toLine)].join(
    "\n",
  );
}

function htmlToMarkdown(html, pageUrl) {
  html = protectQuotedAngles(html);
  const rawTitle = restoreQuotedAngles(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const rawDescription = restoreQuotedAngles(
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1] ?? "",
  );

  let content = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;

  content = content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/<span\b[^>]*theme-doc-version-badge[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<a\b[^>]*\bclass="[^"]*\bhash-link\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "");
  content = dropElements(content, "div", /theme-doc-toc|tocCollapsible/);

  // Convert these first: their whitespace is significant.
  const store = createBlockStore();
  content = content
    .replace(
      /<pre\b[^>]*>[\s\S]*?<\/pre>/gi,
      (block) => `\n\n${store.stash(toFencedCode(block))}\n\n`,
    )
    .replace(
      /<table\b[^>]*>[\s\S]*?<\/table>/gi,
      (block) => `\n\n${store.stash(toMarkdownTable(block))}\n\n`,
    );

  let markdown = content
    .replace(
      /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
      (match, level, text) => `\n\n${"#".repeat(Number(level))} ${text}\n\n`,
    )
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = tag.match(/\bsrc="([^"]*)"/i)?.[1] ?? "";
      const alt = tag.match(/\balt="([^"]*)"/i)?.[1] ?? "";
      return src ? `![${alt}](${src})` : alt;
    });
  markdown = convertLists(markdown);

  // Keep leading indent so nested list markers aren't collapsed.
  markdown = normalizeWhitespace(inlineToMarkdown(markdown).replace(/(\S)[ \t]{2,}/g, "$1 "));

  const title =
    normalizeWhitespace(rawTitle)
      .replace(/\s*\|\s*HAMi\s*$/i, "")
      .trim() || "HAMi";
  const description = normalizeWhitespace(rawDescription);

  // Drop the body's H1 when it repeats the <title>. Not always the first thing
  // in <main>, hence the search. Code blocks are still stashed, so a `# comment`
  // inside one can't match. The suffix case covers "HAMi Case Studies" vs
  // "Case Studies".
  const bodyHeading = markdown.match(/^#[ \t]+(\S[^\n]*)$/m);
  if (bodyHeading) {
    const headingText = bodyHeading[1].trim();
    if (headingText === title || title.endsWith(` ${headingText}`)) {
      markdown = (
        markdown.slice(0, bodyHeading.index) +
        markdown.slice(bodyHeading.index + bodyHeading[0].length)
      )
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  }

  const header = [`# ${title}`];
  if (description && !markdown.includes(description)) {
    header.push("", description);
  }
  header.push("", `Source: ${pageUrl}`);

  // Restore last, so the stashed blocks aren't re-normalized.
  return restoreQuotedAngles(`${store.restore(`${header.join("\n")}\n\n${markdown}`)}\n`);
}

function estimateTokens(markdown) {
  if (!markdown) return 0;
  return Math.ceil(markdown.split(/\s+/).filter(Boolean).length * 1.35);
}

export default async (request, context) => {
  const accept = request.headers.get("accept") || "";
  const url = new URL(request.url);

  if (
    !accept.toLowerCase().includes("text/markdown") ||
    request.method !== "GET" ||
    hasSkippedExtension(url.pathname)
  ) {
    return;
  }

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  // Only a complete 200 is safe to rewrite. A 206 carries a Content-Range
  // describing the HTML byte range, which stops matching once the body becomes
  // Markdown, and a 204 can't take a body at all.
  if (response.status !== 200 || !contentType.toLowerCase().includes("text/html")) {
    return response;
  }

  const markdown = htmlToMarkdown(await response.text(), url.toString());
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("vary", "Accept");
  headers.set("x-markdown-tokens", String(estimateTokens(markdown)));

  return new Response(markdown, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const config = {
  path: "/*",
};
