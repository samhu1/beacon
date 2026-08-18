from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .models import SignalComponents, StoryCluster
from .similarity import jaccard


@dataclass(slots=True)
class HistoricalMatch:
    similarity: float
    score: float
    item_count: int
    source_count: int
    engagement: float
    best_rank: float | None
    appearances: int


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def find_historical_match(cluster: StoryCluster, history: list[dict[str, Any]], threshold: float) -> HistoricalMatch | None:
    best: dict[str, Any] | None = None
    best_similarity = 0.0
    for candidate in history:
        similarity = jaccard(cluster.tokens, candidate.get("tokens", []))
        if similarity > best_similarity:
            best_similarity = similarity
            best = candidate
    if best is None or best_similarity < threshold:
        return None
    return HistoricalMatch(
        similarity=best_similarity,
        score=float(best.get("signal_score", 0) or 0),
        item_count=int(best.get("item_count", 0) or 0),
        source_count=int(best.get("source_count", 0) or 0),
        engagement=float(best.get("engagement", 0) or 0),
        best_rank=float(best["best_rank"]) if best.get("best_rank") is not None else None,
        appearances=int(best.get("appearances", 1) or 1),
    )


def score_cluster(cluster: StoryCluster, history: list[dict[str, Any]], weights: dict[str, float], historical_threshold: float) -> StoryCluster:
    previous = find_historical_match(cluster, history, historical_threshold)

    novelty = 1.0 if previous is None else _clamp(1.0 - previous.similarity)
    breadth = _clamp((cluster.source_count - 1) / 4.0 + 0.12 if cluster.source_count else 0.0)
    source_diversity = _clamp(cluster.source_type_count / max(1.0, min(4.0, cluster.source_count)))

    if previous is None:
        velocity = _clamp((cluster.item_count - 1) / 4.0)
        engagement_velocity = _clamp(math.log1p(cluster.engagement) / math.log1p(5000))
        rank_momentum = _clamp((26 - (cluster.best_rank or 26)) / 25) if cluster.best_rank else 0.0
        persistence = 0.0
    else:
        item_delta = (cluster.item_count - previous.item_count) / max(1, previous.item_count)
        source_delta = (cluster.source_count - previous.source_count) / max(1, previous.source_count)
        velocity = _clamp(0.62 * max(0.0, item_delta) + 0.38 * max(0.0, source_delta))
        engagement_delta = (cluster.engagement - previous.engagement) / max(1.0, previous.engagement)
        engagement_velocity = _clamp(math.log1p(max(0.0, engagement_delta)))
        if cluster.best_rank is not None and previous.best_rank is not None:
            rank_momentum = _clamp((previous.best_rank - cluster.best_rank) / max(1.0, previous.best_rank))
        elif cluster.best_rank is not None:
            rank_momentum = _clamp((26 - cluster.best_rank) / 25)
        else:
            rank_momentum = 0.0
        persistence = _clamp(previous.appearances / 5.0)
        cluster.historical_similarity = previous.similarity
        cluster.previous_score = previous.score

    components = SignalComponents(
        novelty=novelty,
        velocity=velocity,
        breadth=breadth,
        rank_momentum=rank_momentum,
        persistence=persistence,
        engagement_velocity=engagement_velocity,
        source_diversity=source_diversity,
    )
    cluster.components = components
    raw = sum(getattr(components, key) * weight for key, weight in weights.items())
    cluster.signal_score = round(raw * 100, 1)

    if previous is None and cluster.signal_score >= 55:
        cluster.status = "new"
    elif previous and cluster.signal_score >= previous.score + 10:
        cluster.status = "rising"
    elif previous and cluster.signal_score <= previous.score - 12:
        cluster.status = "cooling"
    else:
        cluster.status = "stable"
    return cluster
