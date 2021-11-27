from __future__ import annotations
from typing import List, Optional
from explainaboard.impl.utils import abort_with_error_message
from explainaboard.impl.db_models.task_metadata_model import TaskMetadataModel
from explainaboard.models.task_metadata import TaskMetadata
from explainaboard.impl.db_models.system_metadata_model import SystemMetadataModel
from explainaboard.impl.db_models.dataset_metadata_model import DatasetMetaDataModel
from explainaboard.models.system_metadata import SystemMetadata
from explainaboard.models.datasets_return import DatasetsReturn


def system_metadata_system_metadata_id_get(system_metadata_id: str) -> SystemMetadata:
    system = SystemMetadataModel.find_one_by_id(system_metadata_id)
    if not system:
        abort_with_error_message(
            404, f"system id: {system_metadata_id} not found")
    return system


def task_metadata_task_metadata_id_get(task_metadata_id: str) -> TaskMetadata:
    return TaskMetadataModel.find_one_by_id(task_metadata_id)


def datasets_dataset_id_get(dataset_id: str) -> DatasetMetaDataModel:
    dataset = DatasetMetaDataModel.find_one_by_id(dataset_id)
    if not dataset:
        abort_with_error_message(404, f"dataset id: {dataset_id} not found")
    return dataset


def datasets_get(dataset_name: Optional[str], task: Optional[str], page: int, page_size: int) -> DatasetsReturn:
    return DatasetMetaDataModel.find(page, page_size, dataset_name, task)


def task_metadata_task_metadata_id_datasets_get(task_id: str, page: int, page_size: int) -> DatasetsReturn:
    task = TaskMetadataModel.find_one_by_id(task_id)
    if not task:
        abort_with_error_message(404, f"task id: {task_id} not found")
    return task.find_related_datasets(page, page_size)
