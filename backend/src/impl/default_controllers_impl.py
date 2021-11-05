from __future__ import annotations

from explainaboard.impl.db_models.system_model import SystemModel
from explainaboard.models.system import System


def systems_system_id_get(system_id: str) -> System:
    return SystemModel.find_one_by_id(system_id)
