from __future__ import annotations

from typing import Any, Union
from explainaboard.impl.dbModels.SystemModel import SystemModel
from explainaboard.models.system import System


def systems_system_id_get(system_id: str) -> System:
    return SystemModel.find_one_by_id(system_id)
