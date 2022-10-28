from __future__ import annotations

import re
from typing import Any

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.utils import abort_with_error_message, unbinarize_bson
from explainaboard_web.models.system import System
from explainaboard_web.models.system_info import SystemInfo


class SystemModel(System):
    """Same as System but implements several helper functions that retrieves
    additional information and persists data to the DB.
    """

    @classmethod
    def from_dict(cls, dikt: dict) -> SystemModel:
        """Validates and initialize a SystemModel object from a dict"""
        document: dict[str, Any] = dikt.copy()
        if document.get("_id"):
            document["system_id"] = str(document.pop("_id"))

        # Parse the shared users
        shared_users = document.get("shared_users", None)
        if shared_users is None or len(shared_users) == 0:
            document.pop("shared_users", None)
        else:
            for user in shared_users:
                if not re.fullmatch(
                    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", user
                ):
                    abort_with_error_message(
                        400, f"invalid email address for shared user {user}"
                    )

        # FIXME(lyuyang): The following for loop is added to work around an issue
        # related to default values of models. Previously, the generated models
        # don't enforce required attributes. This function exploits that loophole.
        # Now that we have fixed that loophole, this function needs some major
        # refactoring. None was assigned for these fields before implicitly. Now
        # we assign them explicitly so this hack does not change the current
        # behavior.
        for required_field in ("created_at", "last_modified", "system_id"):
            if required_field not in document:
                document[required_field] = None

        return super().from_dict(document)

    def get_system_info(self) -> SystemInfo:
        """retrieves system info from DB"""
        sys_doc = DBUtils.find_one_by_id(DBUtils.DEV_SYSTEM_METADATA, self.system_id)
        if not sys_doc:
            abort_with_error_message(404, f"system id: {self.system_id} not found")
        return SystemInfo.from_dict(sys_doc["system_info"])

    def get_metric_stats(self) -> list[list[float]]:
        """retrieves metric stats from DB"""
        sys_doc = DBUtils.find_one_by_id(DBUtils.DEV_SYSTEM_METADATA, self.system_id)
        if not sys_doc:
            abort_with_error_message(404, f"system id: {self.system_id} not found")
        return [[unbinarize_bson(y) for y in x] for x in sys_doc["metric_stats"]]
