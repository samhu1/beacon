from __future__ import annotations

import math
from collections import Counter


def jaccard(left: tuple[str, ...] | list[str], right: tuple[str, ...] | list[str]) -> float:
    a, b = set(left), set(right)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def char_trigrams(text: str) -> set[str]:
    compact = f"  {text.strip().lower()}  "
    return {compact[index:index + 3] for index in range(max(0, len(compact) - 2))}


def trigram_similarity(left: str, right: str) -> float:
    a, b = char_trigrams(left), char_trigrams(right)
    if not a or not b:
        return 0.0
    return (2 * len(a & b)) / (len(a) + len(b))


def cosine_tokens(left: tuple[str, ...] | list[str], right: tuple[str, ...] | list[str]) -> float:
    a, b = Counter(left), Counter(right)
    if not a or not b:
        return 0.0
    overlap = set(a) & set(b)
    dot = sum(a[token] * b[token] for token in overlap)
    norm_a = math.sqrt(sum(value * value for value in a.values()))
    norm_b = math.sqrt(sum(value * value for value in b.values()))
    return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0


def item_similarity(left, right) -> float:
    if left.canonical_url and left.canonical_url == right.canonical_url:
        return 1.0
    token_score = jaccard(left.tokens, right.tokens)
    cosine = cosine_tokens(left.tokens, right.tokens)
    chars = trigram_similarity(left.normalized_title, right.normalized_title)
    return max(token_score, 0.55 * cosine + 0.45 * chars)
