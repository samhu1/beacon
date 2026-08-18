from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from .base import SourceAdapter
from ..models import RawItem


class HackerNewsSource(SourceAdapter):
    source_type = "hackernews"

    async def fetch(self) -> list[RawItem]:
        listing = self.config.get("listing", "topstories")
        ids_response = await self.client.get(f"https://hacker-news.firebaseio.com/v0/{listing}.json")
        ids_response.raise_for_status()
        ids = ids_response.json()[: self.limit]

        async def get_item(item_id: int, rank: int):
            response = await self.client.get(f"https://hacker-news.firebaseio.com/v0/item/{item_id}.json")
            response.raise_for_status()
            data = response.json() or {}
            if data.get("type") != "story" or not data.get("title"):
                return None
            return RawItem(
                source_id=self.id,
                source_name=self.name,
                source_type=self.source_type,
                external_id=str(item_id),
                url=data.get("url") or f"https://news.ycombinator.com/item?id={item_id}",
                title=data.get("title", ""),
                text=data.get("text", "") or "",
                author=data.get("by", "") or "",
                published_at=datetime.fromtimestamp(data.get("time", 0), tz=timezone.utc).isoformat() if data.get("time") else None,
                metrics={"rank": rank, "score": data.get("score", 0), "comments": data.get("descendants", 0)},
            )

        fetched = await asyncio.gather(*(get_item(item_id, rank) for rank, item_id in enumerate(ids, 1)))
        return [item for item in fetched if item is not None]
