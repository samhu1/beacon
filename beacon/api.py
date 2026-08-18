from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from .config import load_config
from .pipeline import Pipeline, build_briefing
from .storage import Storage

ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
CONFIG_PATH = os.getenv("BEACON_CONFIG", str(ROOT / "config.yaml"))
config = load_config(CONFIG_PATH)
storage = Storage(config.database_path)
pipeline = Pipeline(config, storage)

app = FastAPI(title="Beacon", version="1.0.0", docs_url="/api/docs", redoc_url=None)
app.mount("/assets", StaticFiles(directory=WEB_DIR), name="assets")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, Any]:
    latest = storage.latest_run()
    return {"status": "ok", "app": "Beacon", "latest_run": latest, "configured_sources": len(config.sources)}


@app.post("/api/run")
async def run_now() -> dict[str, Any]:
    result = await pipeline.run()
    return {
        "run": {
            "id": result.run_id,
            "started_at": result.started_at,
            "finished_at": result.finished_at,
            "raw_count": result.raw_count,
            "normalized_count": result.normalized_count,
            "deduped_count": result.deduped_count,
            "cluster_count": result.cluster_count,
            "signal_count": result.signal_count,
        },
        "signals": [cluster.to_dict() for cluster in result.clusters],
        "sources": [{
            "source_id": source.source_id,
            "source_name": source.source_name,
            "source_type": source.source_type,
            "status": source.status,
            "item_count": source.item_count,
            "elapsed_ms": source.elapsed_ms,
            "error": source.error,
        } for source in result.sources],
    }


@app.get("/api/run/stream")
async def run_stream() -> StreamingResponse:
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

    async def on_progress(event: dict[str, Any]) -> None:
        await queue.put(event)

    async def worker() -> None:
        try:
            await pipeline.run(progress=on_progress)
        except Exception as exc:
            await queue.put({"phase": "error", "message": f"{type(exc).__name__}: {exc}"})
        finally:
            await queue.put(None)

    async def events():
        task = asyncio.create_task(worker())
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/signals")
async def signals(run_id: str | None = None, limit: int = Query(160, ge=1, le=500)) -> dict[str, Any]:
    latest = storage.latest_run()
    clusters = storage.get_clusters(run_id=run_id, limit=limit)
    return {"run": latest, "signals": clusters, "signal_threshold": config.signal_threshold}


@app.get("/api/briefing")
async def briefing(run_id: str | None = None) -> dict[str, Any]:
    clusters = storage.get_clusters(run_id=run_id, limit=240)
    return {"run": storage.latest_run(), **build_briefing(clusters, config.signal_threshold)}


@app.get("/api/sources")
async def sources(run_id: str | None = None) -> dict[str, Any]:
    return {"run": storage.latest_run(), "sources": storage.get_sources(run_id=run_id), "configured": config.sources}


@app.get("/api/runs")
async def runs(limit: int = Query(20, ge=1, le=100)) -> dict[str, Any]:
    return {"runs": storage.recent_runs(limit)}


@app.get("/api/signals/{cluster_id}")
async def signal_detail(cluster_id: str) -> dict[str, Any]:
    clusters = storage.get_clusters(limit=500)
    match = next((cluster for cluster in clusters if cluster["cluster_id"] == cluster_id), None)
    if match is None:
        raise HTTPException(status_code=404, detail="Signal not found in latest snapshot")
    return match
