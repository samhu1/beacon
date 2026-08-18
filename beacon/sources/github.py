from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .base import SourceAdapter
from ..models import RawItem


class GitHubSource(SourceAdapter):
    source_type = "github"

    async def fetch(self) -> list[RawItem]:
        query = str(self.config.get("query", "stars:>25"))
        if self.config.get("created_within_days"):
            cutoff = (datetime.now(timezone.utc) - timedelta(days=int(self.config["created_within_days"]))).date().isoformat()
            query += f" created:>={cutoff}"
        if self.config.get("pushed_within_days"):
            cutoff = (datetime.now(timezone.utc) - timedelta(days=int(self.config["pushed_within_days"]))).date().isoformat()
            query += f" pushed:>={cutoff}"
        params = {
            "q": query,
            "sort": self.config.get("sort", "stars"),
            "order": self.config.get("order", "desc"),
            "per_page": min(self.limit, 100),
        }
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "Beacon/1.0"}
        response = await self.client.get("https://api.github.com/search/repositories", params=params, headers=headers)
        response.raise_for_status()
        items: list[RawItem] = []
        for rank, repo in enumerate(response.json().get("items", []), 1):
            items.append(
                RawItem(
                    source_id=self.id,
                    source_name=self.name,
                    source_type=self.source_type,
                    external_id=str(repo.get("id", repo.get("full_name", rank))),
                    url=repo.get("html_url", ""),
                    title=repo.get("full_name", ""),
                    text=repo.get("description", "") or "",
                    author=(repo.get("owner") or {}).get("login", ""),
                    published_at=repo.get("created_at"),
                    metrics={
                        "rank": rank,
                        "stars": repo.get("stargazers_count", 0),
                        "forks": repo.get("forks_count", 0),
                        "open_issues": repo.get("open_issues_count", 0),
                    },
                )
            )
        return items
