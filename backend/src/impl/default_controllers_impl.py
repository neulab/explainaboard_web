from __future__ import annotations

from explainaboard.impl.db_models.task_metadata_model import TaskMetadataModel
from explainaboard.models.task_metadata import TaskMetadata
from explainaboard.impl.db_models.system_model import SystemModel
from explainaboard.models.system import System


def systems_system_id_get(system_id: str) -> System:
    return SystemModel.find_one_by_id(system_id)


def task_metadata_task_metadata_id_get(task_metadata: str) -> TaskMetadata:
    return TaskMetadataModel.find_one_by_id(task_metadata)
