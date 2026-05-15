"""Shared utilities for the analysis pipeline."""

from db import get_project

# Noise domains — infrastructure, social, directories, marketplaces, media.
# Used by ai_query (skip during mention extraction) and competitors (filter noise).
NOISE_DOMAINS = frozenset(
    {
        # Social / media
        "twitter.com", "x.com", "facebook.com", "instagram.com",
        "linkedin.com", "tiktok.com", "youtube.com", "reddit.com",
        "medium.com", "quora.com", "substack.com", "pinterest.com",
        "snapchat.com", "threads.net", "discord.com", "slack.com",
        # Reference / info
        "wikipedia.org", "wikimedia.org", "wikidata.org",
        "google.com", "apple.com", "microsoft.com", "bing.com",
        "yahoo.com", "duckduckgo.com",
        # Tech infrastructure
        "github.com", "gitlab.com", "bitbucket.org",
        "stackoverflow.com", "stackexchange.com",
        "googleapis.com", "cloudflare.com", "aws.amazon.com",
        "azure.com", "cloud.google.com",
        "wordpress.com", "wordpress.org", "w3.org", "schema.org",
        "npmjs.com", "pypi.org", "packagist.org",
        # AI providers
        "openai.com", "anthropic.com", "gemini.google.com",
        "huggingface.co", "perplexity.ai", "claude.ai",
        # Review / directory sites
        "yelp.com", "yellowpages.com", "tripadvisor.com",
        "bbb.org", "trustpilot.com", "capterra.com", "g2.com",
        "getapp.com", "softwareadvice.com", "producthunt.com",
        "alternativeto.net", "slashdot.org", "sourceforge.net",
        # Marketplaces
        "amazon.com", "ebay.com", "etsy.com", "walmart.com",
        "alibaba.com", "shopify.com",
        # News / blogs
        "techcrunch.com", "forbes.com", "businessinsider.com",
        "theverge.com", "wired.com", "cnet.com", "zdnet.com",
        "pcmag.com", "tomsguide.com", "gartner.com",
        # Misc
        "example.com", "localhost",
    }
)

# TLD suffixes that are always noise
_NOISE_TLDS = (".gov", ".edu", ".mil")


def get_target_domain(run: dict) -> str:
    """Resolve target domain from run config or linked project."""
    config = run.get("config") or {}
    domain = config.get("domain", "")
    if domain:
        return domain

    project_id = run.get("project_id")
    if project_id:
        project = get_project(project_id)
        if project:
            return project.get("domain", "")

    return ""


def resolve_project_context(run: dict) -> tuple[str, str | None, str | None, dict | None]:
    """
    Resolve domain, geo, sector, and full project record from a run in one DB call.

    Returns (domain, geo, sector, project).
    """
    config = run.get("config") or {}
    domain = config.get("domain", "")

    project_id = run.get("project_id")
    project = get_project(project_id) if project_id else None

    if not domain and project:
        domain = project.get("domain", "")

    geo = project.get("geo") if project else None
    sector = project.get("sector") if project else None

    return domain, geo, sector, project


def domains_match(cited: str, target: str) -> bool:
    """Check if a cited domain matches the target (exact or subdomain)."""
    if not cited or not target:
        return False

    cited = cited.lower().strip(".").removeprefix("www.")
    target = target.lower().strip(".").removeprefix("www.")

    return cited == target or cited.endswith("." + target)


def is_noise_domain(domain: str) -> bool:
    """Check if a domain is noise (directory, marketplace, media, .gov/.edu)."""
    if domain in NOISE_DOMAINS:
        return True
    return any(domain.endswith(tld) for tld in _NOISE_TLDS)
