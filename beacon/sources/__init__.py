from __future__ import annotations

from typing import Any

import httpx

from .base import SourceAdapter
from .github import GitHubSource
from .hackernews import HackerNewsSource
from .reddit import RedditSource
from .rss import RSSSource


ADAPTERS = {
    "rss": RSSSource,
    "hackernews": HackerNewsSource,
    "reddit": RedditSource,
    "github": GitHubSource,
}


def build_source(config: dict[str, Any], client: httpx.AsyncClient, default_limit: int) -> SourceAdapter:
    source_type = str(config.get("type", "rss")).lower()
    adapter = ADAPTERS.get(source_type)
    if adapter is None:
        raise ValueError(f"Unsupported source type: {source_type}")
    return adapter(config, client, default_limit)
