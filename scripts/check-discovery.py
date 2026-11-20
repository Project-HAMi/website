"""Check the published skill, robots rules, and sitemaps after a bilingual build."""

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree

BUILD = Path(__file__).resolve().parents[1] / "build"
SITE_URL = "https://project-hami.io"
SEARCH_PATHS = {"/search", "/zh/search"}
JSON_LD_SCRIPT = re.compile(r'<script\b[^>]*\btype="application/ld\+json"[^>]*>(.*?)</script>', re.S)


def check_skill():
    directory = BUILD / ".well-known/agent-skills"
    manifest = json.loads((directory / "index.json").read_text(encoding="utf-8"))
    skill = directory / "hami-docs/SKILL.md"
    url = f"{SITE_URL}/{skill.relative_to(BUILD).as_posix()}"
    digest = "sha256:" + hashlib.sha256(skill.read_bytes()).hexdigest()
    for entry in manifest["skills"]:
        if entry["name"] == "hami-docs" and entry["url"] == url and entry["digest"] == digest:
            return
    raise SystemExit(f"Missing or incorrect hami-docs entry in index.json: expected {url} with {digest}")


def check_sitemaps():
    robots = (BUILD / "robots.txt").read_text(encoding="utf-8")
    lines = robots.splitlines()
    groups = [block.splitlines() for block in robots.split("\n\n") if block.startswith("User-agent:")]
    for locale in ("", "zh/"):
        search = f"/{locale}search"
        sitemap = f"{locale}sitemap.xml"
        if f"Sitemap: {SITE_URL}/{sitemap}" not in lines:
            raise SystemExit(f"Missing {sitemap} declaration in robots.txt")
        if not groups or any(f"Disallow: {search}" not in group for group in groups):
            raise SystemExit(f"Missing robots.txt rule for {search}")
        if not (BUILD / locale / "search.html").is_file():
            raise SystemExit(f"Missing search page for {search}")

        entries = ElementTree.parse(BUILD / sitemap).findall(".//{*}loc")
        paths = {urlsplit(entry.text).path.rstrip("/") for entry in entries}
        if not paths:
            raise SystemExit(f"No URLs found in {sitemap}")
        if paths & SEARCH_PATHS:
            raise SystemExit(f"Search page listed in {sitemap}: {', '.join(sorted(paths & SEARCH_PATHS))}")
        about = f"/{locale}about"
        if not (BUILD / locale / "about.html").is_file() or about not in paths:
            raise SystemExit(f"Missing generated About page or sitemap entry for {about}")


def check_about_schema():
    for locale, language in (("", "en"), ("zh/", "zh-CN")):
        about = f"/{locale}about"
        html = (BUILD / locale / "about.html").read_text(encoding="utf-8")
        schemas = [json.loads(script) for script in JSON_LD_SCRIPT.findall(html)]
        about_pages = [schema for schema in schemas if schema.get("@type") == "AboutPage"]
        if len(about_pages) != 1:
            raise SystemExit(f"Expected one AboutPage schema on {about}")
        page = about_pages[0]
        if urlsplit(page["url"]).path != about or page.get("inLanguage") != language:
            raise SystemExit(f"Incorrect AboutPage URL or language on {about}")
        if page.get("about") != {"@id": f"{SITE_URL}/#organization"}:
            raise SystemExit(f"AboutPage does not reference the HAMi organization on {about}")


if __name__ == "__main__":
    check_skill()
    check_sitemaps()
    check_about_schema()
    print("Agent Skills, robots.txt, localized sitemaps, and AboutPage schema passed.")
