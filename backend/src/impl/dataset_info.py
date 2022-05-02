from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta

from explainaboard.utils.cache_api import cache_online_file
from explainaboard_web.impl.typing_utils import unwrap


@dataclass
class SubDatasetInfo:
    name: str
    splits: list[str] | None = None


@dataclass
class DatasetInfo:

    name: str
    dataset_class_name: str | None = None
    languages: list[str] | None = None
    task_templates: list[str] | None = None
    sub_datasets: dict[str, SubDatasetInfo] | None = None

    @classmethod
    def from_dict(cls, name: str, content: dict):
        sub_datasets = None
        if "sub_datasets" in content:
            sub_datasets = {
                k: SubDatasetInfo(name=k, splits=v.get("splits", None))
                for k, v in content["sub_datasets"].items()
            }
        return DatasetInfo(
            name=name,
            dataset_class_name=content.get("dataset_class_name", None),
            languages=content.get("languages", None),
            task_templates=content.get("task_templates", None),
            sub_datasets=sub_datasets,
        )


class DatasetCollection:

    online_path = "https://raw.githubusercontent.com/ExpressAI/DataLab/2f96baa6644065f606d830469a93b4bc0a6e753b/utils/dataset_info.jsonl"  # noqa
    _cached_info: dict | None = None
    _cached_time: datetime | None = None
    # How long to cache for
    _cached_lifetime: timedelta = timedelta(hours=6)

    @classmethod
    def get_dataset_collection(cls) -> dict:
        if cls._cached_info is None or (
            datetime.now() - unwrap(cls._cached_time) > unwrap(cls._cached_lifetime)
        ):
            # TODO(gneubig): add lifetime to cache when PR is merged
            local_path = cache_online_file(cls.online_path, "info/dataset_info.jsonl")
            cls._cached_info = {}
            print(f"local_path={local_path}")
            with open(local_path, "r") as fin:
                for line in fin:
                    data = json.loads(line)
                    for k, v in data.items():
                        # skip 'ERROR' or 'SKIPPED' entries
                        if isinstance(v, dict):
                            cls._cached_info[k] = DatasetInfo.from_dict(k, v)
            cls._cached_time = datetime.now()
        return cls._cached_info

    @classmethod
    def find_dataset_info(
        cls,
        dataset_name: str | None = None,
        task: str | None = None,
        page: int | None = None,
        page_size: int | None = None,
    ) -> list[DatasetInfo]:
        dataset_collection = cls.get_dataset_collection()
        if dataset_name is not None:
            dataset_list: Iterable[DatasetInfo] = (
                [dataset_collection[dataset_name]]
                if dataset_name in dataset_collection
                else []
            )
        else:
            dataset_list = dataset_collection.values()
        if task is not None:
            dataset_list = [
                x
                for x in dataset_list
                if (x.task_templates is not None and task in x.task_templates)
            ]
        if not isinstance(dataset_list, list):
            dataset_list = list(dataset_list)
        if page is not None:
            p, ps = unwrap(page), unwrap(page_size)
            dataset_list = dataset_list[(p - 1) * ps : p * ps]
        return dataset_list
