# type: ignore
# necessary because mypy is not configured to read from `System`
from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from explainaboard import get_processor
from explainaboard.loaders.file_loader import FileLoaderReturn
from explainaboard.serialization.legacy import general_to_dict
from explainaboard_web.impl.db_utils.dataset_db_utils import DatasetDBUtils
from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.storage import get_storage
from explainaboard_web.impl.utils import (
    abort_with_error_message,
    binarize_bson,
    unbinarize_bson,
)
from explainaboard_web.models.system import System
from explainaboard_web.models.system_info import SystemInfo
from explainaboard_web.models.system_metadata import SystemMetadata
from pymongo.client_session import ClientSession


class SystemModel(System):

    _SYSTEM_OUTPUT_CONST = "__SYSOUT__"
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
        if "system_id" not in document:
            document["system_id"] = None

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

    def get_dataset_custom_features(self) -> dict:
        if self.dataset:
            dataset_info = DatasetDBUtils.find_dataset_by_id(self.dataset.dataset_id)
            if dataset_info and dataset_info.custom_features:
                return dict(dataset_info.custom_features)
        return {}

    def save_to_db(self, session: ClientSession | None = None) -> None:
        """creates a new record if not exist, otherwise update
        TODO(lyuyang): implement update
        """
        self.last_modified = datetime.utcnow()
        document = self.to_dict()
        document.pop("system_id")
        document.pop("preferred_username")
        if self.system_id and DBUtils.find_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA, self.system_id, session=session
        ):
            # update existing system
            raise NotImplementedError("update is not implemented")
        else:
            # create new system
            system_id = DBUtils.insert_one(
                DBUtils.DEV_SYSTEM_METADATA, document, session=session
            )
            self.system_id = system_id

    def save_system_output(
        self, system_output: FileLoaderReturn, session: ClientSession | None = None
    ):
        sample_list = [general_to_dict(v) for v in system_output.samples]
        blob_name = f"{self.system_id}/{self._SYSTEM_OUTPUT_CONST}"
        get_storage().compress_and_upload(
            blob_name,
            json.dumps(sample_list),
        )
        output_collection = DBUtils.get_system_output_collection(self.system_id)
        DBUtils.insert_one(
            output_collection,
            {
                "system_id": self.system_id,
                "analysis_level": self._SYSTEM_OUTPUT_CONST,
                "data": blob_name,
            },
            False,
            session,
        )

    def update_overall_statistics(
        self,
        metadata: SystemMetadata,
        system_output_data: FileLoaderReturn,
        session: ClientSession | None = None,
        force_update=False,
    ) -> None:
        """regenerates overall statistics and updates cache
        TODO(lyuyang) This method is not complete. It should only be called once because
        it does not remove system cases from cloud storage properly."""
        if not force_update:
            sys_doc = DBUtils.find_one_by_id(
                DBUtils.DEV_SYSTEM_METADATA, self.system_id, session=session
            )
            if not sys_doc:
                raise ValueError(f"system {self.system_id} hasn't been created")
            if "system_info" in sys_doc and "metric_stats" in sys_doc:
                # cache hit
                return
        sys_doc = DBUtils.find_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA, self.system_id, session=session
        )
        if sys_doc.get("system_info"):
            raise ValueError("update_overall_statistics can only be called once")

        def _process():
            processor = get_processor(self.task)
            metrics_lookup = {
                metric.name: metric
                for metric in get_processor(self.task).full_metric_list()
            }
            metric_configs = []
            for metric_name in metadata.metric_names:
                if metric_name not in metrics_lookup:
                    abort_with_error_message(
                        400, f"{metric_name} is not a supported metric"
                    )
                metric_configs.append(metrics_lookup[metric_name])
            custom_features = system_output_data.metadata.custom_features or {}
            custom_features.update(self.get_dataset_custom_features())
            processor_metadata = {
                **metadata.to_dict(),
                "dataset_name": self.dataset.dataset_name if self.dataset else None,
                "sub_dataset_name": self.dataset.sub_dataset if self.dataset else None,
                "dataset_split": metadata.dataset_split,
                "task_name": metadata.task,
                "metric_configs": metric_configs,
                "custom_features": custom_features,
                "custom_analyses": system_output_data.metadata.custom_analyses or [],
            }

            return processor.get_overall_statistics(
                metadata=processor_metadata, sys_output=system_output_data.samples
            )

        overall_statistics = _process()
        binarized_metric_stats = [
            [binarize_bson(y.get_data()) for y in x]
            for x in overall_statistics.metric_stats
        ]
        sys_info = overall_statistics.sys_info

        def generate_system_update_values():
            if sys_info.analysis_levels and sys_info.results.overall:
                # store overall metrics in the DB so they can be queried
                for level, result in zip(
                    sys_info.analysis_levels, sys_info.results.overall
                ):
                    self.results[level.name] = {}
                    for metric_result in result:
                        self.results[level.name][
                            metric_result.metric_name
                        ] = metric_result.value
            system_update_values = {
                "results": self.results,
                # cache
                "system_info": sys_info.to_dict(),
                "metric_stats": binarized_metric_stats,
            }
            return system_update_values

        def update_analysis_cases():
            system_output_insert_list = []

            # Update analysis cases
            for analysis_level, analysis_cases in zip(
                overall_statistics.sys_info.analysis_levels,
                overall_statistics.analysis_cases,
            ):
                case_list = [general_to_dict(v) for v in analysis_cases]

                blob_name = f"{self.system_id}/{analysis_level.name}"
                get_storage().compress_and_upload(blob_name, json.dumps(case_list))
                system_output_insert_list.append(
                    {
                        "system_id": self.system_id,
                        "analysis_level": analysis_level.name,
                        "data": blob_name,
                    }
                )
            return system_output_insert_list

        # Insert system output and analysis cases

        DBUtils.update_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA,
            self.system_id,
            generate_system_update_values(),
            session=session,
        )
        output_collection = DBUtils.get_system_output_collection(self.system_id)
        DBUtils.insert_many(output_collection, update_analysis_cases(), False, session)
