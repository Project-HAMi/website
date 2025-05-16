#!/usr/bin/env node
/**
 * Script to fetch release information from GitHub and update changelog files
 * Usage: node fetch-changelog.js <version>
 * Example: node fetch-changelog.js 2.6.0
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");
const foundContributors = new Map();
const version = process.argv[2];
if (!version) {
  console.error(
    "Please provide the version number: npm run fetch-changelog 2.5.1"
  );
  process.exit(1);
}
const versionWithPrefix = `v${version}`;
const GITHUB_API_URL = `https://api.github.com/repos/Project-HAMi/HAMi/releases/tags/${versionWithPrefix}`;
const GITHUB_URL = `https://github.com/Project-HAMi/HAMi/releases/tag/${versionWithPrefix}`;
const githubToken = process.env.GH_PAT || "";
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
};
function formatGitHubMarkdown(text) {
  if (!text) return text;
  let formatted = text;
  formatted = formatted.replace(
    /\[\[@([a-zA-Z0-9-_]+)\]\(https:\/\/github\.com\/[a-zA-Z0-9-_]+\)\]\(https:\/\/github\.com\/[a-zA-Z0-9-_]+\)/g,
    (match, username) => {
      foundContributors.set(username, { name: username, username: username });
      return `[@${username}](https://github.com/${username})`;
    }
  );
  formatted = formatted.replace(
    /by\s+\[\([@a-zA-Z0-9-_]+\]\(https:\/\/github\.com\/[a-zA-Z0-9-_]+\)\)\]/g,
    (match) => {
      const usernameMatch = match.match(/\[@([a-zA-Z0-9-_]+)\]/);
      if (usernameMatch && usernameMatch[1]) {
        foundContributors.set(usernameMatch[1], {
          name: usernameMatch[1],
          username: usernameMatch[1],
        });
      }
      return match.replace("[", "").replace("]", "");
    }
  );
  formatted = formatted.replace(
    /by\s+\[\(@([a-zA-Z0-9-_]+)\)\]/g,
    (match, username) => {
      foundContributors.set(username, { name: username, username: username });
      return `by ([@${username}](https://github.com/${username}))`;
    }
  );
  formatted = formatted.replace(
    /(?<!\[)@([a-zA-Z0-9-_]+)(?!\])/g,
    (match, username) => {
      foundContributors.set(username, { name: username, username: username });
      return `[@${username}](https://github.com/${username})`;
    }
  );
  formatted = formatted.replace(/(?<!\[)#(\d+)(?!\])/g, (match, number) => {
    return `[#${number}](https://github.com/Project-HAMi/HAMi/pull/${number})`;
  });
  formatted = formatted.replace(/in (?<!\[)#(\d+)(?!\])/g, (match, number) => {
    return `in [#${number}](https://github.com/Project-HAMi/HAMi/pull/${number})`;
  });
  formatted = formatted.replace(/(?<!\[)GH-(\d+)(?!\])/g, (match, number) => {
    return `[GH-${number}](https://github.com/Project-HAMi/HAMi/issues/${number})`;
  });
  formatted = formatted.replace(
    /by\s+\[@([a-zA-Z0-9-_]+)\]\(https:\/\/github\.com\/([a-zA-Z0-9-_]+)\)(?!\))/g,
    (match, username, repo) => {
      if (username === repo) {
        foundContributors.set(username, { name: username, username: username });
        return `by ([@${username}](https://github.com/${username}))`;
      }
      return match;
    }
  );
  const standardPattern =
    /\(\[@([a-zA-Z0-9-_]+)\]\(https:\/\/github\.com\/[a-zA-Z0-9-_]+\)\)/g;
  let standardMatch;
  while ((standardMatch = standardPattern.exec(formatted)) !== null) {
    const username = standardMatch[1];
    foundContributors.set(username, { name: username, username: username });
  }
  const linePattern =
    /\*\s+(.*?)by\s+(?:\()?(?:\[@([a-zA-Z0-9-_]+)\]\(https:\/\/github\.com\/[a-zA-Z0-9-_]+\)(?:\)))?\s+in\s+\[#\d+\]/g;
  let lineMatch;
  while ((lineMatch = linePattern.exec(formatted)) !== null) {
    if (lineMatch[2]) {
      const username = lineMatch[2].trim();
      foundContributors.set(username, { name: username, username: username });
    }
  }
  const simplePattern = /@([a-zA-Z0-9-_]+)\s+in\s+\[#\d+\]/g;
  let simpleMatch;
  while ((simpleMatch = simplePattern.exec(formatted)) !== null) {
    const username = simpleMatch[1].trim();
    foundContributors.set(username, { name: username, username: username });
  }
  return formatted;
}
function getFoundContributors() {
  return Array.from(foundContributors.values());
}
function clearFoundContributors() {
  foundContributors.clear();
}
function fetchReleaseInfo() {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "HAMi-Changelog-Generator",
      Accept: "application/vnd.github.v3+json",
    };
    if (githubToken) {
      headers["Authorization"] = `token ${githubToken}`;
    }
    const options = {
      headers: headers,
      timeout: 10000,
    };
    console.log(`Accessing GitHub API...`);
    const req = https.get(GITHUB_API_URL, options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        https.get(res.headers.location, options, handleResponse);
        return;
      }
      handleResponse(res);
      function handleResponse(response) {
        if (response.statusCode !== 200) {
          fetchFromWebPage().then(resolve).catch(reject);
          return;
        }
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          try {
            const releaseInfo = JSON.parse(data);
            if (!releaseInfo.body || releaseInfo.body.trim() === "") {
              fetchFromWebPage().then(resolve).catch(reject);
              return;
            }
            resolve(releaseInfo);
          } catch (error) {
            console.error(
              `Failed to parse API response, trying to fetch from web page...`
            );
            fetchFromWebPage().then(resolve).catch(reject);
          }
        });
      }
    });
    req.on("error", (error) => {
      console.error(`Request API failed, trying to fetch from web page...`);
      fetchFromWebPage().then(resolve).catch(reject);
    });
    req.on("timeout", () => {
      req.destroy();
      console.error("Request timeout, trying to fetch from web page...");
      fetchFromWebPage().then(resolve).catch(reject);
    });
  });
}
function fetchFromWebPage() {
  return new Promise((resolve, reject) => {
    try {
      let curlCmd = `curl -s "${GITHUB_URL}"`;
      if (githubToken) {
        curlCmd = `curl -s -H "Authorization: token ${githubToken}" "${GITHUB_URL}"`;
      }
      let content = "";
      try {
        content = execSync(curlCmd).toString();
      } catch (error) {
        reject(new Error(`Failed to fetch web page content: ${error.message}`));
        return;
      }
      const releaseDate = new Date();
      const bodyRegex = /<div class="markdown-body my-3">([\s\S]*?)<\/div>/;
      const bodyMatch = content.match(bodyRegex);
      let body = "";
      if (bodyMatch && bodyMatch[1]) {
        body = bodyMatch[1]
          .replace(/<\/?[^>]+(>|$)/g, "") // Remove HTML tags
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&");
      } else {
        body = `#### :rocket: Major features\n\n- Please manually fill in the major features\n\n#### :bug: Major bug fixes\n\n- Please manually fill in the major fixes\n\n#### :memo: What's Changed\n\n##### ⬆️ Dependencies\n\n- Please manually fill in the dependency updates\n\n##### 🔨 Other Changes\n\n- Please manually fill in the other changes\n\n#### Committers: Contributors\n\n- Please manually fill in the contributor information\n\n**Full Changelog**: https://github.com/Project-HAMi/HAMi/compare/v${getPreviousVersion(
          version
        )}...${versionWithPrefix}`;
      }
      resolve({
        published_at: releaseDate.toISOString(),
        body: body,
      });
    } catch (error) {
      reject(
        new Error(`Failed to fetch release information: ${error.message}`)
      );
    }
  });
}
async function updateAuthorsJson(contributors) {
  const authorsPath = path.join(
    process.cwd(),
    "changelog",
    "source",
    "authors.json"
  );
  try {
    const authorsContent = fs.readFileSync(authorsPath, "utf8");
    const authors = JSON.parse(authorsContent);
    let updated = false;
    for (const contributor of contributors) {
      if (!authors[contributor.username]) {
        authors[contributor.username] = {
          alias: contributor.username,
          name: contributor.username,
          url: `https://github.com/${contributor.username}`,
          imageURL: `https://github.com/${contributor.username}.png`,
        };
        updated = true;
      }
    }
    if (updated) {
      fs.writeFileSync(authorsPath, JSON.stringify(authors, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Failed to update authors.json file:", error);
    throw error;
  }
}
function createVersionChangelog(releaseInfo, contributors) {
  const releaseDate = formatDate(releaseInfo.published_at || new Date());
  const contributorUsernames = contributors
    .map((c) => `'${c.username}'`)
    .join("\n  - ");
  const body = releaseInfo.body || "";
  let majorFeatures =
    extractSection(body, "#### :rocket: Major features", "####") ||
    extractSection(body, "## :rocket: Major features", "##");
  let majorBugFixes =
    extractSection(body, "#### :bug: Major bug fixes", "####") ||
    extractSection(body, "## :bug: Major bug fixes", "##");
  let changes =
    extractSection(body, "#### :memo: What's Changed", "###") ||
    extractSection(body, "## :memo: What's Changed", "##") ||
    extractSection(body, "## What's Changed", "##");
  if (!changes && body.includes("## What's Changed")) {
    const fullChangesMatch = body.match(
      /## What's Changed([\s\S]*?)(?:\*\*Full Changelog\*\*|$)/
    );
    if (fullChangesMatch && fullChangesMatch[1]) {
      changes = fullChangesMatch[1].trim();
      changes = formatGitHubMarkdown(changes);
    }
    if (changes && changes.includes("fix") && !majorBugFixes) {
      const fixLines = changes
        .split("\n")
        .filter(
          (line) => line.toLowerCase().includes("fix") && line.includes("* ")
        )
        .map((line) => line.replace(/^\* /, "- "));
      if (fixLines.length > 0) {
        majorBugFixes = fixLines.join("\n");
      }
    }
  }
  if (changes) {
    changes = formatGitHubMarkdown(changes);
  }
  if (majorFeatures) {
    majorFeatures = formatGitHubMarkdown(majorFeatures);
  }
  if (majorBugFixes) {
    majorBugFixes = formatGitHubMarkdown(majorBugFixes);
  }
  let contributorsSection = "";
  if (contributors.length > 0) {
    contributorsSection = `## Committers: Contributors
${contributors
  .map(
    (c) =>
      `- ${c.name || c.username} ([@${c.username}](https://github.com/${
        c.username
      }))`
  )
  .join("\n")}`;
  } else {
    contributorsSection = `## Committers
Thanks to all contributors who participated in this version. Please check the [GitHub commit history](https://github.com/Project-HAMi/HAMi/commits/${versionWithPrefix}).`;
  }
  const changelogContent = `---
mdx:
 format: md
date: ${releaseDate}T20:00
authors:
  - ${contributorUsernames || "project-team"}
---
# ${versionWithPrefix}
<!-- truncate -->
## :rocket: Major features
${majorFeatures || "- No major features in this release."}
## :bug: Major bug fixes:
${majorBugFixes || "- No major bug fixes in this release."}
## :memo: What's Changed
${changes || ""}
${contributorsSection}
**Full Changelog**: https://github.com/Project-HAMi/HAMi/compare/v${getPreviousVersion(
    version
  )}...${versionWithPrefix}
`;
  const changelogPath = path.join(
    process.cwd(),
    "changelog",
    "source",
    `${versionWithPrefix}.md`
  );
  fs.writeFileSync(changelogPath, changelogContent, "utf8");
  console.log(`Created ${versionWithPrefix}.md file`);
  updateMainChangelog(releaseInfo, contributors);
}
function updateMainChangelog(releaseInfo, contributors) {
  const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
  let changelogContent = "";
  try {
    changelogContent = fs.readFileSync(changelogPath, "utf8");
    if (changelogContent.includes(`## ${versionWithPrefix} (`)) {
      const versionPattern = new RegExp(
        `## ${versionWithPrefix} \\([^)]+\\)[\\s\\S]*?(?=## |# |$)`,
        "g"
      );
      changelogContent = changelogContent.replace(versionPattern, "");
      changelogContent = changelogContent.replace(/\n{3,}/g, "\n\n");
    }
  } catch (error) {
    console.error(`Failed to read CHANGELOG.md: ${error.message}`);
    changelogContent = "# Changelog\n\n";
  }
  const releaseDate = formatDate(releaseInfo.published_at || new Date());
  const body = releaseInfo.body || "";
  let majorFeatures =
    extractSection(body, "#### :rocket: Major features", "####") ||
    extractSection(body, "## :rocket: Major features", "##");
  let majorBugFixes =
    extractSection(body, "#### :bug: Major bug fixes", "####") ||
    extractSection(body, "## :bug: Major bug fixes", "##");
  let changes =
    extractSection(body, "#### :memo: What's Changed", "###") ||
    extractSection(body, "## :memo: What's Changed", "##") ||
    extractSection(body, "## What's Changed", "##");
  if (!changes && body.includes("## What's Changed")) {
    const fullChangesMatch = body.match(
      /## What's Changed([\s\S]*?)(?:\*\*Full Changelog\*\*|$)/
    );
    if (fullChangesMatch && fullChangesMatch[1]) {
      changes = fullChangesMatch[1].trim();
      changes = formatGitHubMarkdown(changes);
    }
    if (changes && changes.includes("fix") && !majorBugFixes) {
      const fixLines = changes
        .split("\n")
        .filter(
          (line) => line.toLowerCase().includes("fix") && line.includes("* ")
        )
        .map((line) => line.replace(/^\* /, "- "));
      if (fixLines.length > 0) {
        majorBugFixes = fixLines.join("\n");
      }
    }
  }
  if (changes) {
    changes = formatGitHubMarkdown(changes);
  }
  if (majorFeatures) {
    majorFeatures = formatGitHubMarkdown(majorFeatures);
  }
  if (majorBugFixes) {
    majorBugFixes = formatGitHubMarkdown(majorBugFixes);
  }
  let contributorsSection = "";
  if (contributors.length > 0) {
    contributorsSection = `#### Committers: Contributors
${contributors
  .map(
    (c) =>
      `- ${c.name || c.username} ([@${c.username}](https://github.com/${
        c.username
      }))`
  )
  .join("\n")}`;
  } else {
    contributorsSection = `#### Committers
Thanks to all contributors who participated in this version. Please check the [GitHub commit history](https://github.com/Project-HAMi/HAMi/commits/${versionWithPrefix}).`;
  }
  const newVersionContent = `## ${versionWithPrefix} (${releaseDate})
#### :rocket: Major features
${majorFeatures || "- No major features in this release."}
#### :bug: Major bug fixes:
${majorBugFixes || "- No major bug fixes in this release."}
#### :memo: What's Changed
${changes || ""}
${contributorsSection}
**Full Changelog**: https://github.com/Project-HAMi/HAMi/compare/v${getPreviousVersion(
    version
  )}...${versionWithPrefix}`;
  let updatedContent = "";
  if (changelogContent.includes("# Docusaurus Changelog")) {
    updatedContent = changelogContent.replace(
      "# Docusaurus Changelog\n\n",
      `# Docusaurus Changelog\n\n${newVersionContent}\n\n`
    );
  } else if (changelogContent.includes("# Changelog")) {
    updatedContent = changelogContent.replace(
      "# Changelog\n\n",
      `# Changelog\n\n${newVersionContent}\n\n`
    );
  } else {
    updatedContent = `# Changelog\n\n${newVersionContent}\n\n${changelogContent}`;
  }
  fs.writeFileSync(changelogPath, updatedContent, "utf8");
  console.log(`Updated CHANGELOG.md file`);
}
function extractSection(text, startMarker, endMarker) {
  if (!text) return null;
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) {
    const altStartMarkers = ["### What's Changed", "## What's Changed"];
    for (const altMarker of altStartMarkers) {
      if (startMarker.includes("What's Changed") && text.includes(altMarker)) {
        return extractSection(text, altMarker, endMarker);
      }
    }
    return null;
  }
  let endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1) {
    const possibleEndMarkers = [
      "**Full Changelog**",
      "## Committers:",
      "### Committers:",
    ];
    for (const possibleEndMarker of possibleEndMarkers) {
      const idx = text.indexOf(
        possibleEndMarker,
        startIndex + startMarker.length
      );
      if (idx !== -1) {
        endIndex = idx;
        break;
      }
    }
    if (endIndex === -1) {
      endIndex = text.length;
    }
  }
  return text.substring(startIndex + startMarker.length, endIndex).trim();
}
function getPreviousVersion(version) {
  const parts = version.split(".");
  if (parts.length < 3) {
    return "1.0.0";
  }
  const major = parseInt(parts[0]);
  const minor = parseInt(parts[1]);
  const patch = parseInt(parts[2]);
  let previousVersion;
  if (patch > 0) {
    previousVersion = `${major}.${minor}.${patch - 1}`;
  } else if (minor > 0) {
    previousVersion = `${major}.${minor - 1}.0`;
  } else if (major > 1) {
    previousVersion = `${major - 1}.0.0`;
  } else {
    previousVersion = "1.0.0";
  }
  return previousVersion;
}
async function main() {
  try {
    console.log(`Fetching ${versionWithPrefix} version information...`);
    clearFoundContributors();
    const releaseInfo = await fetchReleaseInfo();
    if (!releaseInfo || !releaseInfo.body) {
      console.error(
        "No release information found, please manually edit the generated file"
      );
      process.exit(1);
    }
    console.log("Processing release information...");
    releaseInfo.body = formatGitHubMarkdown(releaseInfo.body);
    let majorFeatures =
      extractSection(
        releaseInfo.body,
        "#### :rocket: Major features",
        "####"
      ) || extractSection(releaseInfo.body, "## :rocket: Major features", "##");
    if (majorFeatures) formatGitHubMarkdown(majorFeatures);
    let majorBugFixes =
      extractSection(releaseInfo.body, "#### :bug: Major bug fixes", "####") ||
      extractSection(releaseInfo.body, "## :bug: Major bug fixes", "##");
    if (majorBugFixes) formatGitHubMarkdown(majorBugFixes);
    let changes =
      extractSection(releaseInfo.body, "#### :memo: What's Changed", "###") ||
      extractSection(releaseInfo.body, "## :memo: What's Changed", "##") ||
      extractSection(releaseInfo.body, "## What's Changed", "##");
    if (changes) formatGitHubMarkdown(changes);
    const contributors = getFoundContributors();
    console.log(`Found ${contributors.length} contributors`);
    if (contributors.length === 0 && releaseInfo.body) {
      const prPattern =
        /\[#(\d+)\]\(https:\/\/github\.com\/Project-HAMi\/HAMi\/pull\/\d+\)/g;
      const prNumbers = [];
      let prMatch;
      while ((prMatch = prPattern.exec(releaseInfo.body)) !== null) {
        prNumbers.push(prMatch[1]);
      }
      if (prNumbers.length > 0) {
        console.warn(
          `Detected ${prNumbers.length} PR references, but unable to directly extract contributors.`
        );
        console.warn(
          `Please check the release note format, ensure it includes contributor information, or use a GitHub Token for more detailed information.`
        );
      }
    }
    await updateAuthorsJson(contributors);
    createVersionChangelog(releaseInfo, contributors);
    console.log(
      `✅ Successfully updated ${versionWithPrefix} version changelog file`
    );
  } catch (error) {
    console.error("Failed to update changelog:", error);
    process.exit(1);
  }
}
main();
