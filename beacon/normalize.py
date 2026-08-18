from __future__ import annotations

import hashlib
import html
import re
import unicodedata
from dataclasses import asdict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .models import NormalizedItem, RawItem


TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "mc_cid", "mc_eid", "ref", "ref_src", "source",
}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "by", "for", "from",
    "has", "have", "in", "into", "is", "it", "its", "of", "on", "or", "that",
    "the", "their", "this", "to", "was", "were", "will", "with", "your", "you",
    "new", "says", "after", "about", "over", "how", "why", "what", "when",
}

TAG_RE = re.compile(r"<[^>]+>")
NON_WORD_RE = re.compile(r"[^a-z0-9]+")
SPACE_RE = re.compile(r"\s+")


def canonicalize_url(url: str) -> str:
    if not url:
        return ""
    try:
        parts = urlsplit(url.strip())
        scheme = parts.scheme.lower() or "https"
        netloc = parts.netloc.lower().removeprefix("www.")
        path = re.sub(r"/{2,}", "/", parts.path or "/")
        if path != "/":
            path = path.rstrip("/")
        query = [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if key.lower() not in TRACKING_PARAMS and not key.lower().startswith("utm_")
        ]
        query.sort()
        return urlunsplit((scheme, netloc, path, urlencode(query), ""))
    except ValueError:
        return url.strip()


def clean_text(value: str) -> str:
    value = html.unescape(value or "")
    value = TAG_RE.sub(" ", value)
    value = unicodedata.normalize("NFKC", value)
    return SPACE_RE.sub(" ", value).strip()


def normalize_title(title: str) -> str:
    value = clean_text(title).lower()
    value = NON_WORD_RE.sub(" ", value)
    return SPACE_RE.sub(" ", value).strip()


def title_tokens(title: str) -> tuple[str, ...]:
    normalized = normalize_title(title)
    tokens = [token for token in normalized.split() if len(token) > 1 and token not in STOPWORDS]
    return tuple(dict.fromkeys(tokens))


def fingerprint_for(item: RawItem, canonical_url: str, normalized_title: str) -> str:
    material = canonical_url or f"{item.source_type}|{normalized_title}"
    return hashlib.sha1(material.encode("utf-8")).hexdigest()[:20]


def normalize_item(item: RawItem) -> NormalizedItem:
    canonical_url = canonicalize_url(item.url)
    normalized_title = normalize_title(item.title)
    return NormalizedItem(
        **asdict(item),
        canonical_url=canonical_url,
        normalized_title=normalized_title,
        tokens=title_tokens(item.title),
        fingerprint=fingerprint_for(item, canonical_url, normalized_title),
    )
