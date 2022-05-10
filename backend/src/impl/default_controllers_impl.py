from __future__ import annotations

import binascii
import dataclasses
import os
from typing import Optional, cast

from explainaboard import (
    DatalabLoaderOption,
    TaskType,
    get_processor,
    get_task_categories,
)
from explainaboard import metric as exb_metric
from explainaboard.feature import FeatureType
from explainaboard.info import SysOutputInfo
from explainaboard.loaders.loader_registry import get_supported_file_types_for_loader
from explainaboard.metric import MetricStats
from explainaboard.processors.processor_registry import get_metric_list_for_processor
from explainaboard_web.impl.auth import get_user
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.system_db_utils import SystemDBUtils
from explainaboard_web.impl.private_dataset import is_private_dataset
from explainaboard_web.impl.utils import abort_with_error_message, decode_base64
from explainaboard_web.models import DatasetMetadata
from explainaboard_web.models.datasets_return import DatasetsReturn
from explainaboard_web.models.system import System
from explainaboard_web.models.system_analyses_return import SystemAnalysesReturn
from explainaboard_web.models.system_info import SystemInfo
from explainaboard_web.models.system_outputs_return import SystemOutputsReturn
from explainaboard_web.models.systems_analyses_body import SystemsAnalysesBody
from explainaboard_web.models.systems_body import SystemsBody
from explainaboard_web.models.systems_return import SystemsReturn
from explainaboard_web.models.task import Task
from explainaboard_web.models.task_category import TaskCategory
from flask import current_app
from pymongo import ASCENDING, DESCENDING

""" /info """


def info_get():
    return {
        "env": os.getenv("FLASK_ENV"),
        "auth_url": current_app.config.get("AUTH_URL"),
    }


""" /user """


def user_get():
    user = get_user()
    if not user:
        abort_with_error_message(401, "login required")
    return user.get_user_info()


""" /tasks """


def tasks_get() -> list[TaskCategory]:
    _categories = get_task_categories()
    categories: list[TaskCategory] = []
    for _category in _categories:
        tasks: list[Task] = []
        for _task in _category.tasks:
            supported_formats = get_supported_file_types_for_loader(_task.name)
            supported_metrics = [
                metric.name for metric in get_metric_list_for_processor(_task.name)
            ]
            tasks.append(
                Task(
                    _task.name, _task.description, supported_metrics, supported_formats
                )
            )
        categories.append(TaskCategory(_category.name, _category.description, tasks))
    return categories


""" /datasets """


def datasets_dataset_id_get(dataset_id: str) -> DatasetMetadata:
    dataset = DatasetDBUtils.find_dataset_by_id(dataset_id)
    if dataset is None:
        abort_with_error_message(404, f"dataset id: {dataset_id} not found")
    return dataset


def datasets_get(
    dataset_ids: Optional[str],
    dataset_name: Optional[str],
    task: Optional[str],
    page: int,
    page_size: int,
) -> DatasetsReturn:
    parsed_dataset_ids = dataset_ids.split(",") if dataset_ids else None
    return DatasetDBUtils.find_datasets(
        page, page_size, parsed_dataset_ids, dataset_name, task
    )


""" /systems """


def systems_system_id_get(system_id: str) -> System:
    return SystemDBUtils.find_system_by_id(system_id)


def systems_get(
    system_name: Optional[str],
    task: Optional[str],
    dataset: Optional[str],
    subdataset: Optional[str],
    split: Optional[str],
    page: int,
    page_size: int,
    sort_field: str,
    sort_direction: str,
    creator: Optional[str],
) -> SystemsReturn:
    ids = None
    if not sort_field:
        sort_field = "created_at"
    if not sort_direction:
        sort_direction = "desc"
    if sort_direction not in ["asc", "desc"]:
        abort_with_error_message(400, "sort_direction needs to be one of asc or desc")
    if sort_field != "created_at":
        sort_field = f"system_info.results.overall.{sort_field}.value"

    dir = ASCENDING if sort_direction == "asc" else DESCENDING

    return SystemDBUtils.find_systems(
        ids,
        page,
        page_size,
        system_name,
        task,
        dataset,
        subdataset,
        split,
        [(sort_field, dir)],
        creator,
    )


def systems_post(body: SystemsBody) -> System:
    """
    aborts with error if fails
    TODO: error handling
    """
    if body.metadata.dataset_metadata_id:
        if not body.metadata.dataset_split:
            abort_with_error_message(
                400, "dataset split is required if a dataset is chosen"
            )
        if body.custom_dataset:
            abort_with_error_message(
                400,
                "both datalab dataset and custom dataset are "
                "provided. please only select one.",
            )

    try:
        body.system_output.data = decode_base64(body.system_output.data)
        if body.custom_dataset and body.custom_dataset.data:
            body.custom_dataset.data = decode_base64(body.custom_dataset.data)
        system = SystemDBUtils.create_system(
            body.metadata, body.system_output, body.custom_dataset
        )
        return system
    except binascii.Error as e:
        abort_with_error_message(
            400, f"file should be sent in plain text base64. ({e})"
        )


def systems_system_id_outputs_get(
    system_id: str, output_ids: Optional[str]
) -> SystemOutputsReturn:
    """
    TODO: return special error/warning if some ids cannot be found
    """
    sys = SystemDBUtils.find_system_by_id(system_id)
    if is_private_dataset(
        DatalabLoaderOption(
            sys.system_info.dataset_name,
            sys.system_info.sub_dataset_name,
            sys.system_info.dataset_split,
        )
    ):
        abort_with_error_message(
            403, f"{sys.system_info.dataset_name} is a private dataset", 40301
        )

    return SystemDBUtils.find_system_outputs(system_id, output_ids, limit=10)


def systems_system_id_delete(system_id: str):
    success = SystemDBUtils.delete_system_by_id(system_id)
    if success:
        return "Success"
    abort_with_error_message(400, f"cannot find system_id: {system_id}")


def systems_analyses_post(body: SystemsAnalysesBody):
    system_ids_str = body.system_ids
    pairwise_performance_gap = body.pairwise_performance_gap
    custom_feature_to_bucket_info = body.feature_to_bucket_info

    single_analyses: dict = {}
    system_ids: list = system_ids_str.split(",")
    system_name = None
    task = None
    dataset_name = None
    subdataset_name = None
    split = None
    creator = None
    page = 0
    page_size = len(system_ids)
    sort = None
    systems: list[System] = SystemDBUtils.find_systems(
        system_ids,
        page,
        page_size,
        task,
        system_name,
        dataset_name,
        subdataset_name,
        split,
        sort,
        creator,
        include_metric_stats=True,
    ).systems
    systems_len = len(systems)
    if systems_len == 0:
        return SystemAnalysesReturn(single_analyses)

    if pairwise_performance_gap and systems_len != 2:
        abort_with_error_message(
            400,
            "pairwise_performance_gap=true"
            + f" only accepts 2 systems, got: {systems_len}",
        )

    for system in systems:
        system_info: SystemInfo = system.system_info
        system_info_dict = system_info.to_dict()
        system_output_info = SysOutputInfo.from_dict(system_info_dict)

        for feature_name, feature in system_output_info.features.items():
            feature = FeatureType.from_dict(feature)  # dict -> Feature

            # user-defined bucket info
            if feature_name in custom_feature_to_bucket_info:
                custom_bucket_info = custom_feature_to_bucket_info[feature_name]
                # Hardcoded as SDK doesn't export this name
                feature.bucket_info.method = (
                    "bucket_attribute_specified_bucket_interval"
                )
                feature.bucket_info.number = custom_bucket_info.number
                setting = [tuple(interval) for interval in custom_bucket_info.setting]
                feature.bucket_info.setting = setting
            system_output_info.features[feature_name] = feature

        metric_configs = [
            getattr(exb_metric, metric_config_dict["cls_name"])(**metric_config_dict)
            for metric_config_dict in system_output_info.metric_configs
        ]

        system_output_info.metric_configs = metric_configs

        processor = get_processor(TaskType(system_output_info.task_name))
        metric_stats = [MetricStats(stat) for stat in system.metric_stats]

        # Get the entire system outputs
        output_ids = None
        system_outputs = SystemDBUtils.find_system_outputs(
            system.system_id, output_ids, limit=0
        ).system_outputs
        # Note we are casting here, as SystemOutput.from_dict() actually just returns a
        # dict
        system_outputs = [cast(dict, x) for x in system_outputs]

        fine_grained_statistics = processor.get_fine_grained_statistics(
            system_output_info,
            system_outputs,
            system.active_features,
            metric_stats,
        )
        performance_over_bucket: dict = fine_grained_statistics.performance_over_bucket
        # TODO This is a HACK. Should add proper to_dict methods in SDK
        for feature, feature_dict in performance_over_bucket.items():
            for bucket_key, bucket_performance in list(feature_dict.items()):
                bucket_performance = dataclasses.asdict(bucket_performance)
                new_bucket_key = [str(number) for number in bucket_key]
                new_bucket_key_str = f"({', '.join(new_bucket_key)})"
                bucket_performance["bucket_name"] = [
                    str(num) for num in bucket_performance["bucket_name"]
                ]
                performance_over_bucket[feature][
                    new_bucket_key_str
                ] = bucket_performance
                performance_over_bucket[feature].pop(bucket_key)

        single_analyses[system.system_id] = performance_over_bucket

    return SystemAnalysesReturn(single_analyses)
