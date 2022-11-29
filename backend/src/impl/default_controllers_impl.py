from __future__ import annotations

import binascii
import datetime
import json
import logging
import os
from functools import lru_cache

import pandas as pd
from explainaboard import (
    DatalabLoaderOption,
    TaskType,
    get_loader_class,
    get_processor_class,
)
from explainaboard.analysis.analyses import BucketAnalysis
from explainaboard.analysis.case import AnalysisCase
from explainaboard.info import SysOutputInfo
from explainaboard.metrics.metric import SimpleMetricStats
from explainaboard.serialization.serializers import PrimitiveSerializer
from explainaboard.utils.cache_api import get_cache_dir, open_cached_file, sanitize_path
from explainaboard.utils.typing_utils import narrow
from flask import current_app
from pymongo import ASCENDING, DESCENDING
from pymongo.client_session import ClientSession

from explainaboard_web.impl.analyses.significance_analysis import (
    pairwise_significance_test,
)
from explainaboard_web.impl.auth import get_user
from explainaboard_web.impl.db_utils.benchmark_db_utils import BenchmarkDBUtils
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.db_utils.system_db_utils import SystemDBUtils
from explainaboard_web.impl.language_code import get_language_codes
from explainaboard_web.impl.metric_descriptions import get_metric_descriptions
from explainaboard_web.impl.private_dataset import is_private_dataset
from explainaboard_web.impl.tasks import get_task_categories
from explainaboard_web.impl.utils import (
    abort_with_error_message,
    decode_base64,
    get_api_version,
)
from explainaboard_web.models import (
    Benchmark,
    BenchmarkConfig,
    BenchmarkCreateProps,
    BenchmarkUpdateProps,
    DatasetMetadata,
    DatasetsReturn,
    LanguageCode,
    SingleAnalysis,
    System,
    SystemAnalysesReturn,
    SystemCreateProps,
    SystemInfo,
    SystemOutput,
    SystemsAnalysesBody,
    SystemsReturn,
    SystemUpdateProps,
    Task,
    TaskCategory,
)
from explainaboard_web.models.user import User


def _is_creator(obj: System | BenchmarkConfig, user: User) -> bool:
    """check if a user is the creator of a system or benchmark"""
    return obj.creator == user.id


def _is_shared_user(obj: System | BenchmarkConfig, user: User) -> bool:
    """check if a user is a shared user of a system or benchmark"""
    return obj.shared_users and user.email in obj.shared_users


def _has_write_access(obj: System | BenchmarkConfig) -> bool:
    """check if the current user has write access of a system or benchmark"""
    user = get_user()
    return user and _is_creator(obj, user)


def _has_read_access(obj: System | BenchmarkConfig) -> bool:
    """check if the current user has read access of a system or benchmark"""
    user = get_user()
    return not obj.is_private or (
        user and (_is_creator(obj, user) or _is_shared_user(obj, user))
    )


""" /info """


@lru_cache(maxsize=None)
def info_get():
    return {
        "env": os.getenv("EB_ENV"),
        "api_version": get_api_version(),
        "firebase_api_key": current_app.config.get("FIREBASE_API_KEY"),
    }


""" /user """


def user_get() -> User:
    user = get_user()
    if not user:
        abort_with_error_message(401, "login required")
    return user


""" /tasks """


def tasks_get() -> list[TaskCategory]:
    """Returns a list of task categories and metadata for each
    task.
    NOTE: supported_metrics only returns metrics for the example
    level. This is because the SDK does not provide a way to configure
    the list of metrics for other analysis levels. This should be fixed
    in the future.
    """
    _categories = get_task_categories()
    categories: list[TaskCategory] = []
    for _category in _categories:
        tasks: list[Task] = []
        for _task in _category.tasks:
            loader_class = get_loader_class(_task.name)
            supported_formats = loader_class.supported_file_types()
            supported_metrics = list(
                get_processor_class(TaskType(_task.name)).full_metric_list().keys()
            )
            tasks.append(
                Task(
                    _task.name, _task.description, supported_metrics, supported_formats
                )
            )
        categories.append(TaskCategory(_category.name, _category.description, tasks))
    return categories


""" /languagecodes """


def language_codes_get() -> list[LanguageCode]:
    language_codes = get_language_codes()
    return language_codes


""" /datasets """


def datasets_dataset_id_get(dataset_id: str) -> DatasetMetadata:
    dataset = DatasetDBUtils.find_dataset_by_id(dataset_id)
    if dataset is None:
        abort_with_error_message(404, f"dataset id: {dataset_id} not found")
    return dataset


def datasets_get(
    dataset_ids: str | None,
    dataset_name: str | None,
    task: str | None,
    page: int,
    page_size: int,
) -> DatasetsReturn:
    parsed_dataset_ids = dataset_ids.split(",") if dataset_ids else None
    return DatasetDBUtils.find_datasets(
        page=page,
        page_size=page_size,
        dataset_ids=parsed_dataset_ids,
        dataset_name=dataset_name,
        task=task,
    )


""" /metricdescriptions """


def metric_descriptions_get() -> dict[str, str]:
    return get_metric_descriptions()


""" /benchmarks """


def benchmark_configs_get(parent: str | None) -> list[BenchmarkConfig]:
    return BenchmarkDBUtils.find_configs(parent)


def benchmark_get_by_id(benchmark_id: str, by_creator: bool) -> Benchmark:
    config = BenchmarkDBUtils.find_config_by_id(benchmark_id)
    if not _has_read_access(config):
        abort_with_error_message(403, "benchmark access denied", 40302)
    if config.type == "abstract":
        return Benchmark(config, None, None)
    file_path = benchmark_id + "_benchmark.json"
    benchmark_file = open_cached_file(file_path, datetime.timedelta(seconds=1))
    if not benchmark_file:
        sys_infos = BenchmarkDBUtils.load_sys_infos(config)
        orig_df = BenchmarkDBUtils.generate_dataframe_from_sys_infos(config, sys_infos)

        system_dfs = BenchmarkDBUtils.generate_view_dataframes(
            config, orig_df, by_creator=False
        )
        system_dict = {k: v.to_dict() for k, v in system_dfs}
        creator_dfs = BenchmarkDBUtils.generate_view_dataframes(
            config, orig_df, by_creator=True
        )
        creator_dict = {k: v.to_dict() for k, v in creator_dfs}

        json_dict = {"system": system_dict, "creator": creator_dict}
        benchmark_file = os.path.join(get_cache_dir(), sanitize_path(file_path))
        with open(benchmark_file, "w") as outfile:
            json.dump(json_dict, outfile)
    update_time = (
        datetime.datetime.fromtimestamp(os.path.getmtime(benchmark_file))
    ).strftime("%m-%d-%Y %H:%M:%S")
    f = open(benchmark_file)
    if by_creator:
        view_dict = json.load(f)["creator"]
    else:
        view_dict = json.load(f)["system"]
    plot_dict = BenchmarkDBUtils.generate_plots(benchmark_id)
    views = []
    for k, v in view_dict.items():
        if by_creator:
            col_name = "creator"
        elif k == "Most-underserved Languages":
            col_name = "source_language"
        else:
            col_name = "system_name"
        views.append(
            BenchmarkDBUtils.dataframe_to_table(
                k, pd.DataFrame.from_dict(v), plot_dict, col_name
            )
        )
    return Benchmark(config, views, update_time)


def benchmark_post(body: BenchmarkCreateProps) -> BenchmarkConfig:
    if body.parent == "" and body.views is None:
        abort_with_error_message(
            400, "views (type array) is a required property when parent is empty."
        )

    return BenchmarkDBUtils.create_benchmark(body)


def benchmark_update_by_id(body: BenchmarkUpdateProps, benchmark_id: str):
    config = BenchmarkDBUtils.find_config_by_id(benchmark_id)
    if not _has_write_access(config):
        abort_with_error_message(403, "benchmark update denied", 40303)

    success = BenchmarkDBUtils.update_benchmark_by_id(benchmark_id, body)
    if success:
        return "Success"
    abort_with_error_message(400, f"failed to update benchmark {benchmark_id}")


def benchmark_delete_by_id(benchmark_id: str):
    BenchmarkDBUtils.delete_benchmark_by_id(benchmark_id)
    return "Success"


""" /systems """


def systems_get_by_id(system_id: str) -> System:
    system = SystemDBUtils.find_system_by_id(system_id)
    if not _has_read_access(system):
        abort_with_error_message(403, "system access denied", 40302)
    return system


def systems_get(
    ids: list[str] | None,
    system_name: str | None,
    task: str | None,
    dataset: str | None,
    subdataset: str | None,
    split: str | None,
    page: int,
    page_size: int,
    sort_field: str,
    sort_direction: str,
    creator: str | None,
    shared_users: list[str] | None,
    system_tags: list[str] | None,
) -> SystemsReturn:
    """Returns a systems according to the provided filters

    Args:
        sort_field: created_at or a field within results. `results` has two levels:
            analysis level and metric so the field should be provided as a dot separated
            value (e.g. example.F1)
    """
    if not sort_field:
        sort_field = "created_at"
    if not sort_direction:
        sort_direction = "desc"
    if sort_direction not in ["asc", "desc"]:
        abort_with_error_message(400, "sort_direction needs to be one of asc or desc")
    if sort_field != "created_at":
        sort_field = f"results.{sort_field}"

    dir = ASCENDING if sort_direction == "asc" else DESCENDING

    systems, total = SystemDBUtils.find_systems(
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
        system_tags=system_tags,
    )
    return SystemsReturn(systems, total)


def systems_post(body: SystemCreateProps) -> System:
    """
    aborts with error if fails
    TODO: error handling
    """
    try:
        body.system_output.data = decode_base64(body.system_output.data)
        if body.custom_dataset:
            if not body.custom_dataset.data:
                abort_with_error_message(400, "custom_dataset.data cannot be empty")
            body.custom_dataset.data = decode_base64(body.custom_dataset.data)
    except binascii.Error as e:
        abort_with_error_message(
            400, f"file should be sent in plain text base64. ({e})"
        )
    else:
        system = SystemDBUtils.create_system(
            body.metadata, body.system_output, body.custom_dataset
        )
        return system


def systems_update_by_id(body: SystemUpdateProps, system_id: str):
    system = SystemDBUtils.find_system_by_id(system_id)
    if not _has_write_access(system):
        abort_with_error_message(403, "system update denied", 40303)

    success = SystemDBUtils.update_system_by_id(system_id, body.metadata)
    if success:
        return "Success"
    abort_with_error_message(400, f"failed to update system {system_id}")


def system_outputs_get_by_id(
    system_id: str, output_ids: list[int] | None
) -> list[SystemOutput]:
    """
    TODO: return special error/warning if some ids cannot be found
    """
    system = SystemDBUtils.find_system_by_id(system_id)
    if not _has_read_access(system):
        abort_with_error_message(403, "system access denied", 40302)
    if system.dataset and is_private_dataset(
        DatalabLoaderOption(
            system.dataset.dataset_name,
            system.dataset.sub_dataset,
            system.dataset.split,
        )
    ):
        abort_with_error_message(
            403, f"{system.dataset.dataset_name} is a private dataset", 40301
        )

    return SystemDBUtils.find_system_outputs(system_id, output_ids)


def system_cases_get_by_id(
    system_id: str,
    level: int,
    case_ids: list[int] | None,
) -> list[AnalysisCase]:
    """
    TODO: return special error/warning if some ids cannot be found
    """
    system = SystemDBUtils.find_system_by_id(system_id)
    if not _has_read_access(system):
        abort_with_error_message(403, "system access denied", 40302)
    if system.dataset and is_private_dataset(
        DatalabLoaderOption(
            system.dataset.dataset_name,
            system.dataset.sub_dataset,
            system.dataset.split,
        )
    ):
        abort_with_error_message(
            403, f"{system.dataset.dataset_name} is a private dataset", 40301
        )

    return SystemDBUtils.find_analysis_cases(system_id, level=level, case_ids=case_ids)


def systems_delete_by_id(system_id: str):
    SystemDBUtils.delete_system_by_id(system_id)
    return "Success"


def systems_analyses_post(body: SystemsAnalysesBody):
    system_ids_str = body.system_ids
    feature_to_bucket_info = body.feature_to_bucket_info

    system_analyses: list[SingleAnalysis] = []
    system_ids: list = system_ids_str.split(",")
    page = 0
    page_size = len(system_ids)
    systems = SystemDBUtils.find_systems(
        ids=system_ids, page=page, page_size=page_size
    ).systems
    if len(systems) == 0:
        return SystemAnalysesReturn(system_analyses)

    def update_overall_statistics(session: ClientSession) -> None:
        for sys in systems:
            # refresh overall_statistics if it is outdated
            sys.update_overall_statistics(session=session)

    DBUtils.execute_transaction(update_overall_statistics)

    # performance significance test if there are two systems
    sig_info = []
    serializer = PrimitiveSerializer()
    if len(systems) == 2:
        system1_output_info: SysOutputInfo = systems[0].get_system_info()

        system1_metric_stats: dict[str, SimpleMetricStats] = {
            name: SimpleMetricStats(stats)
            for name, stats in systems[0].get_metric_stats()[0].items()
        }

        system2_output_info: SysOutputInfo = systems[1].get_system_info()
        system2_metric_stats: dict[str, SimpleMetricStats] = {
            name: SimpleMetricStats(stats)
            for name, stats in systems[1].get_metric_stats()[0].items()
        }

        sig_info = pairwise_significance_test(
            system1_output_info,
            system2_output_info,
            system1_metric_stats,
            system2_metric_stats,
        )

    for system in systems:
        system_output_info: SysOutputInfo = system.get_system_info()

        for analysis in system_output_info.analyses:
            if (
                isinstance(analysis, BucketAnalysis)
                and analysis.feature in feature_to_bucket_info
            ):
                # The "fixed" method is required for SDK to perform
                # custom-interval analysis
                analysis.method = "fixed"
                analysis.number = feature_to_bucket_info[analysis.feature].number
                # Convert interval to type tuple so it becomes hashable,
                # as required by SDK
                analysis.setting = [
                    (interval[0], interval[1])
                    for interval in feature_to_bucket_info[analysis.feature].setting
                ]

        logging.getLogger().warning(
            "user-defined bucket analyses are not " "re-implemented"
        )

        metric_stats = [
            {
                metric_name: SimpleMetricStats(stats)
                for metric_name, stats in level.items()
            }
            for level in system.get_metric_stats()
        ]

        # Get analysis cases
        analysis_cases = []
        case_ids = None
        for analysis_level in system.get_system_info().analysis_levels:
            level_cases = SystemDBUtils.find_analysis_cases(
                system_id=system.system_id,
                level=analysis_level.name,
                case_ids=case_ids,
            )
            # Note we are casting here, as SystemOutput.from_dict() actually just
            # returns a dict
            level_cases = [AnalysisCase.from_dict(narrow(dict, x)) for x in level_cases]
            analysis_cases.append(level_cases)

        processor = get_processor_class(TaskType(system_output_info.task_name))()
        processor_result = processor.perform_analyses(
            system_output_info,
            analysis_cases,
            metric_stats,
            skip_failed_analyses=True,
        )
        single_analysis = SingleAnalysis(
            system_info=SystemInfo.from_dict(serializer.serialize(system_output_info)),
            analysis_results=serializer.serialize(processor_result),
        )
        system_analyses.append(single_analysis)

    return SystemAnalysesReturn(system_analyses, sig_info)
