from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass(slots=True)
class RawItem:
    source_id: str
    source_name: str
    source_type: str
    external_id: str
    url: str
    title: str
    text: str = ""
    author: str = ""
    published_at: str | None = None
    fetched_at: str = field(default_factory=utcnow_iso)
    metrics: dict[str, float | int | str] = field(default_factory=dict)


@dataclass(slots=True)
class NormalizedItem(RawItem):
    canonical_url: str = ""
    normalized_title: str = ""
    tokens: tuple[str, ...] = ()
    fingerprint: str = ""


@dataclass(slots=True)
class SignalComponents:
    novelty: float = 0.0
    velocity: float = 0.0
    breadth: float = 0.0
    rank_momentum: float = 0.0
    persistence: float = 0.0
    engagement_velocity: float = 0.0
    source_diversity: float = 0.0

    def as_dict(self) -> dict[str, float]:
        return asdict(self)


@dataclass(slots=True)
class StoryCluster:
    id: str
    representative_title: str
    items: list[NormalizedItem]
    tokens: tuple[str, ...]
    first_seen: str
    last_seen: str
    source_count: int
    source_type_count: int
    item_count: int
    best_rank: float | None
    engagement: float
    components: SignalComponents = field(default_factory=SignalComponents)
    signal_score: float = 0.0
    status: str = "stable"
    historical_similarity: float = 0.0
    previous_score: float | None = None

    def to_dict(self, include_items: bool = True) -> dict[str, Any]:
        payload = {
            "id": self.id,
            "representative_title": self.representative_title,
            "tokens": list(self.tokens),
            "first_seen": self.first_seen,
            "last_seen": self.last_seen,
            "source_count": self.source_count,
            "source_type_count": self.source_type_count,
            "item_count": self.item_count,
            "best_rank": self.best_rank,
            "engagement": self.engagement,
            "components": self.components.as_dict(),
            "signal_score": self.signal_score,
            "status": self.status,
            "historical_similarity": self.historical_similarity,
            "previous_score": self.previous_score,
        }
        if include_items:
            payload["items"] = [asdict(item) for item in self.items]
        return payload


@dataclass(slots=True)
class SourceResult:
    source_id: str
    source_name: str
    source_type: str
    status: str
    item_count: int
    elapsed_ms: int
    error: str | None = None


@dataclass(slots=True)
class RunResult:
    run_id: str
    started_at: str
    finished_at: str
    raw_count: int
    normalized_count: int
    deduped_count: int
    cluster_count: int
    signal_count: int
    clusters: list[StoryCluster]
    sources: list[SourceResult]
