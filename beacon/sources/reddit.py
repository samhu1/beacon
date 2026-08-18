from __future__ import annotations

from datetime import datetime, timezone

from .base import SourceAdapter
from ..models import RawItem


class RedditSource(SourceAdapter):
    source_type = "reddit"

    async def fetch(self) -> list[RawItem]:
        subreddit = self.config["subreddit"]
        sort = self.config.get("sort", "top")
        period = self.config.get("period", "day")
        url = f"https://www.reddit.com/r/{subreddit}/{sort}.json"
        params = {"limit": self.limit, "raw_json": 1}
        if sort == "top":
            params["t"] = period
        response = await self.client.get(url, params=params, headers={"User-Agent": "Beacon/1.0 research-reader"})
        response.raise_for_status()
        children = response.json().get("data", {}).get("children", [])
        items: list[RawItem] = []
        for rank, child in enumerate(children, 1):
            data = child.get("data", {})
            if not data.get("title"):
                continue
            permalink = data.get("permalink", "")
            items.append(
                RawItem(
                    source_id=self.id,
                    source_name=self.name,
                    source_type=self.source_type,
                    external_id=data.get("name") or data.get("id") or str(rank),
                    url=data.get("url_overridden_by_dest") or (f"https://www.reddit.com{permalink}" if permalink else ""),
                    title=data.get("title", ""),
                    text=data.get("selftext", "") or "",
                    author=data.get("author", "") or "",
                    published_at=datetime.fromtimestamp(data.get("created_utc", 0), tz=timezone.utc).isoformat() if data.get("created_utc") else None,
                    metrics={"rank": rank, "score": data.get("score", 0), "comments": data.get("num_comments", 0), "upvote_ratio": data.get("upvote_ratio", 0)},
                )
            )
        return items
