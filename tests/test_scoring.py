from beacon.cluster import cluster_items
from beacon.config import DEFAULT_WEIGHTS
from beacon.models import RawItem
from beacon.normalize import normalize_item
from beacon.scoring import score_cluster


def make_cluster():
    items = [
        normalize_item(RawItem("hn", "HN", "hackernews", "1", "https://a.com/1", "Agent runtime gains rapid developer adoption", metrics={"score": 500, "comments": 120, "rank": 2})),
        normalize_item(RawItem("gh", "GitHub", "github", "2", "https://b.com/2", "Agent runtime gains rapid developer adoption", metrics={"stars": 1500, "forks": 100, "rank": 1})),
        normalize_item(RawItem("rss", "Blog", "rss", "3", "https://c.com/3", "Developer adoption grows for agent runtime", metrics={"rank": 4})),
    ]
    return cluster_items(items, threshold=.5)[0]


def test_new_cross_source_cluster_scores_novelty_breadth_and_diversity():
    cluster = score_cluster(make_cluster(), [], DEFAULT_WEIGHTS, .48)
    assert cluster.components.novelty == 1
    assert cluster.components.breadth > .5
    assert cluster.components.source_diversity == 1
    assert cluster.signal_score > 45


def test_history_reduces_novelty_and_can_mark_cluster_rising():
    cluster = make_cluster()
    history = [{
        "tokens": list(cluster.tokens),
        "signal_score": 20,
        "item_count": 1,
        "source_count": 1,
        "engagement": 50,
        "best_rank": 12,
        "appearances": 2,
    }]
    scored = score_cluster(cluster, history, DEFAULT_WEIGHTS, .48)
    assert scored.historical_similarity == 1
    assert scored.components.novelty == 0
    assert scored.components.velocity > .5
    assert scored.components.rank_momentum > .5
    assert scored.previous_score == 20
    assert scored.status == "rising"
