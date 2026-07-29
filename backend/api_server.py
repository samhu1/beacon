#!/usr/bin/env python3
"""
Signal API Server - Serves news analysis data via REST API
"""

import os
import json
from typing import Optional, List, Dict
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

# Import functions from main.py
from main import (
    CONFIG,
    DataFetcher,
    load_frequency_words,
    count_word_frequency,
    prepare_report_data,
    get_current_time,
)

app = FastAPI(
    title="Signal API",
    description="News analysis and trend tracking API",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache for latest report data
_CACHE_TTL_SECONDS = 300
_cached_report = {
    "data": None,
    "timestamp": None,
    "total_titles": 0,
    "failed_ids": []
}


def _build_title_info(all_results: Dict) -> Dict:
    """Build title metadata used by count_word_frequency."""
    current_time = get_current_time().strftime("%H:%M")
    title_info = {}
    for source_id, titles_data in all_results.items():
        title_info[source_id] = {}
        for title, title_data in titles_data.items():
            title_info[source_id][title] = {
                "first_time": current_time,
                "last_time": current_time,
                "count": 1,
                "ranks": title_data.get("ranks", []),
                "url": title_data.get("url", ""),
                "mobileUrl": title_data.get("mobileUrl", ""),
            }
    return title_info


def _analyze_fetched_results(all_results: Dict, id_to_name: Dict, failed_ids: List):
    """Analyze already-fetched source results into report payload."""
    total_titles = sum(len(titles) for titles in all_results.values())
    print(f"Total: {total_titles} titles from {len(all_results)} platforms")

    word_groups, filter_words = load_frequency_words()
    title_info = _build_title_info(all_results)

    stats, _ = count_word_frequency(
        results=all_results,
        word_groups=word_groups,
        filter_words=filter_words,
        id_to_name=id_to_name,
        title_info=title_info,
        rank_threshold=CONFIG["RANK_THRESHOLD"],
        new_titles=None,
        mode="daily"
    )

    report_data = prepare_report_data(
        stats=stats,
        failed_ids=failed_ids,
        new_titles=None,
        id_to_name=id_to_name,
        mode="daily"
    )
    return report_data, total_titles


def _process_source_response(response: str, source_id: str) -> Dict:
    """Convert a fetch_data JSON response into the internal results shape."""
    data = json.loads(response)
    source_results = {}
    for index, item in enumerate(data.get("items", []), 1):
        title = item.get("title")
        if title is None or isinstance(title, float) or not str(title).strip():
            continue
        title = str(title).strip()
        url = item.get("url", "")
        mobile_url = item.get("mobileUrl", "")

        if title in source_results:
            source_results[title]["ranks"].append(index)
        else:
            source_results[title] = {
                "ranks": [index],
                "url": url,
                "mobileUrl": mobile_url,
            }
    return source_results


def _sse(event: str, data: Dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def fetch_and_analyze():
    """Fetch news from all sources and analyze"""
    proxy_url = CONFIG["DEFAULT_PROXY"] if CONFIG["USE_PROXY"] else None
    fetcher = DataFetcher(proxy_url=proxy_url)

    # Get platform configurations
    platforms = CONFIG.get("PLATFORMS", [])

    # Build list of platform IDs with names
    ids_list = [(p["id"], p["name"]) for p in platforms]

    print(f"Fetching data from {len(platforms)} platforms...")

    # Use the crawl_websites method which handles all the fetching
    all_results, id_to_name, failed_ids = fetcher.crawl_websites(ids_list)
    report_data, total_titles = _analyze_fetched_results(all_results, id_to_name, failed_ids)

    return report_data, total_titles, failed_ids


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "Signal API",
        "version": "1.0.0",
        "endpoints": {
            "/api/report": "Get latest news analysis report",
            "/api/refresh": "Force refresh data from sources",
            "/api/sources": "List configured news sources"
        }
    }


@app.get("/api/report")
async def get_report(refresh: bool = False):
    """Get the latest news analysis report"""
    global _cached_report
    
    # Check if we need to refresh (older than 5 minutes or forced)
    now = datetime.now()
    needs_refresh = (
        refresh or 
        _cached_report["data"] is None or
        _cached_report["timestamp"] is None or
        (now - _cached_report["timestamp"]).total_seconds() > _CACHE_TTL_SECONDS
    )
    
    if needs_refresh:
        try:
            report_data, total_titles, failed_ids = fetch_and_analyze()
            _cached_report = {
                "data": report_data,
                "timestamp": datetime.now(),
                "total_titles": total_titles,
                "failed_ids": failed_ids
            }
        except Exception as e:
            if _cached_report["data"] is None:
                raise HTTPException(status_code=500, detail=f"Failed to fetch data: {e}")

    return {
        "success": True,
        "data": _cached_report["data"],
        "total_titles": _cached_report["total_titles"],
        "failed_ids": _cached_report.get("failed_ids", []),
        "generated_at": _cached_report["timestamp"].isoformat() if _cached_report["timestamp"] else None,
        "timezone": "America/New_York"
    }


@app.get("/api/report/stream")
def get_report_stream(refresh: bool = True):
    """Stream fetch progress and partial reports as sources complete (SSE)."""
    global _cached_report

    now = datetime.now()
    cache_fresh = (
        _cached_report["data"] is not None and
        _cached_report["timestamp"] is not None and
        (now - _cached_report["timestamp"]).total_seconds() <= _CACHE_TTL_SECONDS
    )

    def event_stream():
        if not refresh and cache_fresh:
            yield _sse("final", {
                "success": True,
                "data": _cached_report["data"],
                "total_titles": _cached_report["total_titles"],
                "failed_ids": _cached_report.get("failed_ids", []),
                "generated_at": _cached_report["timestamp"].isoformat() if _cached_report["timestamp"] else None,
                "timezone": "America/New_York",
                "progress": {"completed": 0, "total": 0, "message": "Served from cache"}
            })
            return

        proxy_url = CONFIG["DEFAULT_PROXY"] if CONFIG["USE_PROXY"] else None
        fetcher = DataFetcher(proxy_url=proxy_url)
        platforms = CONFIG.get("PLATFORMS", [])
        total = len(platforms)

        all_results = {}
        id_to_name = {}
        failed_ids = []

        yield _sse("progress", {
            "phase": "start",
            "completed": 0,
            "total": total,
            "message": f"Fetching {total} sources..."
        })

        for idx, platform in enumerate(platforms, 1):
            source_id = platform["id"]
            source_name = platform["name"]
            id_to_name[source_id] = source_name

            yield _sse("progress", {
                "phase": "fetching",
                "completed": idx - 1,
                "total": total,
                "source_id": source_id,
                "source_name": source_name,
                "message": f"Fetching {source_name}..."
            })

            response, _, _ = fetcher.fetch_data((source_id, source_name))
            source_items_count = 0

            if response:
                try:
                    source_results = _process_source_response(response, source_id)
                    all_results[source_id] = source_results
                    source_items_count = len(source_results)
                except json.JSONDecodeError:
                    failed_ids.append(source_id)
                except Exception:
                    failed_ids.append(source_id)
            else:
                failed_ids.append(source_id)

            yield _sse("progress", {
                "phase": "source_complete",
                "completed": idx,
                "total": total,
                "source_id": source_id,
                "source_name": source_name,
                "items": source_items_count,
                "failed": source_id in failed_ids,
                "message": (
                    f"{source_name} failed"
                    if source_id in failed_ids
                    else f"{source_name}: {source_items_count} items"
                )
            })

            if all_results:
                try:
                    partial_report, partial_total_titles = _analyze_fetched_results(
                        all_results, id_to_name, failed_ids
                    )
                    yield _sse("partial_report", {
                        "success": True,
                        "data": partial_report,
                        "total_titles": partial_total_titles,
                        "failed_ids": failed_ids,
                        "generated_at": datetime.now().isoformat(),
                        "timezone": "America/New_York",
                        "progress": {
                            "completed": idx,
                            "total": total,
                            "source_id": source_id,
                            "source_name": source_name
                        }
                    })
                except Exception as e:
                    yield _sse("progress", {
                        "phase": "analyze_error",
                        "completed": idx,
                        "total": total,
                        "message": f"Analysis error after {source_name}: {e}"
                    })

        try:
            final_report, total_titles = _analyze_fetched_results(all_results, id_to_name, failed_ids)
            _cached_report = {
                "data": final_report,
                "timestamp": datetime.now(),
                "total_titles": total_titles,
                "failed_ids": failed_ids
            }
            yield _sse("final", {
                "success": True,
                "data": final_report,
                "total_titles": total_titles,
                "failed_ids": failed_ids,
                "generated_at": _cached_report["timestamp"].isoformat(),
                "timezone": "America/New_York",
                "progress": {
                    "completed": total,
                    "total": total,
                    "message": "Complete"
                }
            })
        except Exception as e:
            yield _sse("error", {"message": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/sources")
async def get_sources():
    """List configured news sources"""
    platforms = CONFIG.get("PLATFORMS", [])
    return {
        "success": True,
        "sources": [{"id": p["id"], "name": p["name"]} for p in platforms]
    }


@app.post("/api/refresh")
async def refresh_data():
    """Force refresh data from all sources"""
    try:
        report_data, total_titles, failed_ids = fetch_and_analyze()
        global _cached_report
        _cached_report = {
            "data": report_data,
            "timestamp": datetime.now(),
            "total_titles": total_titles,
            "failed_ids": failed_ids
        }
        return {"success": True, "message": "Data refreshed successfully", "total_titles": total_titles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {e}")


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    print(f"Starting Signal API server on http://0.0.0.0:{port}")
    uvicorn.run("api_server:app", host="0.0.0.0", port=port, reload=True)
