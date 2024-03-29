# type: ignore
# necessary because mypy is not configured to read from `System`
from __future__ import annotations

import dataclasses
import json
import re
from datetime import datetime
from importlib.metadata import version
from typing import Any, Final

from bson.objectid import ObjectId
from explainaboard import TaskType, get_processor_class
from explainaboard.info import OverallStatistics, SysOutputInfo
from explainaboard.loaders.file_loader import FileLoaderReturn
from explainaboard.metrics.metric import MetricConfig, Score
from explainaboard.serialization.serializers import PrimitiveSerializer
from pymongo.client_session import ClientSession

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.storage import get_storage
from explainaboard_web.impl.utils import (
    abort_with_error_message,
    binarize_bson,
    unbinarize_bson,
)
from explainaboard_web.models.system import System


class SystemModel(System):

    _SYSTEM_OUTPUT_CONST: Final = "__SYSOUT__"
    _CURRENT_SDK_VERSION: Final = version("explainaboard")
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

        # Parse system tags
        system_tags = document.get("system_tags", None)
        if system_tags is None or len(system_tags) == 0:
            document["system_tags"] = []

        return super().from_dict(document)

    def _get_private_properties(self, session: ClientSession | None = None) -> dict:
        """Retrieves privates properties of the system. These properties are meant
        for internal use only.

        Args:
            session: A mongodb session. Private properties are stored in the DB so
                we need to query the DB to retrieve this data. If multiple DB operations
                needs to be performed in one session, the same session should be used
                to query private properties.
                TODO(lyuyang): cache this data in memory. Even if it is cached in
                memory, session is still required in situations where we need to refresh
                the cache.

        Raises:
            ValueError: The system cannot be found in the DB. This method should not be
                called on a system that hasn't been created or has been deleted.
        """
        sys_doc = DBUtils.find_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA, self.system_id, session=session
        )
        if not sys_doc:
            raise ValueError(f"system {self.system_id} does not exist in the DB")
        return sys_doc

    def get_system_info(self) -> SysOutputInfo:
        """retrieves system info from DB"""
        properties = self._get_private_properties()
        serializer = PrimitiveSerializer()
        return serializer.deserialize(properties["system_info"])

    def get_metric_stats(self) -> list[dict[str, list[float]]]:
        """retrieves metric stats from DB"""
        properties = self._get_private_properties()
        return [
            {name: unbinarize_bson(stats) for name, stats in level.items()}
            for level in properties["metric_stats"]
        ]

    def save_to_db(self, session: ClientSession | None = None) -> None:
        """creates a new record if not exist, otherwise update
        TODO(lyuyang): implement update
        """
        self.last_modified = datetime.utcnow()
        document = self.to_dict()
        document["_id"] = ObjectId(document.pop("system_id"))
        document.pop("preferred_username")
        if DBUtils.find_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA, self.system_id, session=session
        ):
            # update existing system
            raise NotImplementedError("update is not implemented")
        else:
            # create new system
            DBUtils.insert_one(DBUtils.DEV_SYSTEM_METADATA, document, session=session)

    def save_system_output(
        self, system_output: FileLoaderReturn, session: ClientSession | None = None
    ):
        """Saves `system_output` to storage. If `system_output` has been saved
        previously, it is replaced with the new one."""
        properties = self._get_private_properties(session=session)
        if properties.get("system_output"):
            # delete previously saved system_output
            get_storage().delete([properties["system_output"]])
        blob_name = f"{self.system_id}/{self._SYSTEM_OUTPUT_CONST}"
        get_storage().compress_and_upload(
            blob_name,
            json.dumps(system_output.samples),
        )
        system_output_metadata = dataclasses.asdict(system_output.metadata)

        serializer = PrimitiveSerializer()
        system_output_metadata[
            "custom_features"
        ] = system_output.metadata.custom_features
        system_output_metadata["custom_features"] = serializer.serialize(
            system_output.metadata.custom_features
        )
        system_output_metadata["custom_analyses"] = serializer.serialize(
            system_output.metadata.custom_analyses
        )

        DBUtils.update_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA,
            self.system_id,
            {
                "system_output": blob_name,
                "system_output_metadata": system_output_metadata,
            },
            session=session,
        )

    def update_overall_statistics(
        self, session: ClientSession, force_update=False
    ) -> None:
        """If the analysis is outdated or if `force_update`, the analysis is
        regenerated and the cache is updated."""
        properties = self._get_private_properties(session=session)
        if not force_update:
            if (
                "system_info" in properties
                and "metric_stats" in properties
                and properties.get("sdk_version_used") == self._CURRENT_SDK_VERSION
            ):
                # cache hit
                return

        def _process() -> OverallStatistics:
            processor = get_processor_class(TaskType(self.task))()
            all_sample_level_metrics = processor.full_metric_list().copy()
            metric_configs: dict[str, MetricConfig] = {}
            for selected_metric in self.metric_names:
                if selected_metric not in all_sample_level_metrics:
                    raise ValueError(f"{selected_metric} is not a supported metric")
                metric_configs[selected_metric] = all_sample_level_metrics[
                    selected_metric
                ]
            system_output_metadata: dict = properties.get("system_output_metadata", {})
            serializer = PrimitiveSerializer()
            processor_metadata = {
                # system properties
                "system_name": self.system_name,
                "source_language": self.source_language,
                "target_language": self.target_language,
                "dataset_name": self.dataset.dataset_name if self.dataset else None,
                "sub_dataset_name": self.dataset.sub_dataset if self.dataset else None,
                "dataset_split": self.dataset.split if self.dataset else None,
                "task_name": self.task,
                "system_details": self.system_details,
                # processor parameters
                "metric_configs": metric_configs,
                "custom_features": serializer.deserialize(
                    system_output_metadata.get("custom_features")
                )
                or {},
                "custom_analyses": serializer.deserialize(
                    system_output_metadata.get("custom_analyses")
                )
                or [],
            }

            return processor.get_overall_statistics(
                metadata=processor_metadata,
                sys_output=self.get_raw_system_outputs(
                    output_ids=None, session=session
                ),
            )

        overall_statistics = _process()
        binarized_metric_stats = [
            {
                metric_name: binarize_bson(stats.get_data())
                for metric_name, stats in level.items()
            }
            for level in overall_statistics.metric_stats
        ]
        sys_info = overall_statistics.sys_info

        def generate_system_update_values():
            if sys_info.results.overall:
                # store overall metrics in the DB so they can be queried
                for level, result in sys_info.results.overall.items():
                    self.results[level] = {}
                    for metric_name, metric_result in result.items():
                        self.results[level][metric_name] = metric_result.get_value(
                            Score, "score"
                        ).value
            serializer = PrimitiveSerializer()
            system_update_values = {
                "results": self.results,
                # cache
                "sdk_version_used": self._CURRENT_SDK_VERSION,
                "system_info": serializer.serialize(sys_info),
                "metric_stats": binarized_metric_stats,
                "analysis_cases": update_analysis_cases(),
            }
            return system_update_values

        def update_analysis_cases() -> dict[str, str]:
            """saves analysis cases to storage and returns an updated analysis_cases
            dict for the DB"""
            analysis_cases_lookup: dict[str, str] = {}  # level: data_path

            # Update analysis cases
            for analysis_level, analysis_cases in zip(
                overall_statistics.sys_info.analysis_levels,
                overall_statistics.analysis_cases,
            ):
                case_list = [dataclasses.asdict(v) for v in analysis_cases]

                blob_name = f"{self.system_id}/{analysis_level.name}"
                get_storage().compress_and_upload(blob_name, json.dumps(case_list))
                analysis_cases_lookup[analysis_level.name] = blob_name
            return analysis_cases_lookup

        update_values = generate_system_update_values()
        DBUtils.update_one_by_id(
            DBUtils.DEV_SYSTEM_METADATA,
            self.system_id,
            update_values,
            session=session,
        )
        if properties.get("analysis_cases"):
            # remove stale data. This needs to be the last operation so it is
            # protected by the transaction.
            blobs_to_delete = [
                blob
                for blob in properties["analysis_cases"].values()
                if blob not in update_values["analysis_cases"].values()
            ]
            get_storage().delete(blobs_to_delete)

    def get_raw_system_outputs(
        self, output_ids: list[int] | None, session: ClientSession | None = None
    ) -> list[dict]:
        """Downloads the system outputs and returns the outputs associated with
        output_ids. If output_ids=None, all system outputs are returned."""
        data_path: str = self._get_private_properties(session=session)["system_output"]
        sys_data_str = get_storage().download_and_decompress(data_path)
        sys_data: list = json.loads(sys_data_str)

        if output_ids is not None:
            try:
                sys_data = [sys_data[x] for x in output_ids]
            except IndexError as e:
                raise ValueError(f"{output_ids=} contains invalid value") from e
        return sys_data

    def get_raw_analysis_cases(
        self, analysis_level: str, case_ids: list[int] | None
    ) -> list[dict]:
        """Downloads the analysis cases for the analysis_level and returns the
        cases associated with case_ids. If case_ids=None, all cases are returned."""
        case_data_lookup: dict[str, str] = self._get_private_properties()[
            "analysis_cases"
        ]
        if analysis_level not in case_data_lookup:
            raise ValueError(
                f"analysis level {analysis_level} does not exist for"
                f" system {self.system_id}"
            )
        data_path = case_data_lookup[analysis_level]
        sys_data_str = get_storage().download_and_decompress(data_path)
        sys_data: list = json.loads(sys_data_str)
        if case_ids is not None:
            try:
                sys_data = [sys_data[x] for x in case_ids]
            except IndexError as e:
                raise ValueError(f"{case_ids=} contains invalid value") from e
        return sys_data

    def delete(self) -> None:
        """Deletes the system from the DB. Subsequent call of save_to_db()
        recreates the system again in the DB."""
        properties = self._get_private_properties()
        blob_names_to_delete: list[str] = [properties["system_output"]]
        blob_names_to_delete.extend(properties.get("analysis_cases", {}).values())

        def db_operations(session: ClientSession):
            result = DBUtils.delete_one_by_id(
                DBUtils.DEV_SYSTEM_METADATA, self.system_id, session=session
            )
            if not result:
                raise RuntimeError(f"failed to delete system {self.system_id}")
            get_storage().delete(blob_names_to_delete)

        DBUtils.execute_transaction(db_operations)
