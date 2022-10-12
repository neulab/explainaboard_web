from __future__ import annotations

import json
import re
import traceback
from datetime import datetime
from typing import Any

from bson import ObjectId
from explainaboard import DatalabLoaderOption, FileType, Source, get_processor
from explainaboard.loaders.file_loader import FileLoaderReturn
from explainaboard.loaders.loader_registry import get_loader_class
from explainaboard.serialization.legacy import general_to_dict
from explainaboard_web.impl.auth import get_user
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.storage import get_storage
from explainaboard_web.impl.utils import (
    abort_with_error_message,
    binarize_bson,
    unbinarize_bson,
)
from explainaboard_web.models import (
    AnalysisCase,
    DatasetMetadata,
    System,
    SystemInfo,
    SystemMetadata,
    SystemOutput,
    SystemOutputProps,
    SystemsReturn,
)
from pymongo.client_session import ClientSession


class SystemDBUtils:

    _EMAIL_RE = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    _COLON_RE = r"^([A-Za-z0-9_-]+): (.+)$"
    _SYSTEM_OUTPUT_CONST = "__SYSOUT__"

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
    def system_from_dict(
        dikt: dict[str, Any], include_metric_stats: bool = False
    ) -> System:
        document: dict[str, Any] = dikt.copy()
        if document.get("_id"):
            document["system_id"] = str(document.pop("_id"))
        if document.get("is_private") is None:
            document["is_private"] = True
        if document.get("dataset_metadata_id") and document.get("dataset") is None:
            dataset = DatasetDBUtils.find_dataset_by_id(document["dataset_metadata_id"])
            if dataset:
                split = document.get("dataset_split")
                # this check only valid for create
                if split and split not in dataset.split:
                    abort_with_error_message(
                        400, f"{split} is not a valid split for {dataset.dataset_name}"
                    )
                document["dataset"] = dataset.to_dict()
            document.pop("dataset_metadata_id")

        # Parse the shared users
        shared_users = document.get("shared_users", None)
        if shared_users is None or len(shared_users) == 0:
            document.pop("shared_users", None)
        else:
            for user in shared_users:
                if not re.fullmatch(SystemDBUtils._EMAIL_RE, user):
                    abort_with_error_message(
                        400, f"invalid email address for shared user {user}"
                    )

        metric_stats = []
        if "metric_stats" in document:
            metric_stats = document["metric_stats"]
            document["metric_stats"] = []

        # FIXME(lyuyang): The following for loop is added to work around an issue
        # related to default values of models. Previously, the generated models
        # don't enforce required attributes. This function exploits that loophole.
        # Now that we have fixed that loophole, this function needs some major
        # refactoring. None was assigned for these fields before implicitly. Now
        # we assign them explicitly so this hack does not change the current
        # behavior.
        for required_field in (
            "created_at",
            "last_modified",
            "system_id",
            "system_info",
            "metric_stats",
        ):
            if required_field not in document:
                document[required_field] = None

        system = System.from_dict(document)
        if include_metric_stats:
            # Unbinarize to numpy array and set explicitly
            system.metric_stats = [
                [unbinarize_bson(y) for y in x] for x in metric_stats
            ]
        return system

    @staticmethod
    def query_systems(
        query: list | dict,
        page: int,
        page_size: int,
        sort: list | None = None,
        include_datasets: bool = True,
        include_metric_stats: bool = False,
    ):

        permissions_list = [{"is_private": False}]
        if get_user().is_authenticated:
            email = get_user().email
            permissions_list.append({"creator": email})
            permissions_list.append({"shared_users": email})
        permission_query = {"$or": permissions_list}

        if isinstance(query, dict):
            query = [query]
        query = {"$and": query + [permission_query]}

        cursor, total = DBUtils.find(
            DBUtils.DEV_SYSTEM_METADATA, query, sort, page * page_size, page_size
        )
        documents = list(cursor)

        systems: list[System] = []
        if len(documents) == 0:
            return SystemsReturn(systems, 0)

        # query datasets in batch to make it more efficient
        dataset_dict: dict[str, DatasetMetadata] = {}
        if include_datasets:
            dataset_ids: list[str] = []
            for doc in documents:
                if doc.get("dataset_metadata_id"):
                    dataset_ids.append(doc["dataset_metadata_id"])
            datasets = DatasetDBUtils.find_datasets(
                page=0, page_size=0, dataset_ids=dataset_ids, no_limit=True
            ).datasets
            for dataset in datasets:
                dataset_dict[dataset.dataset_id] = dataset

        for doc in documents:
            if not include_datasets or "dataset_metadata_id" not in doc:
                doc.pop("dataset_metadata_id", None)
            else:
                dataset = dataset_dict.get(doc["dataset_metadata_id"])
                if dataset:
                    doc["dataset"] = {
                        "dataset_id": dataset.dataset_id,
                        "dataset_name": dataset.dataset_name,
                        "sub_dataset": dataset.sub_dataset,
                        "tasks": dataset.tasks,
                    }
                doc.pop("dataset_metadata_id")
            doc["system_id"] = doc.pop("_id")
            system = SystemDBUtils.system_from_dict(
                doc, include_metric_stats=include_metric_stats
            )
            systems.append(system)

        return SystemsReturn(systems, total)

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
        include_datasets: bool = True,
        include_metric_stats: bool = False,
        dataset_list: list[tuple[str, str, str]] | None = None,
    ) -> SystemsReturn:
        """find multiple systems that matches the filters"""

        search_conditions: list[dict[str, Any]] = []

        if ids:
            search_conditions.append({"_id": {"$in": [ObjectId(_id) for _id in ids]}})
        if system_name:
            search_conditions.append(
                {"system_info.system_name": {"$regex": rf"^{system_name}.*"}}
            )
        if task:
            search_conditions.append({"system_info.task_name": task})
        if dataset_name:
            search_conditions.append({"system_info.dataset_name": dataset_name})
        if subdataset_name:
            search_conditions.append({"system_info.sub_dataset_name": subdataset_name})
        if source_language:
            search_conditions.append({"system_info.source_language": source_language})
        if target_language:
            search_conditions.append({"system_info.target_language": target_language})
        if split:
            search_conditions.append({"system_info.dataset_split": split})
        if creator:
            search_conditions.append({"creator": creator})
        if shared_users:
            search_conditions.append({"shared_users": shared_users})

        if dataset_list:
            dataset_dicts = [
                {
                    "system_info.dataset_name": ds[0],
                    "system_info.sub_dataset_name": ds[1],
                    "system_info.dataset_split": ds[2],
                }
                for ds in dataset_list
            ]
            search_conditions.append({"$or": dataset_dicts})

        return SystemDBUtils.query_systems(
            search_conditions,
            page,
            page_size,
            sort,
            include_datasets,
            include_metric_stats,
        )

    @staticmethod
    def _load_sys_output(
        system: System,
        metadata: SystemMetadata,
        system_output: SystemOutputProps,
        custom_dataset: SystemOutputProps | None,
        dataset_custom_features: dict,
    ):
        """
        Load the system output from the uploaded file
        """
        if custom_dataset:
            return get_loader_class(task=metadata.task)(
                dataset_data=custom_dataset.data,
                output_data=system_output.data,
                dataset_source=Source.in_memory,
                output_source=Source.in_memory,
                dataset_file_type=FileType(custom_dataset.file_type),
                output_file_type=FileType(system_output.file_type),
            ).load()
        else:
            return (
                get_loader_class(task=metadata.task)
                .from_datalab(
                    dataset=DatalabLoaderOption(
                        system.dataset.dataset_name,
                        system.dataset.sub_dataset,
                        metadata.dataset_split,
                        custom_features=dataset_custom_features,
                    ),
                    output_data=system_output.data,
                    output_file_type=FileType(system_output.file_type),
                    output_source=Source.in_memory,
                )
                .load()
            )

    @staticmethod
    def _process(
        system: System,
        metadata: SystemMetadata,
        system_output_data: FileLoaderReturn,
        custom_features: dict,
    ):
        processor = get_processor(metadata.task)
        metrics_lookup = {
            metric.name: metric
            for metric in get_processor(metadata.task).full_metric_list()
        }
        metric_configs = []
        for metric_name in metadata.metric_names:
            if metric_name not in metrics_lookup:
                abort_with_error_message(
                    400, f"{metric_name} is not a supported metric"
                )
            metric_configs.append(metrics_lookup[metric_name])
        processor_metadata = {
            **metadata.to_dict(),
            "dataset_name": system.dataset.dataset_name if system.dataset else None,
            "sub_dataset_name": system.dataset.sub_dataset if system.dataset else None,
            "dataset_split": metadata.dataset_split,
            "task_name": metadata.task,
            "metric_configs": metric_configs,
            "custom_features": custom_features,
        }

        return processor.get_overall_statistics(
            metadata=processor_metadata, sys_output=system_output_data.samples
        )

    @staticmethod
    def _find_output_or_case_raw(
        system_id: str, analysis_level: str, output_ids: list[int] | None
    ) -> list[dict]:
        filt: dict[str, Any] = {
            "system_id": system_id,
            "analysis_level": analysis_level,
        }
        output_collection = DBUtils.get_system_output_collection(system_id)
        cursor, total = DBUtils.find(
            collection=output_collection,
            filt=filt,
        )
        if total != 1:
            abort_with_error_message(
                400, f"Could not find system outputs for {system_id}"
            )
        data = next(cursor)["data"]
        sys_data_str = get_storage().download_and_decompress(data)
        sys_data: list = json.loads(sys_data_str)

        if output_ids is not None:
            sys_data = [sys_data[x] for x in output_ids]
        return sys_data

    @staticmethod
    def create_system(
        metadata: SystemMetadata,
        system_output: SystemOutputProps,
        custom_dataset: SystemOutputProps | None = None,
    ) -> System:
        """
        Create a system given metadata and outputs, etc.
        """

        # -- parse the system details if getting a string from the frontend
        document = metadata.to_dict()
        if (
            document.get("system_details")
            and "__TO_PARSE__" in document["system_details"]
        ):
            parsed = SystemDBUtils._parse_system_details(
                document["system_details"]["__TO_PARSE__"]
            )
            metadata.system_details = parsed
            document["system_details"] = parsed

        # -- create the object defined in openapi.yaml from only uploaded metadata
        system: System = SystemDBUtils.system_from_dict(document)

        # -- set the creator
        user = get_user()
        system.creator = user.email

        # -- validate the dataset metadata
        if metadata.dataset_metadata_id:
            if not system.dataset:
                abort_with_error_message(
                    400, f"dataset: {metadata.dataset_metadata_id} does not exist"
                )
            if metadata.task not in system.dataset.tasks:
                abort_with_error_message(
                    400,
                    f"dataset {system.dataset.dataset_name} cannot be used for "
                    f"{metadata.task} tasks",
                )

        try:
            # -- find the dataset and grab custom features if they exist
            dataset_custom_features = {}
            if system.dataset:
                dataset_info = DatasetDBUtils.find_dataset_by_id(
                    system.dataset.dataset_id
                )
                if dataset_info and dataset_info.custom_features:
                    dataset_custom_features = dict(dataset_info.custom_features)

            # -- load the system output into memory from the uploaded file(s)
            system_output_data = SystemDBUtils._load_sys_output(
                system, metadata, system_output, custom_dataset, dataset_custom_features
            )
            system_custom_features: dict = (
                system_output_data.metadata.custom_features or {}
            )

            # -- combine custom features from the two sources
            custom_features = dict(system_custom_features)
            custom_features.update(dataset_custom_features)

            # -- do the actual analysis and binarize the metric stats
            overall_statistics = SystemDBUtils._process(
                system, metadata, system_output_data, custom_features
            )
            binarized_stats = [
                [binarize_bson(y.get_data()) for y in x]
                for x in overall_statistics.metric_stats
            ]

            # -- add the analysis results to the system object
            sys_info_dict = overall_statistics.sys_info.to_dict()
            system.system_info = SystemInfo.from_dict(sys_info_dict)
            system.metric_stats = binarized_stats

            def db_operations(session: ClientSession) -> str:
                # Insert system
                system.created_at = system.last_modified = datetime.utcnow()
                document = general_to_dict(system)
                document.pop("system_id")
                document["dataset_metadata_id"] = (
                    system.dataset.dataset_id if system.dataset else None
                )
                document.pop("dataset")
                system_id = DBUtils.insert_one(
                    DBUtils.DEV_SYSTEM_METADATA, document, session=session
                )
                # Compress the system output and upload to Cloud Storage
                insert_list = []
                sample_list = [general_to_dict(v) for v in system_output_data.samples]

                blob_name = f"{system_id}/{SystemDBUtils._SYSTEM_OUTPUT_CONST}"
                get_storage().compress_and_upload(
                    blob_name,
                    json.dumps(sample_list),
                )
                insert_list.append(
                    {
                        "system_id": system_id,
                        "analysis_level": SystemDBUtils._SYSTEM_OUTPUT_CONST,
                        "data": blob_name,
                    }
                )
                # Compress analysis cases
                for i, (analysis_level, analysis_cases) in enumerate(
                    zip(
                        overall_statistics.sys_info.analysis_levels,
                        overall_statistics.analysis_cases,
                    )
                ):
                    case_list = [general_to_dict(v) for v in analysis_cases]

                    blob_name = f"{system_id}/{analysis_level.name}"
                    get_storage().compress_and_upload(blob_name, json.dumps(case_list))
                    insert_list.append(
                        {
                            "system_id": system_id,
                            "analysis_level": analysis_level.name,
                            "data": blob_name,
                        }
                    )
                # Insert system output and analysis cases
                output_collection = DBUtils.get_system_output_collection(system_id)
                result = DBUtils.insert_many(
                    output_collection, insert_list, False, session
                )
                if not result:
                    abort_with_error_message(
                        400, f"failed to insert outputs for {system_id}"
                    )
                return system_id

            # -- perform upload to the DB
            system_id = DBUtils.execute_transaction(db_operations)
            system.system_id = system_id

            # -- replace things that can't be returned through JSON for now
            system.metric_stats = []

            # -- return the system
            return system
        except ValueError as e:
            traceback.print_exc()
            abort_with_error_message(400, str(e))
            # mypy doesn't seem to understand the NoReturn type in an except block.
            # It's a noop to fix it
            raise e

    @staticmethod
    def find_system_by_id(system_id: str):
        sys_doc = DBUtils.find_one_by_id(DBUtils.DEV_SYSTEM_METADATA, system_id)
        if not sys_doc:
            abort_with_error_message(404, f"system id: {system_id} not found")
        system = SystemDBUtils.system_from_dict(sys_doc)
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
        sys_data = SystemDBUtils._find_output_or_case_raw(
            str(system_id), SystemDBUtils._SYSTEM_OUTPUT_CONST, output_ids
        )
        return [SystemDBUtils.system_output_from_dict(doc) for doc in sys_data]

    @staticmethod
    def find_analysis_cases(
        system_id: str, level: str, case_ids: list[int] | None
    ) -> list[AnalysisCase]:
        """
        find multiple system outputs whose ids are in case_ids
        """
        sys_data = SystemDBUtils._find_output_or_case_raw(
            str(system_id), level, case_ids
        )
        return [SystemDBUtils.analysis_case_from_dict(doc) for doc in sys_data]

    @staticmethod
    def delete_system_by_id(system_id: str):
        user = get_user()
        if not user.is_authenticated:
            abort_with_error_message(401, "log in required")

        def db_operations(session: ClientSession) -> bool:
            """TODO: add logging if error"""
            sys = SystemDBUtils.find_system_by_id(system_id)
            if sys.creator != user.email:
                abort_with_error_message(403, "you can only delete your own systems")
            result = DBUtils.delete_one_by_id(
                DBUtils.DEV_SYSTEM_METADATA, system_id, session=session
            )
            if not result:
                abort_with_error_message(400, f"failed to delete system {system_id}")

            # remove system outputs
            output_collection = DBUtils.get_system_output_collection(system_id)
            filt = {"system_id": system_id}
            outputs, _ = DBUtils.find(output_collection, filt)
            data_blob_names = [output["data"] for output in outputs]
            DBUtils.delete_many(output_collection, filt, session=session)

            # Delete system output objects from Storage. This needs to be the last step
            # because we are using transaction support from MongoDB and we cannot roll
            # back an operation on Cloud Storage.
            get_storage().delete(data_blob_names)
            return True

        return DBUtils.execute_transaction(db_operations)
