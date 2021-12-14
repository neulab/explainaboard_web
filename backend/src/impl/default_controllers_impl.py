from __future__ import annotations
from typing import List, Optional
from explainaboard_web.models.systems_body import SystemsBody
from explainaboard_web.models.systems_return import SystemsReturn
from explainaboard_web.models.system_outputs_return import SystemOutputsReturn
from explainaboard_web.impl.utils import abort_with_error_message, decode_base64
from explainaboard_web.impl.db_models.task_metadata_model import TaskMetadataModel
from explainaboard_web.models.task_metadata import TaskMetadata
from explainaboard_web.impl.db_models.system_metadata_model import SystemModel, SystemOutputModel
from explainaboard_web.impl.db_models.dataset_metadata_model import DatasetMetaDataModel
from explainaboard_web.models.datasets_return import DatasetsReturn
import json
import pathlib

""" /tasks """


def tasks_get() -> List[str]:
    """only a temporary solution. will replace the list with the actual tasks list from sdk"""
    path = pathlib.Path.joinpath(pathlib.Path(__file__).parent, "tasks.json")
    print(path)
    with open(path, "r") as f:
        text = f.read()
        tasks = json.loads(text)
    return [str(name) for name in tasks.keys()]


def task_metadata_task_metadata_id_get(task_metadata_id: str) -> TaskMetadata:
    return TaskMetadataModel.find_one_by_id(task_metadata_id)


def task_metadata_get() -> List[TaskMetadataModel]:
    return TaskMetadataModel.find_all()


def task_metadata_task_metadata_id_datasets_get(task_id: str, page: int, page_size: int) -> DatasetsReturn:
    task = TaskMetadataModel.find_one_by_id(task_id)
    if not task:
        abort_with_error_message(404, f"task id: {task_id} not found")
    return task.find_related_datasets(page, page_size)


""" /datasets """


def datasets_dataset_id_get(dataset_id: str) -> DatasetMetaDataModel:
    dataset = DatasetMetaDataModel.find_one_by_id(dataset_id)
    if not dataset:
        abort_with_error_message(404, f"dataset id: {dataset_id} not found")
    return dataset


def datasets_get(dataset_name: Optional[str], task: Optional[str], page: int, page_size: int) -> DatasetsReturn:
    return DatasetMetaDataModel.find(page, page_size, dataset_name, task)


""" /systems """


def systems_system_id_get(system_id: str) -> SystemModel:
    system = SystemModel.find_one_by_id(system_id)
    if not system:
        abort_with_error_message(
            404, f"system id: {system_id} not found")
    return system


def systems_get(system_name: Optional[str], task: Optional[str], page: int, page_size: int) -> SystemsReturn:
    return SystemModel.find(page, page_size, system_name, task)


def systems_post(body: SystemsBody) -> SystemModel:
    """
    aborts with error if fails
    TODO: error handling
    """
    body.system_output.data = decode_base64(body.system_output.data)
    system = SystemModel.create(body.metadata, body.system_output)
    return system


def systems_system_id_outputs_get(system_id: str, output_ids: Optional[str]) -> SystemOutputsReturn:
    return SystemOutputModel(system_id).find(output_ids)
