from beacon.cluster import cluster_items
from beacon.models import RawItem, RunResult, SourceResult
from beacon.normalize import normalize_item
from beacon.storage import Storage


def test_storage_roundtrip_preserves_cluster_items_and_source_results(tmp_path):
    storage = Storage(str(tmp_path / "beacon.db"))
    cluster = cluster_items([
        normalize_item(RawItem("hn", "Hacker News", "hackernews", "1", "https://example.com/a", "Example signal", metrics={"score": 10, "rank": 1}))
    ])[0]
    cluster.signal_score = 61.5
    result = RunResult("run1", "2026-01-01T00:00:00+00:00", "2026-01-01T00:01:00+00:00", 1, 1, 1, 1, 1, [cluster], [SourceResult("hn", "Hacker News", "hackernews", "ok", 1, 20)])
    storage.save_run(result)

    latest = storage.latest_run()
    clusters = storage.get_clusters()
    sources = storage.get_sources()
    history = storage.historical_clusters()

    assert latest["id"] == "run1"
    assert clusters[0]["signal_score"] == 61.5
    assert clusters[0]["items"][0]["source_name"] == "Hacker News"
    assert sources[0]["status"] == "ok"
    assert history[0]["tokens"] == list(cluster.tokens)
