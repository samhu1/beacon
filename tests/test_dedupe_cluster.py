from beacon.cluster import cluster_items
from beacon.dedupe import deduplicate
from beacon.models import RawItem
from beacon.normalize import normalize_item


def raw(source, ext, title, url, score=0, rank=1):
    return RawItem(source, source, "rss", ext, url, title, metrics={"score": score, "rank": rank})


def test_dedupe_removes_exact_url_and_near_duplicate_title():
    items = [
        normalize_item(raw("a", "1", "OpenAI releases new agent platform", "https://a.com/story")),
        normalize_item(raw("a", "2", "OpenAI releases a new agent platform", "https://a.com/story?utm_source=x")),
        normalize_item(raw("b", "3", "OpenAI releases new agent platform today", "https://b.com/story")),
        normalize_item(raw("c", "4", "Federal Reserve cuts interest rates", "https://c.com/fed")),
    ]
    result = deduplicate(items, near_duplicate_threshold=0.88)
    assert [x.external_id for x in result] == ["1", "4"]


def test_cluster_groups_cross_source_same_story_but_not_unrelated_story():
    items = [
        normalize_item(raw("a", "1", "OpenAI launches agent platform for developers", "https://a.com/1", 100, 2)),
        normalize_item(raw("b", "2", "OpenAI agent platform launches for developers", "https://b.com/2", 80, 3)),
        normalize_item(raw("c", "3", "New database startup raises Series A", "https://c.com/3", 40, 5)),
    ]
    clusters = cluster_items(items, threshold=0.56)
    assert len(clusters) == 2
    largest = max(clusters, key=lambda c: c.item_count)
    assert largest.item_count == 2
    assert largest.source_count == 2
    assert largest.source_type_count == 1
    assert largest.best_rank == 2
    assert largest.engagement == 180
