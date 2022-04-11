from __future__ import annotations
import os
import logging
from typing import List, Optional
from flask import current_app
from pymongo import ASCENDING, DESCENDING
from dataclasses import asdict
from explainaboard_web.models.systems_analyses_body import SystemsAnalysesBody
from explainaboard_web.impl.auth import get_user
from explainaboard_web.models.system import System
from explainaboard_web.models.systems_body import SystemsBody
from explainaboard_web.models.systems_return import SystemsReturn
from explainaboard_web.models.system_outputs_return import SystemOutputsReturn
from explainaboard_web.models.system_analyses_return import SystemAnalysesReturn
from explainaboard_web.impl.utils import abort_with_error_message, decode_base64
from explainaboard_web.models.task_metadata import TaskMetadata
from explainaboard_web.impl.db_models.system_metadata_model import (
    SystemModel,
    SystemOutputsModel,
)
from explainaboard_web.impl.db_models.dataset_metadata_model import DatasetMetaDataModel
from explainaboard_web.models.datasets_return import DatasetsReturn
from explainaboard_web.models.task_category import TaskCategory

from explainaboard import get_task_categories, get_processor
from explainaboard.info import SysOutputInfo, Result
from explainaboard.feature import BucketInfo, Features

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


def tasks_get() -> List[TaskCategory]:
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


def systems_get(system_name: Optional[str], task: Optional[str], page: int, page_size: int, sort_field: str, sort_direction: str, creator: Optional[str]) -> SystemsReturn:
    ids = None
    if not sort_field:
        sort_field = "created_at"
    if not sort_direction:
        sort_direction = "desc"
    if sort_direction not in ["asc", "desc"]:
        abort_with_error_message(400, "sort_direction needs to be one of asc or desc")
    if sort_field != "created_at":
        sort_field = f"analysis.results.overall.{sort_field}.value"

    direction = ASCENDING if sort_direction == "asc" else DESCENDING

    return SystemModel.find(ids, system_name, task, creator, page, page_size, [(sort_field, direction)])


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


def systems_analyses_post(body: SystemsAnalysesBody) -> SystemAnalysesReturn:
    system_name = None
    task = None
    creator = None
    page = 0
    page_size = 10
    sort = None
    systems_return: SystemsReturn = SystemModel.find(
        body.system_ids, 
        system_name,
        task,
        creator,
        page,
        page_size,
        sort,
        include_metric_stats=True)
    systems = systems_return.systems
    if len(systems) == 0:
        return SystemAnalysesReturn([])
    
     # TODO(chihhao) supports only a single system for now
    system = systems[0]

    system_info_dict = system.system_info.to_dict()
    system_output_info = SysOutputInfo.from_dict(system_info_dict)
    
    # TODO(chihhao) bug in SDK, nested dataclasses must be from_dict()ed properly
    # move this function to SDK in the future or add proper from_dict() methods in SDK
    for feature_name, feature in system_output_info.features.items():
        bucket_info = feature["bucket_info"]
        if bucket_info is not None:
            bucket_info = BucketInfo(**bucket_info)
        system_output_info.features[feature_name]["bucket_info"] = bucket_info
    system_output_info.results = Result(**system_output_info.results)

    logging.getLogger('connexion.operation').error(system_output_info)

    # Get all outputs
    output_ids = None
    system_outputs = SystemOutputsModel(system.system_id).find(output_ids).system_outputs

    processor = get_processor(system_output_info.task_name)
    fine_grained_statistics = processor.get_fine_grained_statistics(
        system_output_info,
        system_outputs,
        system.active_features,
        system.metric_stats
    )
    return SystemAnalysesReturn([asdict(fine_grained_statistics)])
    
    
