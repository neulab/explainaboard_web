from __future__ import annotations

import binascii
import datetime
import json
import os
from csv import reader, writer
from functools import lru_cache
from typing import Optional, cast

import pandas as pd
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
from explainaboard_web.impl.benchmark_utils import BenchmarkUtils
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.system_db_utils import SystemDBUtils
from explainaboard_web.impl.private_dataset import is_private_dataset
from explainaboard_web.impl.utils import abort_with_error_message, decode_base64
from explainaboard_web.models import (
    Benchmark,
    BenchmarkConfig,
    DatasetMetadata,
    PlotData,
)
from explainaboard_web.models.datasets_return import DatasetsReturn
from explainaboard_web.models.system import System
from explainaboard_web.models.system_analyses_return import SystemAnalysesReturn
from explainaboard_web.models.system_create_props import SystemCreateProps
from explainaboard_web.models.system_info import SystemInfo
from explainaboard_web.models.system_outputs_return import SystemOutputsReturn
from explainaboard_web.models.systems_analyses_body import SystemsAnalysesBody
from explainaboard_web.models.systems_return import SystemsReturn
from explainaboard_web.models.task import Task
from explainaboard_web.models.task_category import TaskCategory
from flask import current_app
from pymongo import ASCENDING, DESCENDING

""" /info """


@lru_cache(maxsize=None)
def info_get():
    api_version = None
    with open("explainaboard_web/swagger/swagger.yaml") as f:
        for line in f:
            if line.startswith("  version: "):
                api_version = line[len("version: ") + 1 : -1].strip()
                break
    if not api_version:
        raise RuntimeError("failed to extract API version")
    return {
        "env": os.getenv("FLASK_ENV"),
        "auth_url": current_app.config.get("AUTH_URL"),
        "api_version": api_version,
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


""" /benchmarks """


def benchmarkconfigs_get(parent: Optional[str]) -> list[BenchmarkConfig]:
    scriptpath = os.path.dirname(__file__)
    config_folder = os.path.join(scriptpath, "./benchmark_configs/")
    # Add benchmarks to here if they should be displayed on the page.
    # This should perhaps be moved to the database or made dynamic later.
    # display_benchmarks = ["masakhaner", "gaokao"]
    # Get all benchmark configs
    """
    display_benchmarks = ["masakhaner", "gaokao"]
    # Get all benchmark configs
    benchmark_configs = [
        BenchmarkUtils.config_from_json_file(f"{config_folder}/config_{x}.json")
        for x in display_benchmarks
    ]
    """
    benchmark_configs = []
    for file_name in sorted(os.listdir(config_folder)):
        if file_name.endswith(".json"):
            benchmark_dict = BenchmarkUtils.config_dict_from_file(
                config_folder + file_name
            )
            # must match parent if one exists
            if (parent or "") == (benchmark_dict.get("parent", "")):
                benchmark_configs.append(BenchmarkConfig.from_dict(benchmark_dict))

    return benchmark_configs


def benchmark_benchmark_id_get(benchmark_id: str) -> Benchmark:
    config = BenchmarkConfig.from_dict(BenchmarkUtils.config_dict_from_id(benchmark_id))
    if config.type == "abstract":
        return Benchmark(config, None)
    file_path = os.path.join(
        "explainaboard_web/impl/cached_benchmark_results/", benchmark_id + ".json"
    )
    plot_path = os.path.join(
        "explainaboard_web/impl/cached_plot_data/", benchmark_id + ".csv"
    )
    if os.path.exists(file_path):
        mod_time = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
        age = datetime.datetime.now() - mod_time
    if not os.path.exists(file_path) or age >= datetime.timedelta(days=1):
        sys_infos = BenchmarkUtils.load_sys_infos(config)
        orig_df = BenchmarkUtils.generate_dataframe_from_sys_infos(config, sys_infos)
        view_dfs = BenchmarkUtils.generate_view_dataframes(config, orig_df)
        json_dict = {k: v.to_dict() for k, v in view_dfs}
        with open(file_path, "w") as outfile:
            json.dump(json_dict, outfile)
        if config.parent:
            list_data = [
                json_dict["Demographic-weighted Global Average"]["score"][0],
                json_dict["Linguistic-weighted Global Average"]["score"][0],
                datetime.datetime.now(),
            ]
            with open(plot_path, "a", newline="") as f_object:
                writer_object = writer(f_object)
                writer_object.writerow(list_data)
                f_object.close()
    f = open(file_path)
    views = [
        BenchmarkUtils.dataframe_to_table(k, pd.DataFrame.from_dict(v))
        for k, v in json.load(f).items()
    ]
    return Benchmark(config, views)


def benchmark_plot_benchmark_id_get(benchmark_id):
    config = BenchmarkConfig.from_dict(BenchmarkUtils.config_dict_from_id(benchmark_id))
    if config.type == "abstract":
        return PlotData([], [], [])
    plot_path = os.path.join(
        "explainaboard_web/impl/cached_plot_data/", benchmark_id + ".csv"
    )
    demographic_weighted_list, linguistic_weighted_list, times = [], [], []
    with open(plot_path, "r", newline="") as f_object:
        reader_object = reader(f_object)
        for row in reader_object:
            demographic_weighted_list.append(float(row[0]))
            linguistic_weighted_list.append(float(row[1]))
            times.append(datetime.datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S.%f"))
    times = [time.date() for time in times]
    return PlotData(demographic_weighted_list, linguistic_weighted_list, times)


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
    shared_users: Optional[list[str]],
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
        page=page,
        page_size=page_size,
        ids=ids,
        system_name=system_name,
        task=task,
        dataset_name=dataset,
        subdataset_name=subdataset,
        split=split,
        sort=[(sort_field, dir)],
        creator=creator,
        shared_users=shared_users,
    )


def systems_post(body: SystemCreateProps) -> System:
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
    user = get_user()
    has_access = user.is_authenticated and (
        sys.creator == user.email or user.email in sys.shared_users
    )
    if sys.is_private and not has_access:
        abort_with_error_message(403, "system access denied", 40302)
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
    shared_users = None
    page = 0
    page_size = len(system_ids)
    sort = None
    systems: list[System] = SystemDBUtils.find_systems(
        ids=system_ids,
        page=page,
        page_size=page_size,
        task=task,
        system_name=system_name,
        dataset_name=dataset_name,
        subdataset_name=subdataset_name,
        split=split,
        sort=sort,
        creator=creator,
        shared_users=shared_users,
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
        system_outputs = [
            processor.deserialize_system_output(cast(dict, x)) for x in system_outputs
        ]

        performance_over_bucket = processor.bucketing_samples(
            system_output_info,
            system_outputs,
            system.active_features,
            metric_stats,
        )

        single_analyses[system.system_id] = performance_over_bucket

    return SystemAnalysesReturn(single_analyses)
