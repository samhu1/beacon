from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from .models import RunResult


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    raw_count INTEGER NOT NULL,
    normalized_count INTEGER NOT NULL,
    deduped_count INTEGER NOT NULL,
    cluster_count INTEGER NOT NULL,
    signal_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clusters (
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    cluster_id TEXT NOT NULL,
    representative_title TEXT NOT NULL,
    tokens_json TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    source_count INTEGER NOT NULL,
    source_type_count INTEGER NOT NULL,
    item_count INTEGER NOT NULL,
    best_rank REAL,
    engagement REAL NOT NULL,
    components_json TEXT NOT NULL,
    signal_score REAL NOT NULL,
    status TEXT NOT NULL,
    historical_similarity REAL NOT NULL,
    previous_score REAL,
    PRIMARY KEY (run_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS items (
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    cluster_id TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    external_id TEXT NOT NULL,
    url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    published_at TEXT,
    fetched_at TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    PRIMARY KEY (run_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS source_runs (
    run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    status TEXT NOT NULL,
    item_count INTEGER NOT NULL,
    elapsed_ms INTEGER NOT NULL,
    error TEXT,
    PRIMARY KEY (run_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_clusters_score ON clusters(run_id, signal_score DESC);
CREATE INDEX IF NOT EXISTS idx_clusters_last_seen ON clusters(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_items_source ON items(run_id, source_id);
"""


class Storage:
    def __init__(self, database_path: str):
        self.path = Path(database_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    def save_run(self, result: RunResult) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    result.run_id,
                    result.started_at,
                    result.finished_at,
                    result.raw_count,
                    result.normalized_count,
                    result.deduped_count,
                    result.cluster_count,
                    result.signal_count,
                ),
            )
            for cluster in result.clusters:
                conn.execute(
                    "INSERT INTO clusters VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        result.run_id,
                        cluster.id,
                        cluster.representative_title,
                        json.dumps(cluster.tokens),
                        cluster.first_seen,
                        cluster.last_seen,
                        cluster.source_count,
                        cluster.source_type_count,
                        cluster.item_count,
                        cluster.best_rank,
                        cluster.engagement,
                        json.dumps(cluster.components.as_dict()),
                        cluster.signal_score,
                        cluster.status,
                        cluster.historical_similarity,
                        cluster.previous_score,
                    ),
                )
                for item in cluster.items:
                    conn.execute(
                        "INSERT OR IGNORE INTO items VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            result.run_id,
                            cluster.id,
                            item.fingerprint,
                            item.source_id,
                            item.source_name,
                            item.source_type,
                            item.external_id,
                            item.url,
                            item.canonical_url,
                            item.title,
                            item.text,
                            item.author,
                            item.published_at,
                            item.fetched_at,
                            json.dumps(item.metrics),
                        ),
                    )
            for source in result.sources:
                conn.execute(
                    "INSERT INTO source_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        result.run_id,
                        source.source_id,
                        source.source_name,
                        source.source_type,
                        source.status,
                        source.item_count,
                        source.elapsed_ms,
                        source.error,
                    ),
                )

    def latest_run(self) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM runs ORDER BY finished_at DESC LIMIT 1").fetchone()
            return dict(row) if row else None

    def recent_runs(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM runs ORDER BY finished_at DESC LIMIT ?", (limit,)).fetchall()
            return [dict(row) for row in rows]

    def historical_clusters(self, exclude_run_id: str | None = None, limit: int = 800) -> list[dict[str, Any]]:
        query = """
            SELECT c.*, COUNT(*) OVER (PARTITION BY c.cluster_id) AS appearances
            FROM clusters c
        """
        params: list[Any] = []
        if exclude_run_id:
            query += " WHERE c.run_id != ?"
            params.append(exclude_run_id)
        query += " ORDER BY c.last_seen DESC LIMIT ?"
        params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
            output = []
            for row in rows:
                item = dict(row)
                item["tokens"] = json.loads(item.pop("tokens_json"))
                item["components"] = json.loads(item.pop("components_json"))
                output.append(item)
            return output

    def get_clusters(self, run_id: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
        with self._connect() as conn:
            if run_id is None:
                latest = conn.execute("SELECT id FROM runs ORDER BY finished_at DESC LIMIT 1").fetchone()
                if latest is None:
                    return []
                run_id = latest["id"]
            rows = conn.execute(
                "SELECT * FROM clusters WHERE run_id = ? ORDER BY signal_score DESC, source_count DESC LIMIT ?",
                (run_id, limit),
            ).fetchall()
            clusters: list[dict[str, Any]] = []
            for row in rows:
                cluster = dict(row)
                cluster["tokens"] = json.loads(cluster.pop("tokens_json"))
                cluster["components"] = json.loads(cluster.pop("components_json"))
                item_rows = conn.execute(
                    "SELECT * FROM items WHERE run_id = ? AND cluster_id = ? ORDER BY published_at DESC",
                    (run_id, cluster["cluster_id"]),
                ).fetchall()
                cluster["items"] = []
                for item_row in item_rows:
                    item = dict(item_row)
                    item["metrics"] = json.loads(item.pop("metrics_json"))
                    cluster["items"].append(item)
                clusters.append(cluster)
            return clusters

    def get_sources(self, run_id: str | None = None) -> list[dict[str, Any]]:
        with self._connect() as conn:
            if run_id is None:
                latest = conn.execute("SELECT id FROM runs ORDER BY finished_at DESC LIMIT 1").fetchone()
                if latest is None:
                    return []
                run_id = latest["id"]
            rows = conn.execute(
                "SELECT * FROM source_runs WHERE run_id = ? ORDER BY source_type, source_name",
                (run_id,),
            ).fetchall()
            return [dict(row) for row in rows]
