from __future__ import annotations

import json
from datetime import datetime, timedelta

from explainaboard.utils.cache_api import cache_online_file

from backend.src.impl.typing_utils import unwrap


class DatasetInfo:

    online_path = "https://raw.githubusercontent.com/ExpressAI/DataLab/2f96baa6644065f606d830469a93b4bc0a6e753b/utils/dataset_info.jsonl"  # noqa
    _cached_info: dict | None = None
    _cached_time: datetime | None = None
    # How long to cache for
    _cached_lifetime: timedelta = timedelta(hours=6)

    @classmethod
    def get_dataset_info(cls) -> dict:
        if cls._cached_info is None or datetime.now() - unwrap(
            cls._cached_time
        ) > unwrap(cls._cached_lifetime):
            # TODO(gneubig): add lifetime to cache when PR is merged
            local_path = cache_online_file(cls.online_path, "info/dataset_info.jsonl")
            cls._cached_info = {}
            with open(local_path, "r") as fin:
                for line in fin:
                    data = json.loads(line)
                    for k, v in data.items():
                        cls._cached_info[k] = v
            cls._cached_time = datetime.now()
        return cls._cached_info
