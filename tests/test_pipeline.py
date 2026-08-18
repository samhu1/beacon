from beacon.config import AppConfig, DEFAULT_WEIGHTS
from beacon.models import RawItem
from beacon.pipeline import Pipeline, build_briefing
from beacon.storage import Storage


class FakeAdapter:
    def __init__(self, source_id, source_name, source_type, payload):
        self.id = source_id
        self.name = source_name
        self.source_type = source_type
        self.payload = payload

    async def fetch(self):
        return self.payload


async def test_pipeline_is_on_demand_source_isolated_and_historical(monkeypatch, tmp_path):
    source_payloads = {
        "one": [RawItem("one", "One", "rss", "1", "https://a.com/1", "Agent runtime adoption accelerates", metrics={"rank": 2, "score": 200})],
        "two": [RawItem("two", "Two", "hackernews", "2", "https://b.com/2", "Agent runtime adoption is accelerating", metrics={"rank": 3, "score": 300})],
    }

    def fake_build(config, client, default_limit):
        return FakeAdapter(config["id"], config["name"], config["type"], source_payloads[config["id"]])

    monkeypatch.setattr("beacon.pipeline.build_source", fake_build)
    config = AppConfig(
        database_path=str(tmp_path / "db.sqlite"),
        cluster_similarity_threshold=.5,
        historical_similarity_threshold=.45,
        signal_threshold=35,
        scoring_weights=dict(DEFAULT_WEIGHTS),
        sources=[
            {"id":"one", "name":"One", "type":"rss"},
            {"id":"two", "name":"Two", "type":"hackernews"},
        ],
    )
    storage = Storage(config.database_path)
    pipeline = Pipeline(config, storage)
    events = []
    first = await pipeline.run(progress=events.append)

    assert first.raw_count == 2
    assert first.deduped_count == 2
    assert first.cluster_count == 1
    assert len(first.sources) == 2
    assert events[0]["phase"] == "starting"
    assert events[-1]["phase"] == "complete"
    assert storage.latest_run()["id"] == first.run_id

    source_payloads["one"].append(RawItem("one", "One", "rss", "3", "https://a.com/3", "Agent runtime adoption accelerates sharply", metrics={"rank": 1, "score": 500}))
    second = await pipeline.run()
    assert second.clusters[0].historical_similarity > .45
    assert second.clusters[0].components.persistence > 0

    brief = build_briefing(storage.get_clusters(), 0)
    assert brief["top"]
    assert brief["stats"]["signals"] == second.cluster_count
