from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml


DEFAULT_WEIGHTS = {
    "novelty": 0.18,
    "velocity": 0.20,
    "breadth": 0.16,
    "rank_momentum": 0.12,
    "persistence": 0.08,
    "engagement_velocity": 0.14,
    "source_diversity": 0.12,
}


@dataclass(slots=True)
class AppConfig:
    database_path: str = "./data/beacon.db"
    request_timeout_seconds: float = 12.0
    max_concurrency: int = 8
    cluster_similarity_threshold: float = 0.56
    historical_similarity_threshold: float = 0.48
    signal_threshold: float = 48.0
    max_items_per_source: int = 30
    scoring_weights: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    sources: list[dict[str, Any]] = field(default_factory=list)


def load_config(path: str | Path | None = None) -> AppConfig:
    config_path = Path(path or "config.yaml")
    raw: dict[str, Any] = {}
    if config_path.exists():
        raw = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}

    engine = raw.get("engine", {})
    scoring = raw.get("scoring", {})
    storage = raw.get("storage", {})

    weights = dict(DEFAULT_WEIGHTS)
    weights.update(scoring.get("weights", {}) or {})
    total = sum(float(value) for value in weights.values())
    if total <= 0:
        weights = dict(DEFAULT_WEIGHTS)
    else:
        weights = {key: float(value) / total for key, value in weights.items()}

    return AppConfig(
        database_path=str(storage.get("database_path", "./data/beacon.db")),
        request_timeout_seconds=float(engine.get("request_timeout_seconds", 12.0)),
        max_concurrency=int(engine.get("max_concurrency", 8)),
        cluster_similarity_threshold=float(engine.get("cluster_similarity_threshold", 0.56)),
        historical_similarity_threshold=float(engine.get("historical_similarity_threshold", 0.48)),
        signal_threshold=float(scoring.get("signal_threshold", 48.0)),
        max_items_per_source=int(engine.get("max_items_per_source", 30)),
        scoring_weights=weights,
        sources=list(raw.get("sources", []) or []),
    )
