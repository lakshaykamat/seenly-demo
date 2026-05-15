"""
Crawl pipeline step — discover pages, extract content, compute AEO checks.

Flow:
  1. Discover URLs (sitemap → homepage fallback)
  2. Fetch each page (HTTP → JS render fallback)
  3. Extract structured content (H1, H2s, FAQ, schema, links)
  4. Score each page on 5 AEO checks (0-100)
  5. Write crawl_pages rows to DB
"""

import hashlib
import json
import logging
import re
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from config import CRAWL, PLAN_LIMITS
from db import insert_crawl_pages
from pipeline.helpers import get_target_domain

logger = logging.getLogger("crawl")

# URLs matching these patterns are skipped during page selection
_SKIP_PATTERNS = re.compile(
    r"(/blog/|/careers|/jobs|/privacy|/terms|/legal|/cookie|"
    r"/login|/signin|/signup|/register|/cart|/checkout|"
    r"/tag/|/category/|/author/|/page/\d|/wp-admin|\?)",
    re.IGNORECASE,
)

# Paths that indicate high-value business pages
_PREFER_PATHS = re.compile(
    r"^/$|/about|/services|/products|/solutions|/pricing|"
    r"/features|/platform|/contact|/integrations|/enterprise|/how-it-works|"
    r"/use-cases|/case-studies|/customers|/why-us|/technology|/capabilities|"
    r"/industries|/overview|/tour|/demo|/compare|/vs",
    re.IGNORECASE,
)

# Cloudflare / bot-challenge markers in response bodies
_BLOCK_MARKERS = [
    "cf-browser-verification",
    "challenge-platform",
    "just a moment",
    "attention required",
    "access denied",
]


# ── Public API ──────────────────────────────────────────────


def crawl_site(run: dict) -> list[dict]:
    """
    Crawl the target site for a run. Reads domain from the linked project
    or from run.config. Returns list of crawl-page dicts (also written to DB).
    """
    run_id = run["id"]
    config = run.get("config") or {}
    plan = config.get("plan_at_run_time", "starter")
    crawl_limit = config.get("crawl_limit", PLAN_LIMITS[plan]["crawl_pages"])

    raw_domain = get_target_domain(run)
    domain = _normalize_domain(raw_domain) if raw_domain else ""
    if not domain:
        logger.warning("[%s] No domain found — skipping crawl", run_id)
        return []

    logger.info("[%s] Crawling  domain=%s limit=%d", run_id, domain, crawl_limit)

    # 1. Discover candidate URLs
    urls = _discover_pages(domain, crawl_limit)
    logger.info("[%s] URLs discovered  count=%d", run_id, len(urls))

    # First pass: fetch all pages via HTTP
    pages: list[dict] = []
    seen_hashes: set[str] = set()
    thin_urls: list[str] = []  # pages that need JS render

    for url in urls:
        page = _process_page(url, domain, js_browser=None)
        if page.get("_needs_js"):
            thin_urls.append(url)
            continue  # will retry with JS below

        content_hash = page.get("_content_hash")
        if content_hash and content_hash in seen_hashes:
            logger.debug("[%s] Duplicate content at %s, skipping", run_id, url)
            continue
        if content_hash:
            seen_hashes.add(content_hash)
        page["run_id"] = run_id
        pages.append(page)

    # Second pass: render thin pages with a single shared browser
    if thin_urls:
        for page in _render_with_js(thin_urls, domain, run_id):

            content_hash = page.get("_content_hash")
            if content_hash and content_hash in seen_hashes:
                continue
            if content_hash:
                seen_hashes.add(content_hash)
            page["run_id"] = run_id
            pages.append(page)

    # 5. Write to DB (strip temp fields prefixed with _)
    if pages:
        db_rows = [
            {k: v for k, v in p.items() if not k.startswith("_")}
            for p in pages
        ]
        insert_crawl_pages(db_rows)
        ok = sum(1 for p in pages if p.get("crawl_status") == "ok")
        partial = sum(1 for p in pages if p.get("crawl_status") == "partial")
        blocked = sum(1 for p in pages if p.get("crawl_status") == "blocked")
        logger.info(
            "[%s] Crawl saved  total=%d ok=%d partial=%d blocked=%d",
            run_id, len(pages), ok, partial, blocked,
        )

    return pages


# ── Domain normalization ────────────────────────────────────


def _normalize_domain(domain: str) -> str:
    """Strip protocol, trailing slashes, www prefix."""
    domain = domain.strip().lower()
    domain = re.sub(r"^https?://", "", domain)
    domain = domain.rstrip("/")
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


# ── Page discovery ──────────────────────────────────────────


def _discover_pages(domain: str, limit: int) -> list[str]:
    """
    Discover pages to crawl using multiple strategies:
    1. sitemap.xml (or sitemap found via robots.txt)
    2. Homepage link extraction
    3. Depth-2: extract links from each preferred page found in step 2

    Always ensures homepage is included.
    """
    base_url = f"https://{domain}"
    homepage = f"{base_url}/"

    # Strategy 1: sitemap (tries standard paths + robots.txt)
    urls = _try_sitemap(base_url) or _try_sitemap_from_robots(base_url)

    # Strategy 2: homepage link extraction
    if not urls:
        urls = _extract_links(base_url, domain)

    # Ensure homepage is always present
    if base_url not in urls and homepage not in urls:
        urls.insert(0, homepage)

    # Strategy 3: depth-2 — also extract links from preferred pages found so far
    # This finds pages like /services/automation that aren't linked from homepage nav
    preferred_so_far = [u for u in urls if _PREFER_PATHS.search(urlparse(u).path)]
    seen = set(urls)
    for url in preferred_so_far[:5]:  # limit to 5 seed pages for depth-2
        for link in _extract_links(url, domain):
            if link not in seen:
                seen.add(link)
                urls.append(link)

    return _select_pages(urls, limit)


def _try_sitemap(base_url: str) -> list[str]:
    """Attempt to fetch sitemap from standard paths."""
    for path in ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"]:
        try:
            resp = httpx.get(
                f"{base_url}{path}",
                timeout=CRAWL["request_timeout"],
                follow_redirects=True,
                headers={"User-Agent": CRAWL["user_agent"]},
            )
            if resp.status_code == 200 and "xml" in resp.headers.get("content-type", ""):
                return _parse_sitemap(resp.text, base_url)
        except httpx.HTTPError:
            continue
    return []


def _try_sitemap_from_robots(base_url: str) -> list[str]:
    """Parse robots.txt to find a Sitemap: directive, then fetch it."""
    try:
        resp = httpx.get(
            f"{base_url}/robots.txt",
            timeout=CRAWL["request_timeout"],
            follow_redirects=True,
            headers={"User-Agent": CRAWL["user_agent"]},
        )
        if resp.status_code != 200:
            return []
        for line in resp.text.splitlines():
            if line.lower().startswith("sitemap:"):
                sitemap_url = line.split(":", 1)[1].strip()
                try:
                    sresp = httpx.get(
                        sitemap_url,
                        timeout=CRAWL["request_timeout"],
                        follow_redirects=True,
                        headers={"User-Agent": CRAWL["user_agent"]},
                    )
                    if sresp.status_code == 200:
                        return _parse_sitemap(sresp.text, base_url)
                except httpx.HTTPError:
                    pass
    except httpx.HTTPError:
        pass
    return []


def _parse_sitemap(xml_text: str, base_url: str) -> list[str]:
    """Extract URLs from a sitemap XML. Handles sitemap index too."""
    urls: list[str] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return []

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    # Check if this is a sitemap index
    sitemaps = root.findall(".//sm:sitemap/sm:loc", ns)
    if sitemaps:
        # Recursively fetch child sitemaps (max 3 to avoid abuse)
        for sitemap_el in sitemaps[:3]:
            if sitemap_el.text:
                try:
                    resp = httpx.get(
                        sitemap_el.text.strip(),
                        timeout=CRAWL["request_timeout"],
                        follow_redirects=True,
                        headers={"User-Agent": CRAWL["user_agent"]},
                    )
                    if resp.status_code == 200:
                        urls.extend(_parse_sitemap(resp.text, base_url))
                except httpx.HTTPError:
                    continue
        return urls

    # Regular sitemap — extract <loc> elements
    for loc in root.findall(".//sm:url/sm:loc", ns):
        if loc.text:
            urls.append(loc.text.strip())

    return urls


def _extract_links(url: str, domain: str) -> list[str]:
    """Fetch a page and extract all internal links on the same domain."""
    try:
        resp = httpx.get(
            url,
            timeout=CRAWL["request_timeout"],
            follow_redirects=True,
            headers={"User-Agent": CRAWL["user_agent"]},
        )
        if resp.status_code != 200:
            return []
    except httpx.HTTPError:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    seen: set[str] = set()
    urls: list[str] = []
    for a in soup.find_all("a", href=True):
        full_url = urljoin(url, a["href"])
        parsed = urlparse(full_url)
        if parsed.netloc.lower().removeprefix("www.") == domain and parsed.scheme in ("http", "https"):
            clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            if clean not in seen:
                seen.add(clean)
                urls.append(clean)

    return urls


def _select_pages(urls: list[str], limit: int) -> list[str]:
    """Filter out non-business pages and pick the top N."""
    # Separate preferred and other
    preferred: list[str] = []
    others: list[str] = []

    for url in urls:
        path = urlparse(url).path
        if _SKIP_PATTERNS.search(path):
            continue
        if _PREFER_PATHS.search(path):
            preferred.append(url)
        else:
            others.append(url)

    # Preferred first, then others, capped at limit
    selected = preferred + others
    return selected[:limit]


# ── Page processing ─────────────────────────────────────────


def _process_page(url: str, domain: str, js_browser=None) -> dict:
    """
    Fetch a single page, extract content, compute scores.

    If js_browser is None and the page has thin content, sets _needs_js=True
    so the caller can batch JS rendering. If js_browser is provided, uses it
    directly without an HTTP attempt.
    """
    if js_browser is not None:
        html = _fetch_page_with_browser(js_browser, url)
        status = "ok" if html else "unreachable"
        method = "js_render"
    else:
        html, status, method = _fetch_page(url)

    if status in ("blocked", "unreachable"):
        return {
            "url": url,
            "crawl_status": status,
            "confidence": 0,
            "extraction_method": method,
            "text_length": 0,
            "h1": None,
            "h2s": None,
            "has_faq": False,
            "has_schema": False,
            "schema_types": None,
            "internal_link_count": 0,
            "page_quality_score": None,
            "raw_html": None,
            "_content_hash": None,
            "_needs_js": False,
        }

    extracted = _extract_content(html, url, domain)
    text_len = extracted["text_length"]

    # Signal that this page needs JS rendering (only on HTTP pass, not JS pass)
    if js_browser is None and text_len < CRAWL["thin_content_threshold"]:
        return {"url": url, "_needs_js": True}

    crawl_status = "partial" if (status == "ok" and text_len < 200) else status
    quality = _compute_page_quality(extracted)
    confidence = _compute_confidence(text_len, method, crawl_status)

    h1 = extracted.get("h1") or ""
    url_path = urlparse(url).path
    content_hash = hashlib.md5(f"{h1}{text_len}{url_path}".encode()).hexdigest()

    return {
        "url": url,
        "crawl_status": crawl_status,
        "confidence": confidence,
        "extraction_method": method,
        "text_length": text_len,
        "h1": extracted["h1"],
        "h2s": extracted["h2s"] or None,
        "has_faq": extracted["has_faq"],
        "has_schema": extracted["has_schema"],
        "schema_types": extracted["schema_types"] or None,
        "internal_link_count": extracted["internal_link_count"],
        "page_quality_score": quality,
        "raw_html": html,
        "_content_hash": content_hash,
        "_extracted_text": extracted["text"],
        "_needs_js": False,
    }


def _fetch_page(url: str) -> tuple[str, str, str]:
    """
    Fetch a page. Returns (html, crawl_status, extraction_method).

    Fast path: HTTP GET.
    Fallback: Playwright JS render if content is thin.
    """
    try:
        resp = httpx.get(
            url,
            timeout=CRAWL["request_timeout"],
            follow_redirects=True,
            headers={"User-Agent": CRAWL["user_agent"]},
        )
    except httpx.TimeoutException:
        return "", "unreachable", "html"
    except httpx.HTTPError:
        return "", "unreachable", "html"

    # Check for blocked responses
    if resp.status_code in (401, 403, 429):
        return "", "blocked", "html"

    if resp.status_code >= 400:
        return "", "unreachable", "html"

    body = resp.text

    # Check for bot challenge pages
    body_lower = body.lower()
    for marker in _BLOCK_MARKERS:
        if marker in body_lower:
            return "", "blocked", "html"

    return body, "ok", "html"


def _render_with_js(urls: list[str], domain: str, run_id: str) -> list[dict]:
    """
    Render multiple thin pages with a single shared Playwright browser.
    Faster than launching a new browser per page.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        logger.debug("[%s] Playwright not available — skipping JS render", run_id)
        return []

    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for url in urls:
                page_dict = _process_page(url, domain, js_browser=browser)
                results.append(page_dict)
            browser.close()
    except Exception as e:
        logger.warning("[%s] JS render batch failed: %s", run_id, e)

    return results


def _fetch_page_with_browser(browser, url: str) -> str | None:
    """Fetch a single URL using an already-open Playwright browser."""
    try:
        page = browser.new_page(user_agent=CRAWL["user_agent"])
        page.goto(url, timeout=CRAWL["request_timeout"] * 1000, wait_until="networkidle")
        html = page.content()
        page.close()
        return html
    except Exception as e:
        logger.debug("JS render failed for %s: %s", url, e)
        return None


# ── Content extraction ──────────────────────────────────────


def _extract_content(html: str, url: str, domain: str) -> dict:
    """Parse HTML and extract structured content."""
    soup = BeautifulSoup(html, "lxml")

    # Remove noise — scripts, styles, and navigation chrome
    for tag in soup.find_all(["script", "style", "noscript", "nav", "header", "footer"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)

    # H1
    h1_tag = soup.find("h1")
    h1 = h1_tag.get_text(strip=True) if h1_tag else None

    # H2s
    h2s = [h2.get_text(strip=True) for h2 in soup.find_all("h2")]

    # Meta description / og:description — strong business signal
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"].strip()

    # FAQ detection
    has_faq = _detect_faq(soup)

    # JSON-LD schema
    schema_types = _extract_schema_types(soup)

    # Internal links
    internal_links = _count_internal_links(soup, url, domain)

    # Prepend meta description to text so it's available to LLM
    full_text = f"{meta_desc}\n\n{text}".strip() if meta_desc else text

    return {
        "text": full_text,
        "text_length": len(full_text),
        "h1": h1,
        "h2s": h2s,
        "has_faq": has_faq,
        "has_schema": len(schema_types) > 0,
        "schema_types": schema_types,
        "internal_link_count": internal_links,
    }


def _detect_faq(soup: BeautifulSoup) -> bool:
    """Check for FAQ sections via <details>, schema, or heading patterns."""
    # Method 1: <details> elements (accordion FAQ pattern)
    if soup.find("details"):
        return True

    # Method 2: FAQPage schema
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            if _schema_has_type(data, "FAQPage"):
                return True
        except (json.JSONDecodeError, TypeError):
            continue

    # Method 3: Heading contains "FAQ" or "Frequently Asked"
    for heading in soup.find_all(["h2", "h3", "h4"]):
        heading_text = heading.get_text(strip=True).lower()
        if "faq" in heading_text or "frequently asked" in heading_text:
            return True

    return False


def _schema_has_type(data, target_type: str) -> bool:
    """Recursively check if JSON-LD data contains a specific @type."""
    if isinstance(data, dict):
        schema_type = data.get("@type", "")
        if isinstance(schema_type, list):
            if target_type in schema_type:
                return True
        elif schema_type == target_type:
            return True
        # Check @graph
        for val in data.values():
            if _schema_has_type(val, target_type):
                return True
    elif isinstance(data, list):
        for item in data:
            if _schema_has_type(item, target_type):
                return True
    return False


def _extract_schema_types(soup: BeautifulSoup) -> list[str]:
    """Extract all @type values from JSON-LD script tags."""
    types: list[str] = []
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "")
            _collect_types(data, types)
        except (json.JSONDecodeError, TypeError):
            continue
    # Deduplicate preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for t in types:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    return unique


def _collect_types(data, types: list[str]):
    """Recursively collect @type values from JSON-LD."""
    if isinstance(data, dict):
        t = data.get("@type")
        if isinstance(t, str):
            types.append(t)
        elif isinstance(t, list):
            types.extend(t)
        for val in data.values():
            _collect_types(val, types)
    elif isinstance(data, list):
        for item in data:
            _collect_types(item, types)


def _count_internal_links(soup: BeautifulSoup, page_url: str, domain: str) -> int:
    """Count unique internal links (same domain, not self-referencing)."""
    page_parsed = urlparse(page_url)
    seen: set[str] = set()
    count = 0

    for a in soup.find_all("a", href=True):
        href = a["href"]
        full_url = urljoin(page_url, href)
        parsed = urlparse(full_url)
        link_domain = parsed.netloc.lower().removeprefix("www.")

        if link_domain != domain:
            continue

        clean_path = parsed.path.rstrip("/")
        page_path = page_parsed.path.rstrip("/")
        if clean_path == page_path:
            continue

        if clean_path not in seen:
            seen.add(clean_path)
            count += 1

    return count


# ── AEO quality scoring ────────────────────────────────────


def _compute_page_quality(extracted: dict) -> int:
    """
    Score a page on 6 AEO checks.

    1. Topic clarity    (0-15) — H1 present and substantive
    2. Heading structure(0-15) — H1 + H2s form a logical hierarchy
    3. Content depth    (0-20) — Word count and paragraph richness
    4. FAQ presence     (0-20) — FAQ section exists
    5. Schema markup    (0-15) — JSON-LD present with meaningful types
    6. Internal linking (0-15) — Contextual links to other pages
    """
    score = 0

    # 1. Topic clarity (0-15)
    h1 = extracted.get("h1") or ""
    if h1:
        words = len(h1.split())
        if words >= 3:
            score += 15
        elif words >= 1:
            score += 8

    # 2. Heading structure (0-15)
    h2s = extracted.get("h2s") or []
    if h1 and len(h2s) >= 3:
        score += 15
    elif h1 and len(h2s) >= 2:
        score += 12
    elif h1 and len(h2s) >= 1:
        score += 8
    elif h1:
        score += 3

    # 3. Content depth (0-20)
    text = extracted.get("text") or ""
    word_count = len(text.split())
    if word_count >= 1000:
        score += 20
    elif word_count >= 500:
        score += 15
    elif word_count >= 200:
        score += 10
    elif word_count >= 100:
        score += 5

    # 4. FAQ presence (0-20)
    if extracted.get("has_faq"):
        score += 20

    # 5. Schema markup (0-15)
    schema_types = extracted.get("schema_types") or []
    if len(schema_types) >= 2:
        score += 15
    elif len(schema_types) == 1:
        score += 10

    # 6. Internal linking (0-15)
    link_count = extracted.get("internal_link_count", 0)
    if link_count >= 10:
        score += 15
    elif link_count >= 5:
        score += 10
    elif link_count >= 2:
        score += 6
    elif link_count >= 1:
        score += 3

    return min(score, 100)


def _compute_confidence(text_length: int, method: str, status: str) -> int:
    """
    Confidence score (0-100) based on extraction completeness.

    - Full HTML with good content → 90-100
    - JS-rendered with content    → 70-90
    - Partial extraction          → 40-70
    - Minimal content             → 10-40
    - Blocked/unreachable         → 0
    """
    if status in ("blocked", "unreachable"):
        return 0

    if method == "js_render":
        if text_length >= 2000:
            return 85
        if text_length >= 800:
            return 75
        return 50

    # HTML extraction
    if text_length >= 3000:
        return 95
    if text_length >= 1500:
        return 85
    if text_length >= 800:
        return 70
    if text_length >= 500:
        return 50
    if text_length >= 200:
        return 30
    return 15
