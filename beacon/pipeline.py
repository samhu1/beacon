from __future__ import annotations

import asyncio
import inspect
import time
import uuid
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any

import httpx

from .cluster import cluster_items
from .config import AppConfig
from .dedupe import deduplicate
from .models import RunResult, SourceResult
from .normalize import normalize_item
from .scoring import score_cluster
from .sources import build_source
from .storage import Storage

ProgressCallback = Callable[[dict[str, Any]], Awaitable[None] | None]


async def _emit(callback: ProgressCallback | None, payload: dict[str, Any]) -> None:
    if callback is None:
        return
    result = callback(payload)
    if inspect.isawaitable(result):
        await result


class Pipeline:
    def __init__(self, config: AppConfig, storage: Storage):
        self.config = config
        self.storage = storage

    async def run(self, progress: ProgressCallback | None = None) -> RunResult:
        run_id = uuid.uuid4().hex[:12]
        started_at = datetime.now(timezone.utc).isoformat()
        history = self.storage.historical_clusters(limit=1000)

        await _emit(progress, {"phase": "starting", "run_id": run_id, "message": "Preparing sources", "completed": 0, "total": len(self.config.sources)})

        timeout = httpx.Timeout(self.config.request_timeout_seconds)
        limits = httpx.Limits(max_connections=max(4, self.config.max_concurrency * 2), max_keepalive_connections=self.config.max_concurrency)
        semaphore = asyncio.Semaphore(self.config.max_concurrency)
        raw_items = []
        source_results: list[SourceResult] = []
        completed = 0
        completed_lock = asyncio.Lock()

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, limits=limits) as client:
            async def fetch_one(source_config: dict[str, Any]) -> None:
                nonlocal completed
                source_id = str(source_config.get("id", "unknown"))
                source_name = str(source_config.get("name", source_id))
                source_type = str(source_config.get("type", "rss"))
                started = time.perf_counter()
                status = "ok"
                error = None
                items = []
                try:
                    async with semaphore:
                        adapter = build_source(source_config, client, self.config.max_items_per_source)
                        await _emit(progress, {"phase": "fetching", "run_id": run_id, "source_id": source_id, "source_name": source_name, "message": f"Reading {source_name}"})
                        items = await adapter.fetch()
                        raw_items.extend(items)
                except Exception as exc:
                    status = "error"
                    error = f"{type(exc).__name__}: {exc}"
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                source_results.append(SourceResult(source_id, source_name, source_type, status, len(items), elapsed_ms, error))
                async with completed_lock:
                    completed += 1
                    current = completed
                await _emit(progress, {
                    "phase": "source_complete",
                    "run_id": run_id,
                    "source_id": source_id,
                    "source_name": source_name,
                    "status": status,
                    "item_count": len(items),
                    "completed": current,
                    "total": len(self.config.sources),
                    "message": f"{source_name}: {len(items)} items" if status == "ok" else f"{source_name}: unavailable",
                })

            await asyncio.gather(*(fetch_one(source) for source in self.config.sources if source.get("enabled", True)))

        await _emit(progress, {"phase": "processing", "run_id": run_id, "message": "Normalizing and deduplicating", "raw_count": len(raw_items)})
        normalized = [normalize_item(item) for item in raw_items if item.title.strip()]
        deduped = deduplicate(normalized)

        await _emit(progress, {"phase": "clustering", "run_id": run_id, "message": "Forming story clusters", "item_count": len(deduped)})
        clusters = cluster_items(deduped, self.config.cluster_similarity_threshold)

        await _emit(progress, {"phase": "scoring", "run_id": run_id, "message": "Measuring signal strength", "cluster_count": len(clusters)})
        scored = [
            score_cluster(cluster, history, self.config.scoring_weights, self.config.historical_similarity_threshold)
            for cluster in clusters
        ]
        scored.sort(key=lambda cluster: (cluster.signal_score, cluster.source_count, cluster.engagement), reverse=True)
        signal_count = sum(cluster.signal_score >= self.config.signal_threshold for cluster in scored)
        finished_at = datetime.now(timezone.utc).isoformat()

        result = RunResult(
            run_id=run_id,
            started_at=started_at,
            finished_at=finished_at,
            raw_count=len(raw_items),
            normalized_count=len(normalized),
            deduped_count=len(deduped),
            cluster_count=len(scored),
            signal_count=signal_count,
            clusters=scored,
            sources=sorted(source_results, key=lambda source: (source.status != "ok", source.source_type, source.source_name)),
        )
        self.storage.save_run(result)
        await _emit(progress, {
            "phase": "complete",
            "run_id": run_id,
            "message": "Snapshot complete",
            "raw_count": result.raw_count,
            "deduped_count": result.deduped_count,
            "cluster_count": result.cluster_count,
            "signal_count": result.signal_count,
        })
        return result


def build_briefing(clusters: list[dict[str, Any]], signal_threshold: float) -> dict[str, Any]:
    signals = [cluster for cluster in clusters if float(cluster.get("signal_score", 0)) >= signal_threshold]
    rising = [cluster for cluster in signals if cluster.get("status") == "rising"]
    fresh = [cluster for cluster in signals if cluster.get("status") == "new"]
    broad = [cluster for cluster in signals if int(cluster.get("source_count", 0)) >= 3]

    return {
        "top": signals[:8],
        "rising": rising[:6],
        "new": fresh[:6],
        "cross_source": broad[:6],
        "stats": {
            "signals": len(signals),
            "rising": len(rising),
            "new": len(fresh),
            "cross_source": len(broad),
        },
    }
