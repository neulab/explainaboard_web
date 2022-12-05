from __future__ import annotations

import json
import logging
import re
import traceback
from datetime import datetime
from typing import Any, NamedTuple

from bson import ObjectId
from explainaboard import DatalabLoaderOption, FileType, Source, get_loader_class
from pymongo.client_session import ClientSession

from explainaboard_web.impl.auth import get_user
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.db_utils.user_db_utils import UserDBUtils
from explainaboard_web.impl.internal_models.system_model import SystemModel
from explainaboard_web.impl.utils import abort_with_error_message
from explainaboard_web.models import (
    AnalysisCase,
    System,
    SystemMetadata,
    SystemMetadataUpdatable,
    SystemOutput,
    SystemOutputProps,
)


class SystemDBUtils:

    _COLON_RE = r"^([A-Za-z0-9_-]+): (.+)$"

    @staticmethod
    def _parse_colon_line(line) -> tuple[str, str]:
        m = re.fullmatch(SystemDBUtils._COLON_RE, line)
        if m is None:
            abort_with_error_message(
                400, f"poorly formatted system_details line {line}"
            )
            return "", ""  # to placate mypy, which doesn't recognize "abort"
        else:
            return m.group(1), m.group(2)

    @staticmethod
    def _parse_system_details(system_details: str) -> dict | None:
        if len(system_details.strip()) == 0:
            ret = None
        else:
            try:
                ret = json.loads(system_details)
            except Exception:
                ret_list = [
                    SystemDBUtils._parse_colon_line(line)
                    for line in system_details.split("\n")
                ]
                ret = {k: v for k, v in ret_list}
        return ret

    @staticmethod
    def _parse_system_details_in_doc(
        document: dict, metadata: SystemMetadata | SystemMetadataUpdatable
    ):
        if (
            document.get("system_details")
            and "__TO_PARSE__" in document["system_details"]
        ):
            parsed = SystemDBUtils._parse_system_details(
                document["system_details"]["__TO_PARSE__"]
            )
            metadata.system_details = parsed
            document["system_details"] = parsed

    @staticmethod
    def query_systems(
        query: list | dict,
        page: int,
        page_size: int,
        sort: list | None = None,
    ) -> FindSystemsReturn:

        permissions_list = [{"is_private": False}]
        user = get_user()
        if user:
            permissions_list.append({"creator": user.id})
            permissions_list.append({"shared_users": user.email})
        permission_query = {"$or": permissions_list}

        if isinstance(query, dict):
            query = [query]
        query = {"$and": query + [permission_query]}

        cursor, total = DBUtils.find(
            DBUtils.DEV_SYSTEM_METADATA, query, sort, page * page_size, page_size
        )
        documents = list(cursor)

        # query preferred_usernames in batch to make it more efficient
        # use set to deduplicate ids
        ids = {doc["creator"] for doc in documents}
        users = UserDBUtils.find_users(list(ids))
        id_to_preferred_username = {user.id: user.preferred_username for user in users}

        systems: list[SystemModel] = []

        for doc in documents:
            doc["preferred_username"] = id_to_preferred_username[doc["creator"]]
            system = SystemModel.from_dict(doc)
            systems.append(system)

        return FindSystemsReturn(systems, total)

    @staticmethod
    def find_systems(
        page: int,
        page_size: int,
        ids: list[str] | None = None,
        system_name: str | None = None,
        task: str | None = None,
        dataset_name: str | None = None,
        subdataset_name: str | None = None,
        split: str | None = None,
        source_language: str | None = None,
        target_language: str | None = None,
        sort: list | None = None,
        creator: str | None = None,
        shared_users: list[str] | None = None,
        dataset_list: list[tuple[str, str, str]] | None = None,
        system_tags: list[str] | None = None,
    ) -> FindSystemsReturn:
        """find multiple systems that matches the filters"""

        search_conditions: list[dict[str, Any]] = []

        if ids:
            search_conditions.append({"_id": {"$in": [ObjectId(_id) for _id in ids]}})
        if system_name:
            search_conditions.append({"system_name": {"$regex": rf"^{system_name}.*"}})
        if task:
            search_conditions.append({"task": task})
        if dataset_name:
            search_conditions.append({"dataset.dataset_name": dataset_name})
        if subdataset_name:
            search_conditions.append({"dataset.sub_dataset": subdataset_name})
        if source_language:
            search_conditions.append({"source_language": source_language})
        if target_language:
            search_conditions.append({"target_language": target_language})
        if split:
            search_conditions.append({"dataset.split": split})
        if creator:
            search_conditions.append({"creator": creator})
        if shared_users:
            search_conditions.append({"shared_users": shared_users})
        if system_tags:
            search_conditions.append({"system_tags": {"$all": system_tags}})

        if dataset_list:
            dataset_dicts = [
                {
                    "dataset.dataset_name": ds[0],
                    "dataset.sub_dataset": ds[1],
                    "dataset.split": ds[2],
                }
                for ds in dataset_list
            ]
            search_conditions.append({"$or": dataset_dicts})

        systems, total = SystemDBUtils.query_systems(
            search_conditions, page, page_size, sort
        )
        if ids and not sort:
            # preserve id order if no `sort` is provided
            orders = {sys_id: i for i, sys_id in enumerate(ids)}
            systems.sort(key=lambda sys: orders[sys.system_id])
        return FindSystemsReturn(systems, total)

    @staticmethod
    def _load_sys_output(
        system: SystemModel,
        system_output: SystemOutputProps,
        custom_dataset: SystemOutputProps | None,
    ):
        """
        Load the system output from the uploaded file
        """
        if custom_dataset:
            return get_loader_class(task=system.task)(
                dataset_data=custom_dataset.data,
                output_data=system_output.data,
                dataset_source=Source.in_memory,
                output_source=Source.in_memory,
                dataset_file_type=FileType(custom_dataset.file_type),
                output_file_type=FileType(system_output.file_type),
            ).load()
        elif system.dataset:
            return (
                get_loader_class(task=system.task)
                .from_datalab(
                    dataset=DatalabLoaderOption(
                        system.dataset.dataset_name,
                        system.dataset.sub_dataset,
                        system.dataset.split,
                    ),
                    output_data=system_output.data,
                    output_file_type=FileType(system_output.file_type),
                    output_source=Source.in_memory,
                )
                .load()
            )
        raise ValueError("neither dataset or custom_dataset is available")

    @staticmethod
    def create_system(
        metadata: SystemMetadata,
        system_output: SystemOutputProps,
        custom_dataset: SystemOutputProps | None = None,
    ) -> System:
        """
        Create a system given metadata and outputs, etc.
        """

        def _validate_and_create_system():
            system = {"results": {}}

            user = get_user()
            system["creator"] = user.id
            system["preferred_username"] = user.preferred_username
            system["created_at"] = system["last_modified"] = datetime.utcnow()

            if metadata.dataset_metadata_id:
                if not metadata.dataset_split:
                    abort_with_error_message(
                        400, "dataset split is required if a dataset is chosen"
                    )
                if custom_dataset:
                    abort_with_error_message(
                        400,
                        "both datalab dataset and custom dataset are "
                        "provided. please only select one.",
                    )
                dataset = DatasetDBUtils.find_dataset_by_id(
                    metadata.dataset_metadata_id
                )
                if dataset:
                    if metadata.dataset_split not in dataset.split:
                        abort_with_error_message(
                            400,
                            f"{metadata.dataset_split} is not a valid split "
                            f"for {dataset.dataset_name}",
                        )
                    if metadata.task not in dataset.tasks:
                        abort_with_error_message(
                            400,
                            f"dataset {dataset.dataset_name} cannot be used for "
                            f"{metadata.task} tasks",
                        )
                    system["dataset"] = {
                        "dataset_id": dataset.dataset_id,
                        "split": metadata.dataset_split,
                        "dataset_name": dataset.dataset_name,
                        "sub_dataset": dataset.sub_dataset,
                    }
                else:
                    abort_with_error_message(
                        400, f"dataset: {metadata.dataset_metadata_id} cannot be found"
                    )
            system.update(metadata.to_dict())
            # -- parse the system details if getting a string from the frontend
            SystemDBUtils._parse_system_details_in_doc(system, metadata)
            return SystemModel.from_dict(system)

        system = _validate_and_create_system()

        try:
            # -- load the system output into memory from the uploaded file(s)
            system_output_data = SystemDBUtils._load_sys_output(
                system, system_output, custom_dataset
            )
        except ValueError as e:
            traceback.print_exc()
            abort_with_error_message(400, str(e))
            # mypy doesn't seem to understand the NoReturn type in an except block.
            # It's a noop to fix it
            raise e
        else:

            def db_operations(session: ClientSession) -> None:
                system.save_to_db(session)
                system.save_system_output(system_output_data, session)
                try:
                    system.update_overall_statistics(session)
                except ValueError as e:
                    abort_with_error_message(400, str(e))

            DBUtils.execute_transaction(db_operations)
            return system

    @staticmethod
    def update_system_by_id(system_id: str, metadata: SystemMetadataUpdatable) -> bool:
        document = metadata.to_dict()

        # -- parse the system details if getting a string from the frontend
        SystemDBUtils._parse_system_details_in_doc(document, metadata)

        # TODO a more general, flexible solution instead of hard coding
        field_to_value = {
            "system_name": metadata.system_name,
            "is_private": metadata.is_private,
            "shared_users": metadata.shared_users,
            "system_details": metadata.system_details,
            "system_tags": metadata.system_tags,
        }

        return DBUtils.update_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA, system_id, field_to_value
        )

    @staticmethod
    def find_system_by_id(system_id: str):
        sys_doc = DBUtils.find_one_by_id(DBUtils.DEV_SYSTEM_METADATA, system_id)
        if not sys_doc:
            abort_with_error_message(404, f"system id: {system_id} not found")

        sub = sys_doc["creator"]
        user = UserDBUtils.find_user(sub)
        if user is None:
            logging.getLogger().error(f"system creator ID {sub} not found in DB")
            abort_with_error_message(
                500, "system creator ID not found in DB, please contact the sysadmins"
            )
        sys_doc["preferred_username"] = user.preferred_username
        system = SystemModel.from_dict(sys_doc)
        return system

    @staticmethod
    def system_output_from_dict(dikt: dict[str, Any]) -> SystemOutput:
        document = dikt.copy()
        document.pop("_id", None)
        return SystemOutput.from_dict(document)

    @staticmethod
    def analysis_case_from_dict(dikt: dict[str, Any]) -> AnalysisCase:
        document = dikt.copy()
        document.pop("_id", None)
        return AnalysisCase.from_dict(document)

    @staticmethod
    def find_system_outputs(
        system_id: str, output_ids: list[int] | None
    ) -> list[SystemOutput]:
        """
        find multiple system outputs whose ids are in output_ids
        """
        system = SystemDBUtils.find_system_by_id(system_id)
        try:
            sys_data = system.get_raw_system_outputs(output_ids)
        except ValueError:
            abort_with_error_message(400, "invalid output_ids")
        return [SystemDBUtils.system_output_from_dict(doc) for doc in sys_data]

    @staticmethod
    def find_analysis_cases(
        system_id: str, level: str, case_ids: list[int] | None
    ) -> list[AnalysisCase]:
        """
        find multiple system outputs whose ids are in case_ids
        """
        system = SystemDBUtils.find_system_by_id(system_id)
        try:
            sys_data = system.get_raw_analysis_cases(level, case_ids)
        except ValueError:
            abort_with_error_message(400, "invalid case_ids")
        return [SystemDBUtils.analysis_case_from_dict(doc) for doc in sys_data]

    @staticmethod
    def delete_system_by_id(system_id: str) -> None:
        """aborts if the system does not exist or if the user doesn't have permission"""
        user = get_user()
        if not user:
            abort_with_error_message(401, "login required")
        sys = SystemDBUtils.find_system_by_id(system_id)
        if sys.creator != user.id:
            abort_with_error_message(403, "you can only delete your own systems")
        sys.delete()


class FindSystemsReturn(NamedTuple):
    systems: list[SystemModel]
    total: int
