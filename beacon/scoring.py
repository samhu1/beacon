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


SCORING_MODES: dict[str, dict[str, Any]] = {
    "balanced": {
        "id": "balanced",
        "name": "Balanced Momentum",
        "badge": "Default",
        "description": "Blends baseline engagement & rank (70%) with velocity deltas (30%). Sustains prominent signals while highlighting emerging spikes.",
        "weights": {
            "novelty": 0.16,
            "velocity": 0.18,
            "breadth": 0.18,
            "rank_momentum": 0.14,
            "persistence": 0.10,
            "engagement_velocity": 0.12,
            "source_diversity": 0.12,
        },
    },
    "impact": {
        "id": "impact",
        "name": "Conviction & Impact",
        "badge": "High Volume",
        "description": "Heavily weights total observed engagement, top-of-source rankings, and multi-source breadth. Ideal for macro industry intelligence.",
        "weights": {
            "novelty": 0.08,
            "velocity": 0.12,
            "breadth": 0.22,
            "rank_momentum": 0.18,
            "persistence": 0.14,
            "engagement_velocity": 0.16,
            "source_diversity": 0.10,
        },
    },
    "breakout": {
        "id": "breakout",
        "name": "Velocity & Breakout Hunter",
        "badge": "Early Discovery",
        "description": "Maximizes sensitivity to new stories, rapid star/comment surges, and sudden cross-source emergence.",
        "weights": {
            "novelty": 0.26,
            "velocity": 0.26,
            "breadth": 0.14,
            "rank_momentum": 0.10,
            "persistence": 0.04,
            "engagement_velocity": 0.10,
            "source_diversity": 0.10,
        },
    },
    "differential": {
        "id": "differential",
        "name": "Strict Differential",
        "badge": "Delta Only",
        "description": "Pure delta engine. Measures strictly what changed between the last snapshot and this one.",
        "weights": {
            "novelty": 0.20,
            "velocity": 0.22,
            "breadth": 0.16,
            "rank_momentum": 0.12,
            "persistence": 0.06,
            "engagement_velocity": 0.14,
            "source_diversity": 0.10,
        },
    },
}


def score_cluster(
    cluster: StoryCluster,
    history: list[dict[str, Any]],
    weights: dict[str, float] | None = None,
    historical_threshold: float = 0.48,
    mode: str = "balanced",
) -> StoryCluster:
    active_weights = weights or SCORING_MODES.get(mode, SCORING_MODES["balanced"])["weights"]
    previous = find_historical_match(cluster, history, historical_threshold)

    breadth = _clamp((cluster.source_count - 1) / 4.0 + 0.12 if cluster.source_count else 0.0)
    source_diversity = _clamp(cluster.source_type_count / max(1.0, min(4.0, cluster.source_count)))
    abs_engagement = _clamp(math.log1p(cluster.engagement) / math.log1p(5000))
    abs_rank = _clamp((26 - (cluster.best_rank or 26)) / 25) if cluster.best_rank else 0.0

    if previous is None:
        novelty = 1.0
        velocity = _clamp((cluster.item_count - 1) / 4.0)
        engagement_velocity = abs_engagement
        rank_momentum = abs_rank
        persistence = 0.0
    else:
        appearances = previous.appearances
        persistence = _clamp(appearances / 4.0)
        novelty = _clamp(1.0 - previous.similarity)

        item_delta = max(0.0, (cluster.item_count - previous.item_count) / max(1, previous.item_count))
        source_delta = max(0.0, (cluster.source_count - previous.source_count) / max(1, previous.source_count))
        growth_velocity = _clamp(0.62 * item_delta + 0.38 * source_delta)
        base_velocity = _clamp((cluster.item_count - 1) / 4.0)

        eng_delta = max(0.0, (cluster.engagement - previous.engagement) / max(1.0, previous.engagement))
        eng_growth = _clamp(math.log1p(eng_delta))

        if cluster.best_rank is not None and previous.best_rank is not None:
            rank_climb = _clamp((previous.best_rank - cluster.best_rank) / max(1.0, previous.best_rank))
        else:
            rank_climb = 0.0

        if mode == "differential":
            velocity = growth_velocity
            engagement_velocity = eng_growth
            rank_momentum = rank_climb if cluster.best_rank is not None else 0.0
        elif mode == "impact":
            velocity = _clamp(0.65 * base_velocity + 0.35 * growth_velocity)
            engagement_velocity = _clamp(0.85 * abs_engagement + 0.15 * eng_growth)
            rank_momentum = _clamp(0.85 * abs_rank + 0.15 * rank_climb) if cluster.best_rank is not None else 0.0
        elif mode == "breakout":
            velocity = _clamp(0.20 * base_velocity + 0.80 * growth_velocity)
            engagement_velocity = _clamp(0.35 * abs_engagement + 0.65 * eng_growth)
            rank_momentum = _clamp(0.35 * abs_rank + 0.65 * rank_climb) if cluster.best_rank is not None else 0.0
        else:  # balanced
            velocity = _clamp(0.50 * base_velocity + 0.50 * growth_velocity if (item_delta > 0 or source_delta > 0) else base_velocity * 0.75)
            engagement_velocity = _clamp(0.70 * abs_engagement + 0.30 * eng_growth)
            rank_momentum = _clamp(0.70 * abs_rank + 0.30 * rank_climb) if cluster.best_rank is not None else 0.0

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
    raw = sum(getattr(components, key) * active_weights.get(key, 0.14) for key in active_weights)
    cluster.signal_score = round(raw * 100, 1)

    if previous is None and cluster.signal_score >= 50:
        cluster.status = "new"
    elif previous and cluster.signal_score >= previous.score + 5:
        cluster.status = "rising"
    elif previous and cluster.signal_score <= previous.score - 15:
        cluster.status = "cooling"
    else:
        cluster.status = "stable"
    return cluster
