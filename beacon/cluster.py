from __future__ import annotations

import hashlib
from collections import Counter

from .models import NormalizedItem, StoryCluster
from .similarity import item_similarity


def _timestamp(value: str | None, fallback: str) -> str:
    return value or fallback


def _best_rank(items: list[NormalizedItem]) -> float | None:
    ranks: list[float] = []
    for item in items:
        rank = item.metrics.get("rank")
        try:
            if rank is not None:
                ranks.append(float(rank))
        except (TypeError, ValueError):
            pass
    return min(ranks) if ranks else None


def _engagement(items: list[NormalizedItem]) -> float:
    total = 0.0
    for item in items:
        for key in ("score", "comments", "stars", "forks", "votes", "reactions"):
            try:
                total += max(0.0, float(item.metrics.get(key, 0) or 0))
            except (TypeError, ValueError):
                continue
    return total


def _cluster_tokens(items: list[NormalizedItem]) -> tuple[str, ...]:
    from collections import Counter
    counts = Counter(token for item in items for token in set(item.tokens))
    ordered = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    return tuple(token for token, _ in ordered[:14])


def _representative(items: list[NormalizedItem]) -> NormalizedItem:
    return max(
        items,
        key=lambda item: (
            len(item.tokens),
            float(item.metrics.get("score", 0) or 0),
            -len(item.title),
        ),
    )


def cluster_items(items: list[NormalizedItem], threshold: float = 0.56) -> list[StoryCluster]:
    if not items:
        return []

    groups: list[list[NormalizedItem]] = []
    for item in items:
        best_index = -1
        best_score = 0.0
        for index, group in enumerate(groups):
            representative = _representative(group)
            score = item_similarity(item, representative)
            if score > best_score:
                best_score = score
                best_index = index
        if best_index >= 0 and best_score >= threshold:
            groups[best_index].append(item)
        else:
            groups.append([item])

    clusters: list[StoryCluster] = []
    for group in groups:
        representative = _representative(group)
        tokens = _cluster_tokens(group)
        identity = "|".join(tokens[:8]) or representative.normalized_title
        cluster_id = hashlib.sha1(identity.encode("utf-8")).hexdigest()[:16]
        times = [_timestamp(item.published_at, item.fetched_at) for item in group]
        source_ids = {item.source_id for item in group}
        source_types = {item.source_type for item in group}
        clusters.append(
            StoryCluster(
                id=cluster_id,
                representative_title=representative.title,
                items=sorted(group, key=lambda item: item.published_at or item.fetched_at, reverse=True),
                tokens=tokens,
                first_seen=min(times),
                last_seen=max(times),
                source_count=len(source_ids),
                source_type_count=len(source_types),
                item_count=len(group),
                best_rank=_best_rank(group),
                engagement=_engagement(group),
            )
        )

    return clusters
