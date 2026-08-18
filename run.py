from __future__ import annotations

import argparse
import asyncio
import json

import uvicorn

from beacon.config import load_config
from beacon.pipeline import Pipeline
from beacon.storage import Storage


def main() -> None:
    parser = argparse.ArgumentParser(description="Beacon on-demand signal intelligence")
    sub = parser.add_subparsers(dest="command")
    serve = sub.add_parser("serve", help="Start the Beacon web app")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8888)
    sub.add_parser("run", help="Run one snapshot from the terminal")
    args = parser.parse_args()

    if args.command == "run":
        config = load_config()
        storage = Storage(config.database_path)
        result = asyncio.run(Pipeline(config, storage).run())
        print(json.dumps({
            "run_id": result.run_id,
            "raw": result.raw_count,
            "deduped": result.deduped_count,
            "clusters": result.cluster_count,
            "signals": result.signal_count,
        }, indent=2))
        return

    uvicorn.run("beacon.api:app", host=getattr(args, "host", "127.0.0.1"), port=getattr(args, "port", 8888), reload=False)


if __name__ == "__main__":
    main()
