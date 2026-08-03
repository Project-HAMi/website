/**
 * Tests for the Markdown content-negotiation edge function.
 *
 * The edge function runs on every request and serves a Markdown rendering of
 * each page to clients that ask for `Accept: text/markdown` (LLM agents, docs
 * scrapers). It is pure string transformation with no dependencies, so it is
 * driven here through its public handler: build a Request, stub `context.next()`
 * with the HTML Docusaurus would emit, and assert on the Markdown that comes out.
 *
 * These pin current behavior. Where the current behavior is a wart rather than a
 * choice, the comment above the case says so.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import handler, { config } from "../netlify/edge-functions/markdown-negotiation.js";

const PAGE_URL = "https://project-hami.io/docs/example";

function htmlResponse(body, { status = 200, statusText = "OK", contentType } = {}) {
  const headers = new Headers();
  if (contentType !== null) {
    headers.set("content-type", contentType ?? "text/html; charset=utf-8");
  }
  return new Response(body, { status, statusText, headers });
}

/** Runs the handler. Returns whatever it returns (undefined means "pass through"). */
function invoke(html, { url = PAGE_URL, accept = "text/markdown", method = "GET", response } = {}) {
  const headers = accept === null ? {} : { accept };
  const request = new Request(url, { method, headers });
  return handler(request, { next: async () => response ?? htmlResponse(html) });
}

/** Full Markdown document for a page. */
async function render(html, options) {
  const result = await invoke(html, options);
  assert.ok(result instanceof Response, "expected the handler to return a Response");
  return result.text();
}

/** Just the converted body, with the generated `# Title` / `Source:` preamble removed. */
async function body(html, options) {
  const markdown = await render(html, options);
  const marker = markdown.indexOf(`Source: ${options?.url ?? PAGE_URL}`);
  assert.notEqual(marker, -1, "expected a Source: line in the output");
  return markdown.slice(markdown.indexOf("\n", marker) + 1).trim();
}

/** Wraps fragments in the `<main>` element the converter looks for. */
const page = (inner, { title = "", description = "" } = {}) =>
  `<!doctype html><html><head>${title ? `<title>${title}</title>` : ""}${
    description ? `<meta name="description" content="${description}">` : ""
  }</head><body><main>${inner}</main></body></html>`;

describe("deployment config", () => {
  // Netlify reads this to decide which requests reach the function. Narrowing it
  // would silently disable Markdown negotiation for every path left out, with no
  // other test noticing, so the route is pinned here.
  it("registers for every path", () => {
    assert.deepEqual(config, { path: "/*" });
  });
});

describe("content negotiation", () => {
  it("passes through when the client does not ask for Markdown", async () => {
    assert.equal(await invoke("<main><p>hi</p></main>", { accept: "text/html" }), undefined);
  });

  it("passes through when there is no Accept header at all", async () => {
    assert.equal(await invoke("<main><p>hi</p></main>", { accept: null }), undefined);
  });

  it("converts when Markdown appears alongside other media types", async () => {
    assert.equal(await body(page("<p>hi</p>"), { accept: "text/html,text/markdown;q=0.9" }), "hi");
  });

  it("matches the Accept header case-insensitively", async () => {
    assert.equal(await body(page("<p>hi</p>"), { accept: "TEXT/MARKDOWN" }), "hi");
  });

  it("passes through non-GET requests", async () => {
    assert.equal(await invoke(page("<p>hi</p>"), { method: "POST" }), undefined);
  });

  it("passes through asset extensions", async () => {
    for (const path of ["/img/logo.png", "/styles.css", "/data.json", "/sitemap.xml"]) {
      assert.equal(
        await invoke("<main>x</main>", { url: `https://project-hami.io${path}` }),
        undefined,
        `expected ${path} to be skipped`,
      );
    }
  });

  it("matches asset extensions case-insensitively", async () => {
    assert.equal(
      await invoke("<main>x</main>", { url: "https://project-hami.io/img/LOGO.PNG" }),
      undefined,
    );
  });

  it("converts doc paths whose last segment merely contains dots", async () => {
    const url = "https://project-hami.io/docs/v2.6.0";
    assert.equal(await body(page("<p>hi</p>"), { url }), "hi");
  });

  it("returns the upstream response untouched when it is not HTML", async () => {
    const upstream = htmlResponse("{}", { contentType: "application/json" });
    assert.equal(await invoke(null, { response: upstream }), upstream);
  });

  it("returns the upstream response untouched when it has no content type", async () => {
    const upstream = htmlResponse("<main><p>x</p></main>", { contentType: null });
    assert.equal(await invoke(null, { response: upstream }), upstream);
  });

  it("returns the upstream response untouched when it is an error", async () => {
    const upstream = htmlResponse("<main>nope</main>", { status: 404, statusText: "Not Found" });
    assert.equal(await invoke(null, { response: upstream }), upstream);
  });
});

describe("response headers", () => {
  it("advertises Markdown and varies on Accept", async () => {
    const response = await invoke(page("<p>hi</p>"));
    assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
    assert.equal(response.headers.get("vary"), "Accept");
  });

  // Clients use this to budget context, so the value is a contract, not a hint:
  // ceil(words * 1.35) over the whole document, preamble included. The body here
  // is 4 words and the preamble is 4, so 8 * 1.35 -> 11.
  it("reports the token estimate for the whole document", async () => {
    const response = await invoke("<main><p>alpha beta gamma delta</p></main>");
    assert.equal(response.headers.get("x-markdown-tokens"), "11");
  });

  it("preserves the upstream status and status text", async () => {
    const response = await invoke(null, {
      response: htmlResponse(page("<p>hi</p>"), { status: 203, statusText: "Non-Authoritative" }),
    });
    assert.equal(response.status, 203);
    assert.equal(response.statusText, "Non-Authoritative");
  });
});

describe("document preamble", () => {
  // Anchors the whole contract in one place: heading, description, blank-line
  // separators, Source line, converted body, single trailing newline.
  it("emits the full document in the documented shape", async () => {
    const markdown = await render(
      page("<h2>Prerequisites</h2><p>A Kubernetes cluster.</p>", {
        title: "Installing HAMi | HAMi",
        description: "How to install.",
      }),
    );
    assert.equal(
      markdown,
      "# Installing HAMi\n\nHow to install.\n\n" +
        `Source: ${PAGE_URL}\n\n` +
        "## Prerequisites\n\nA Kubernetes cluster.\n",
    );
  });

  it("strips the ` | HAMi` suffix from the title", async () => {
    const markdown = await render(page("<p>x</p>", { title: "Installation | HAMi" }));
    assert.match(markdown, /^# Installation\n/);
  });

  it("falls back to `HAMi` when the page has no title", async () => {
    assert.match(await render(page("<p>x</p>")), /^# HAMi\n/);
  });

  it("always records the source URL", async () => {
    assert.match(await render(page("<p>x</p>")), new RegExp(`^Source: ${PAGE_URL}$`, "m"));
  });

  it("includes the meta description", async () => {
    const markdown = await render(
      page("<p>unrelated</p>", { title: "Docs", description: "Shared GPU scheduling." }),
    );
    assert.match(markdown, /Shared GPU scheduling\./);
  });

  it("does not repeat a description already present in the body", async () => {
    const markdown = await render(
      page("<p>Shared GPU scheduling.</p>", {
        title: "Docs",
        description: "Shared GPU scheduling.",
      }),
    );
    assert.equal(markdown.match(/Shared GPU scheduling\./g).length, 1);
  });

  it("drops a body H1 that duplicates the title", async () => {
    const markdown = await render(
      page("<h1>Installation</h1><p>body</p>", { title: "Installation | HAMi" }),
    );
    assert.equal(markdown.match(/^# Installation$/gm).length, 1);
    assert.match(markdown, /body/);
  });

  it("drops a body H1 that the title merely suffixes", async () => {
    const markdown = await render(
      page("<h1>Case Studies</h1><p>body</p>", { title: "HAMi Case Studies" }),
    );
    assert.equal(markdown.match(/Case Studies/g).length, 1);
  });

  it("keeps a body H1 that is genuinely different", async () => {
    const markdown = await render(page("<h1>Prerequisites</h1>", { title: "Installation" }));
    assert.match(markdown, /^# Installation$/m);
    assert.match(markdown, /^# Prerequisites$/m);
  });

  // Docusaurus always emits <main>; this is the fallback for anything that does
  // not. The whole document is converted, so text from <head> ends up in the
  // body. That is acceptable for a path production never takes, but it is
  // pinned so the fallback is not mistaken for clean extraction.
  it("falls back to the whole document when there is no <main>", async () => {
    const markdown = await render(
      "<html><head><title>T | HAMi</title></head><body><p>only body</p></body></html>",
    );
    assert.match(markdown, /^# T$/m);
    assert.match(markdown, /only body/);
  });
});

describe("block structure", () => {
  it("converts headings at every level", async () => {
    const html = Array.from({ length: 6 }, (_, i) => `<h${i + 1}>L${i + 1}</h${i + 1}>`).join("");
    assert.equal(
      await body(`<main>${html}</main>`),
      "# L1\n\n## L2\n\n### L3\n\n#### L4\n\n##### L5\n\n###### L6",
    );
  });

  it("converts unordered lists", async () => {
    assert.equal(
      await body("<main><ul><li>alpha</li><li>beta</li></ul></main>"),
      "- alpha\n- beta",
    );
  });

  it("numbers ordered lists", async () => {
    assert.equal(
      await body("<main><ol><li>first</li><li>second</li></ol></main>"),
      "1. first\n2. second",
    );
  });

  it("restarts numbering for each ordered list", async () => {
    assert.equal(
      await body("<main><ol><li>a</li></ol><p>gap</p><ol><li>b</li></ol></main>"),
      "1. a\n\ngap\n\n1. b",
    );
  });

  it("converts line breaks", async () => {
    assert.equal(await body("<main><p>one<br>two</p></main>"), "one\ntwo");
  });

  it("converts images", async () => {
    assert.equal(
      await body('<main><p><img src="/img/arch.png" alt="Architecture"></p></main>'),
      "![Architecture](/img/arch.png)",
    );
  });

  it("falls back to alt text for images with no source", async () => {
    assert.equal(await body('<main><p><img alt="Architecture"></p></main>'), "Architecture");
  });

  it("keeps images nested inside links", async () => {
    assert.equal(
      await body('<main><p><a href="/x"><img src="/i.png" alt="Logo"></a></p></main>'),
      "[![Logo](/i.png)](/x)",
    );
  });
});

describe("inline formatting", () => {
  it("converts links, emphasis and inline code", async () => {
    assert.equal(
      await body(
        '<main><p><a href="/docs/install">Install</a> <strong>must</strong> <em>now</em> <code>--set</code></p></main>',
      ),
      "[Install](/docs/install) **must** *now* `--set`",
    );
  });

  it("treats <b> and <i> as their semantic equivalents", async () => {
    assert.equal(await body("<main><p><b>bold</b> <i>italic</i></p></main>"), "**bold** *italic*");
  });

  it("keeps formatting nested inside links", async () => {
    assert.equal(
      await body(
        '<main><p><a class="x" href="/a" target="_blank">Read <code>values.yaml</code></a></p></main>',
      ),
      "[Read `values.yaml`](/a)",
    );
  });
});

describe("code blocks", () => {
  it("labels the fence with the highlighted language", async () => {
    assert.equal(
      await body('<main><pre class="language-bash"><code>helm install</code></pre></main>'),
      "```bash\nhelm install\n```",
    );
  });

  it("falls back to an unlabeled fence", async () => {
    assert.equal(await body("<main><pre><code>plain</code></pre></main>"), "```\nplain\n```");
  });

  it("turns the token-line <br> markup into real newlines", async () => {
    assert.equal(
      await body(
        '<main><pre class="language-bash"><code><span>a</span><br><span>b</span></code></pre></main>',
      ),
      "```bash\na\nb\n```",
    );
  });

  // Whitespace inside a fence is meaningful, and the surrounding pipeline
  // collapses runs of spaces. Regression guard for #665.
  it("preserves indentation that the prose pipeline would collapse", async () => {
    const html =
      '<main><pre class="language-yaml"><code><span>resources:</span><br>' +
      "<span>  limits:</span><br><span>    nvidia.com/gpu: 1</span></code></pre></main>";
    assert.equal(await body(html), "```yaml\nresources:\n  limits:\n    nvidia.com/gpu: 1\n```");
  });

  it("decodes entities inside code", async () => {
    assert.equal(
      await body(
        '<main><pre class="language-bash"><code>a &amp;&amp; b &lt;c&gt;</code></pre></main>',
      ),
      "```bash\na && b <c>\n```",
    );
  });

  // A three-backtick fence cannot contain a three-backtick run.
  it("widens the fence past any backtick run in the body", async () => {
    assert.equal(
      await body("<main><pre><code>echo ```x```</code></pre></main>"),
      "````\necho ```x```\n````",
    );
  });

  it("drops empty code blocks", async () => {
    assert.equal(await body("<main><pre><code></code></pre><p>after</p></main>"), "after");
  });

  // Parked blocks are keyed by index and restored by a `\d+` pattern, so the
  // tenth block onwards exercises multi-digit keys.
  it("restores more than ten parked blocks in order", async () => {
    const html = Array.from(
      { length: 12 },
      (_, i) => `<pre class="language-sh"><code>cmd${i}</code></pre>`,
    ).join("");
    const out = await body(`<main>${html}</main>`);
    assert.equal(
      out,
      Array.from({ length: 12 }, (_, i) => `\`\`\`sh\ncmd${i}\n\`\`\``).join("\n\n"),
    );
    assert.ok(!out.includes(String.fromCharCode(0)), "a parking marker leaked into the output");
  });

  it("keeps code blocks and tables in document order", async () => {
    assert.equal(
      await body(
        "<main><pre><code>A</code></pre><table><tr><th>H</th></tr><tr><td>c</td></tr></table>" +
          "<pre><code>B</code></pre></main>",
      ),
      "```\nA\n```\n\n| H |\n| --- |\n| c |\n\n```\nB\n```",
    );
  });

  // The H1-dedup pass runs while code blocks are parked, so a shell comment
  // that looks like a heading cannot be mistaken for the page heading.
  it("does not treat a comment inside a fence as the body heading", async () => {
    const markdown = await render(
      page('<pre class="language-bash"><code># Installation<br>helm install</code></pre>', {
        title: "Installation | HAMi",
      }),
    );
    assert.match(markdown, /# Installation\nhelm install/);
  });
});

describe("tables", () => {
  it("builds a header row and separator", async () => {
    assert.equal(
      await body(
        "<main><table><thead><tr><th>Flag</th><th>Default</th></tr></thead>" +
          "<tbody><tr><td>memory</td><td>0</td></tr></tbody></table></main>",
      ),
      "| Flag | Default |\n| --- | --- |\n| memory | 0 |",
    );
  });

  it("synthesizes an empty header when the table has none", async () => {
    assert.equal(
      await body("<main><table><tr><td>a</td><td>b</td></tr></table></main>"),
      "|  |  |\n| --- | --- |\n| a | b |",
    );
  });

  it("escapes pipes so cells cannot split the row", async () => {
    assert.equal(
      await body(
        "<main><table><tr><th>Syntax</th></tr><tr><td><code>a|b</code></td></tr></table></main>",
      ),
      "| Syntax |\n| --- |\n| `a\\|b` |",
    );
  });

  it("pads short rows to the widest row", async () => {
    assert.equal(
      await body(
        "<main><table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>1</td></tr></table></main>",
      ),
      "| A | B | C |\n| --- | --- | --- |\n| 1 |  |  |",
    );
  });

  it("converts inline formatting inside cells", async () => {
    assert.equal(
      await body(
        '<main><table><tr><th>Doc</th></tr><tr><td><a href="/d">Guide</a></td></tr></table></main>',
      ),
      "| Doc |\n| --- |\n| [Guide](/d) |",
    );
  });

  it("collapses newlines inside cells", async () => {
    assert.equal(
      await body("<main><table><tr><th>A</th></tr><tr><td>one\n  two</td></tr></table></main>"),
      "| A |\n| --- |\n| one two |",
    );
  });
});

describe("chrome removal", () => {
  // The SVG carries text, because Docusaurus icons ship a <title> for screen
  // readers. Without SVG-specific removal that text survives generic tag
  // stripping and lands in the output.
  it("strips scripts, styles and inline SVG", async () => {
    const html =
      "<main><script>var a=1;</script><style>.a{color:red}</style>" +
      "<svg><title>Icon</title><text>LOGO</text></svg><p>content</p></main>";
    assert.equal(await body(html), "content");
  });

  it("strips navigation and footers", async () => {
    assert.equal(
      await body("<main><nav>skip</nav><p>content</p><footer>legal</footer></main>"),
      "content",
    );
  });

  it("strips buttons", async () => {
    assert.equal(await body("<main><button>Copy</button><p>content</p></main>"), "content");
  });

  it("strips heading anchor links", async () => {
    assert.equal(
      await body('<main><h2>Setup<a class="hash-link" href="#setup">​</a></h2></main>'),
      "## Setup",
    );
  });

  it("strips the version badge", async () => {
    assert.equal(
      await body(
        '<main><span class="theme-doc-version-badge badge">Version: 2.6</span><p>content</p></main>',
      ),
      "content",
    );
  });

  // The table-of-contents container nests <div>s, so the first closing tag is
  // not the matching one.
  it("strips the table of contents including nested elements", async () => {
    const html =
      '<main><div class="theme-doc-toc"><div class="inner"><ul><li>Entry</li></ul></div></div><p>content</p></main>';
    assert.equal(await body(html), "content");
  });

  it("keeps content that follows a stripped container", async () => {
    const html = '<main><div class="tocCollapsible"><div>toc</div></div><h2>Real</h2></main>';
    assert.equal(await body(html), "## Real");
  });

  // If the container is never closed, the scan runs to the end of the document
  // and everything after it is dropped. Docusaurus emits balanced markup so this
  // does not happen in production, but the blast radius is the whole page, so
  // the behavior is pinned rather than left to chance.
  it("drops the remainder when a stripped container is never closed", async () => {
    const html = '<main><div class="theme-doc-toc"><div>toc</div><p>after</p></main>';
    assert.equal(await body(html), "");
  });
});

describe("HTML entities", () => {
  it("decodes named entities", async () => {
    assert.equal(await body("<main><p>a &amp; b &mdash; c &hellip;</p></main>"), "a & b — c …");
  });

  // Decoded as a plain space rather than U+00A0, so downstream Markdown tooling
  // never sees a non-breaking space. Decoding runs after the space-collapsing
  // pass, so the space it produces is not folded into the one beside it.
  it("decodes a non-breaking space to a plain space", async () => {
    assert.equal(await body("<main><p>c&nbsp;d</p></main>"), "c d");
    assert.equal(await body("<main><p>c &nbsp;d</p></main>"), "c  d");
  });

  it("decodes decimal and hexadecimal references", async () => {
    assert.equal(await body("<main><p>&#65; &#x42;</p></main>"), "A B");
  });

  // `&amp;lt;` is a literal `&lt;`, not a `<`.
  it("decodes in a single pass", async () => {
    assert.equal(await body("<main><p>&amp;lt;script&amp;gt;</p></main>"), "&lt;script&gt;");
  });

  it("leaves unknown entities alone", async () => {
    assert.equal(await body("<main><p>&nosuchentity;</p></main>"), "&nosuchentity;");
  });

  it("leaves out-of-range and surrogate code points alone", async () => {
    assert.equal(await body("<main><p>&#999999999; &#xD800;</p></main>"), "&#999999999; &#xD800;");
  });
});

describe("whitespace", () => {
  it("collapses blank runs and trims trailing spaces", async () => {
    assert.equal(await body("<main><p>one</p>\r\n\r\n\r\n<p>two   \n</p></main>"), "one\n\ntwo");
  });

  // A single trailing space mid-document survives the run-collapsing pass, so
  // this is what pins the dedicated end-of-line trim.
  it("trims a lone trailing space before a line break", async () => {
    assert.equal(
      await body("<main><p>alpha <br>beta</p><p>gamma</p></main>"),
      "alpha\nbeta\n\ngamma",
    );
  });

  it("ends the document with exactly one newline", async () => {
    const markdown = await render(page("<p>content</p>"));
    assert.ok(markdown.endsWith("content\n"), JSON.stringify(markdown.slice(-20)));
  });
});
