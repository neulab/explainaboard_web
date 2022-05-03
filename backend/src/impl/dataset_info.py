from __future__ import annotations

import itertools
import json
from collections.abc import Iterable
from datetime import datetime, timedelta

from explainaboard.utils.cache_api import cache_online_file
from explainaboard_web.impl.typing_utils import unwrap
from explainaboard_web.models import DatasetMetadata, DatasetsReturn


class DatasetCollection:

    online_path = "https://raw.githubusercontent.com/ExpressAI/DataLab/2f96baa6644065f606d830469a93b4bc0a6e753b/utils/dataset_info.jsonl"  # noqa
    _cached_info: dict | None = None
    _cached_time: datetime | None = None
    # How long to cache for
    _cached_lifetime: timedelta = timedelta(hours=6)

    @classmethod
    def metadata_from_dict(cls, name: str, content: dict) -> list[DatasetMetadata]:
        ret_list = []
        for k, v in content["sub_datasets"].items():
            sub_str = "" if k == "__NONE__" else f"---{k}"
            tasks = content.get("task_templates", [])
            if tasks is None:
                tasks = []
            ret_list.append(
                DatasetMetadata(
                    dataset_id=f"{name}{sub_str}",
                    dataset_name=name,
                    # dataset_class_name=content.get("dataset_class_name", None),
                    languages=content.get("languages", None),
                    tasks=tasks,
                    sub_dataset=None if k == "__NONE__" else k,
                    splits=v.get("splits", None),
                )
            )
        return ret_list

    @classmethod
    def get_dataset_collection(cls) -> dict[str, list[DatasetMetadata]]:
        """
        Get a collection of datasets, indexed by dataset name, containing every
        sub_dataset
        """
        if cls._cached_info is None or (
            datetime.now() - unwrap(cls._cached_time) > unwrap(cls._cached_lifetime)
        ):
            # TODO(gneubig): add lifetime to cache when PR is merged
            local_path = cache_online_file(cls.online_path, "info/dataset_info.jsonl")
            cls._cached_info = {}
            with open(local_path, "r") as fin:
                for line in fin:
                    data = json.loads(line)
                    for k, v in data.items():
                        # skip 'ERROR' or 'SKIPPED' entries
                        if isinstance(v, dict) and len(v) > 0:
                            cls._cached_info[k] = cls.metadata_from_dict(k, v)
            cls._cached_time = datetime.now()
        return cls._cached_info

    @classmethod
    def find_dataset_info(
        cls,
        dataset_name: str | None = None,
        sub_dataset: str | None = None,
        task: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> DatasetsReturn:
        dataset_collection = cls.get_dataset_collection()
        if dataset_name is not None and dataset_name != "":
            dataset_list: Iterable[DatasetMetadata] = (
                dataset_collection[dataset_name]
                if dataset_name in dataset_collection
                else []
            )
        else:
            dataset_list = itertools.chain.from_iterable(dataset_collection.values())
        if sub_dataset is not None and sub_dataset != "":
            dataset_list = [x for x in dataset_list if sub_dataset == x.sub_dataset]
        if task is not None:
            dataset_list = [x for x in dataset_list if task in x.tasks]
        if not isinstance(dataset_list, list):
            dataset_list = list(dataset_list)
        total = len(dataset_list)
        if page_size is not None:
            p, ps = unwrap(page), unwrap(page_size)
            if ps > 0:
                dataset_list = dataset_list[p * ps : (p + 1) * ps]
        return DatasetsReturn(datasets=dataset_list, total=total)
