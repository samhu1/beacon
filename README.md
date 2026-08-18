# Beacon

Beacon is a lightweight, on-demand signal intelligence app. It reads configurable public sources, normalizes and deduplicates incoming items, clusters related stories, compares them with prior snapshots, and ranks the strongest signals with deterministic scoring.

There is no embedded LLM, agent runtime, background worker, vector database, or continuous process. Beacon only runs when you ask it to.

## What it does

- Configurable source universe: RSS/Atom, Hacker News, Reddit, and GitHub search adapters.
- Canonical normalization: URL cleanup, text normalization, stable fingerprints, source metadata, and metrics.
- Strict deduplication: canonical URL equality plus lexical near-duplicate detection.
- Story clustering: related coverage is merged into event/story clusters instead of rigid keyword buckets.
- Signal detection: scores novelty, velocity, source breadth, rank momentum, persistence, engagement velocity, and source-type diversity.
- Historical snapshots: SQLite keeps run observations so change can be measured without any semantic memory system.
- On-demand execution: run a snapshot from the UI or terminal, then the process stops.
- Source isolation: one unavailable source cannot fail the entire run.
- Live progress: the web app receives source and processing progress through server-sent events.
- Four product surfaces: Stream, Signal Map, Briefing, and Sources.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .
python run.py serve
```

Open `http://127.0.0.1:8888`.

Run one snapshot without the UI:

```bash
python run.py run
```

## Docker

```bash
docker compose up --build
```

Beacon stores snapshots in `./data/beacon.db` by default.

## Configure sources

All source selection lives in `config.yaml`. Adding a feed or subreddit does not require changing the scoring or UI code.

```yaml
sources:
  - id: example-feed
    name: Example Feed
    type: rss
    url: https://example.com/feed.xml

  - id: hacker-news
    name: Hacker News
    type: hackernews
    listing: topstories

  - id: reddit-startups
    name: r/startups
    type: reddit
    subreddit: startups
    sort: top
    period: day

  - id: github-emerging
    name: GitHub Emerging
    type: github
    query: stars:>20 agent
    created_within_days: 30
```

## Signal scoring

Every component is normalized to `0..1` and combined using weights from `config.yaml`:

- **Novelty** — dissimilarity from recent clusters.
- **Velocity** — increase in item count and independent source count.
- **Breadth** — number of distinct sources covering the cluster.
- **Rank momentum** — improvement in source ranking between snapshots.
- **Persistence** — repeated appearance across prior snapshots.
- **Engagement velocity** — change in observable votes, stars, comments, forks, and related metrics.
- **Source diversity** — coverage across different source adapter types.

The composite score is `0..100`. The default signal threshold is `48` and all weights are configuration, not UI logic.

## API

- `GET /api/health`
- `POST /api/run`
- `GET /api/run/stream`
- `GET /api/signals`
- `GET /api/signals/{cluster_id}`
- `GET /api/briefing`
- `GET /api/sources`
- `GET /api/runs`
- `GET /api/docs`

## Tests

```bash
python -m pytest
```

The test suite covers normalization, deduplication, clustering, scoring behavior, historical comparisons, persistence, source isolation, and end-to-end on-demand pipeline behavior with deterministic source fixtures.

## Architecture

```text
Configured Sources
      ↓
Source Adapters
      ↓
Normalization
      ↓
Deduplication
      ↓
Story Clustering
      ↓
Historical Comparison
      ↓
Signal Scoring
      ↓
SQLite Snapshot
      ↓
Stream / Signal Map / Briefing / Sources
```

Beacon is intentionally designed so an LLM can be added later as an optional consumer of its structured output, not as a dependency of the core product.
