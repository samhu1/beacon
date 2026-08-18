from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx

from ..models import RawItem


class SourceAdapter(ABC):
    source_type = "unknown"

    def __init__(self, config: dict[str, Any], client: httpx.AsyncClient, limit: int):
        self.config = config
        self.client = client
        self.limit = int(config.get("limit", limit))
        self.id = str(config["id"])
        self.name = str(config.get("name", self.id))

    @abstractmethod
    async def fetch(self) -> list[RawItem]:
        raise NotImplementedError
