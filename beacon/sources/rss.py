from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

from .base import SourceAdapter
from ..models import RawItem


def _text(node, names: tuple[str, ...]) -> str:
    for name in names:
        found = node.find(name)
        if found is not None and found.text:
            return found.text.strip()
    return ""


def _iso_date(value: str) -> str | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except ValueError:
            return None


class RSSSource(SourceAdapter):
    source_type = "rss"

    async def fetch(self) -> list[RawItem]:
        response = await self.client.get(self.config["url"])
        response.raise_for_status()
        root = ET.fromstring(response.content)
        items: list[RawItem] = []

        channel_items = root.findall(".//item")
        if channel_items:
            for index, node in enumerate(channel_items[: self.limit], 1):
                link = _text(node, ("link",))
                guid = _text(node, ("guid",)) or link or str(index)
                items.append(
                    RawItem(
                        source_id=self.id,
                        source_name=self.name,
                        source_type=self.source_type,
                        external_id=guid,
                        url=link,
                        title=_text(node, ("title",)),
                        text=_text(node, ("description", "summary")),
                        author=_text(node, ("author",)),
                        published_at=_iso_date(_text(node, ("pubDate", "published", "updated"))),
                        metrics={"rank": index},
                    )
                )
            return [item for item in items if item.title]

        namespace = "{http://www.w3.org/2005/Atom}"
        for index, node in enumerate(root.findall(f".//{namespace}entry")[: self.limit], 1):
            link_node = node.find(f"{namespace}link")
            link = link_node.attrib.get("href", "") if link_node is not None else ""
            title = _text(node, (f"{namespace}title",))
            items.append(
                RawItem(
                    source_id=self.id,
                    source_name=self.name,
                    source_type=self.source_type,
                    external_id=_text(node, (f"{namespace}id",)) or link or str(index),
                    url=link,
                    title=title,
                    text=_text(node, (f"{namespace}summary", f"{namespace}content")),
                    published_at=_iso_date(_text(node, (f"{namespace}published", f"{namespace}updated"))),
                    metrics={"rank": index},
                )
            )
        return [item for item in items if item.title]
