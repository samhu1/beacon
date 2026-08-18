from beacon.models import RawItem
from beacon.normalize import canonicalize_url, normalize_item, normalize_title, title_tokens


def item(title: str, url: str) -> RawItem:
    return RawItem("s1", "Source", "rss", "1", url, title)


def test_canonicalize_url_strips_tracking_and_fragment_and_normalizes_host():
    url = "HTTPS://www.Example.com//post/?utm_source=x&b=2&a=1#section"
    assert canonicalize_url(url) == "https://example.com/post?a=1&b=2"


def test_title_normalization_is_stable_and_removes_noise_tokens():
    assert normalize_title("  OpenAI’s <b>New</b> Agent — Launch! ") == "openai s new agent launch"
    assert title_tokens("The new OpenAI agent launches for developers") == ("openai", "agent", "launches", "developers")


def test_fingerprint_prefers_canonical_url_so_tracking_variants_match():
    left = normalize_item(item("A story", "https://example.com/a?utm_source=x"))
    right = normalize_item(item("A completely different title", "https://www.example.com/a"))
    assert left.canonical_url == right.canonical_url
    assert left.fingerprint == right.fingerprint
