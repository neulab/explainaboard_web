from __future__ import annotations

import dataclasses
import os
from typing import Optional

from explainaboard import get_processor, get_task_categories
from explainaboard.feature import (
    BucketInfo,
    ClassLabel,
    Position,
    Sequence,
    Set,
    Span,
    Value,
)
from explainaboard.info import Result, SysOutputInfo
from explainaboard.metric import MetricStats
from explainaboard.utils.tokenizer import get_default_tokenizer
from explainaboard_web.impl.auth import get_user
from explainaboard_web.impl.db_models.dataset_metadata_model import DatasetMetaDataModel
from explainaboard_web.impl.db_models.system_metadata_model import (
    SystemModel,
    SystemOutputsModel,
)
from explainaboard_web.impl.utils import (
    abort_with_error_message,
    decode_base64,
    is_boolean_string,
    string_to_boolean,
)
from explainaboard_web.models.datasets_return import DatasetsReturn
from explainaboard_web.models.system import System
from explainaboard_web.models.system_analyses_return import SystemAnalysesReturn
from explainaboard_web.models.system_info import SystemInfo
from explainaboard_web.models.system_outputs_return import SystemOutputsReturn
from explainaboard_web.models.systems_body import SystemsBody
from explainaboard_web.models.systems_return import SystemsReturn
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
    return get_task_categories()


""" /datasets """


def datasets_dataset_id_get(dataset_id: str) -> DatasetMetaDataModel:
    dataset = DatasetMetaDataModel.find_one_by_id(dataset_id)
    if not dataset:
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
    return DatasetMetaDataModel.find(
        page, page_size, parsed_dataset_ids, dataset_name, task
    )


""" /systems """


def systems_system_id_get(system_id: str) -> SystemModel:
    system = SystemModel.find_one_by_id(system_id)
    if not system:
        abort_with_error_message(404, f"system id: {system_id} not found")
    return system


def systems_get(
    system_name: Optional[str],
    task: Optional[str],
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
        sort_field = f"analysis.results.overall.{sort_field}.value"

    dir = ASCENDING if sort_direction == "asc" else DESCENDING

    return SystemModel.find(
        ids, page, page_size, system_name, task, [(sort_field, dir)], creator
    )


def systems_post(body: SystemsBody) -> SystemModel:
    """
    aborts with error if fails
    TODO: error handling
    """
    body.system_output.data = decode_base64(body.system_output.data)
    system = SystemModel.create(body.metadata, body.system_output)
    return system


def systems_system_id_outputs_get(
    system_id: str, output_ids: Optional[str]
) -> SystemOutputsReturn:
    """
    TODO: return special error/warning if some ids cannot be found
    """
    return SystemOutputsModel(system_id).find(output_ids)


def systems_system_id_delete(system_id: str):
    success = SystemModel.delete_one_by_id(system_id)
    if success:
        return "Success"
    abort_with_error_message(400, f"cannot find system_id: {system_id}")


def systems_analyses_get(system_ids_str: str, pairwise_performance_gap: str):
    if not is_boolean_string(pairwise_performance_gap):
        abort_with_error_message(
            400,
            "pairwise_performance_gap is not a boolean string: "
            + f"{pairwise_performance_gap}",
        )
    do_pairwise_performance_gap = string_to_boolean(pairwise_performance_gap)

    single_analyses: list[dict] = []
    system_ids: list = system_ids_str.split(",")
    system_name = None
    task = None
    creator = None
    page = 0
    page_size = len(system_ids)
    sort = None
    systems: list[System] = SystemModel.find(
        system_ids,
        page,
        page_size,
        system_name,
        task,
        sort,
        creator,
        include_metric_stats=True,
    ).systems
    systems_len = len(systems)
    if systems_len == 0:
        return SystemAnalysesReturn(single_analyses)

    if do_pairwise_performance_gap and systems_len != 2:
        abort_with_error_message(
            400,
            "pairwise_performance_gap=true"
            + f" only accepts 2 systems, got: {systems_len}",
        )

    for system in systems:
        system_info: SystemInfo = system.system_info
        system_info_dict = system_info.to_dict()
        system_output_info = SysOutputInfo.from_dict(system_info_dict)

        # TODO(chihhao) bug in SDK
        # nested dataclasses must be from_dict()ed properly
        # move this function to SDK in the future or
        # add proper from_dict() methods in SDK
        for feature_name, feature in system_output_info.features.items():
            bucket_info = feature["bucket_info"]
            if bucket_info is not None:
                bucket_info = BucketInfo(**bucket_info)

            # TODO Feature is not getting from_dict()ed properly, hardcode for now:
            _type = feature["_type"]
            feature.pop("_type")
            if _type == ClassLabel._type:
                feature = ClassLabel(**feature)
            elif _type == Sequence._type:
                feature = Sequence(**feature)
            elif _type == Set._type:
                feature = Set(**feature)
            elif _type == Position._type:
                feature = Position(**feature)
            elif _type == Span._type:
                feature = Span(**feature)
            elif _type == Value._type:
                feature = Value(**feature)

            feature.bucket_info = bucket_info
            system_output_info.features[feature_name] = feature

        system_output_info.results = Result(**system_output_info.results)
        # The order of getting the processor first then setting
        # the tokenizer is unnatural, but in the SDK get_default_tokenizer
        # relies on the processor's TaskType inforamtion

        processor = get_processor(system_output_info.task_name)
        system_output_info.tokenizer = get_default_tokenizer(
            task_type=processor.task_type, lang=system_info.language
        )

        metric_stats = [MetricStats(stat) for stat in system.metric_stats]

        # Get the entire system outputs
        output_ids = None
        system_outputs = (
            SystemOutputsModel(system.system_id)
            .find(output_ids, limit=0)
            .system_outputs
        )

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
                performance_over_bucket[feature][
                    new_bucket_key_str
                ] = bucket_performance
                performance_over_bucket[feature].pop(bucket_key)

        single_analyses.append(performance_over_bucket)

    return SystemAnalysesReturn(single_analyses)
