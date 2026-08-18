from __future__ import annotations

from .models import NormalizedItem
from .similarity import item_similarity


def deduplicate(items: list[NormalizedItem], near_duplicate_threshold: float = 0.88) -> list[NormalizedItem]:
    exact_seen: set[str] = set()
    kept: list[NormalizedItem] = []

    for item in items:
        exact_key = item.canonical_url or item.fingerprint
        if exact_key in exact_seen:
            continue
        if any(item_similarity(item, prior) >= near_duplicate_threshold for prior in kept[-250:]):
            continue
        exact_seen.add(exact_key)
        kept.append(item)

    return kept
