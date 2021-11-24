from __future__ import annotations

from explainaboard.impl.db_models.task_metadata_model import TaskMetadataModel
from explainaboard.models.task_metadata import TaskMetadata
from explainaboard.impl.db_models.system_metadata_model import SystemMetadataModel
from explainaboard.models.system_metadata import SystemMetadata


def system_metadata_system_metadata_id_get(system_metadata_id: str) -> SystemMetadata:
    return SystemMetadataModel.find_one_by_id(system_metadata_id)


def task_metadata_task_metadata_id_get(task_metadata_id: str) -> TaskMetadata:
    return TaskMetadataModel.find_one_by_id(task_metadata_id)
