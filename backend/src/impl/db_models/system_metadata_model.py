from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime
from typing import Any, Optional

from bson.objectid import ObjectId
from explainaboard import (
    DatalabLoaderOption,
    FileType,
    Source,
    get_custom_dataset_loader,
    get_datalab_loader,
    get_processor,
)
from explainaboard.processors.processor_registry import get_metric_list_for_processor
from explainaboard_web.impl.auth import get_user
from explainaboard_web.impl.db_models.db_model import DBModel, MetadataDBModel
from explainaboard_web.impl.utils import (
    abort_with_error_message,
    binarize_bson,
    unbinarize_bson,
)
from explainaboard_web.models.system import System
from explainaboard_web.models.system_create_props import SystemCreateProps
from explainaboard_web.models.system_output import SystemOutput
from explainaboard_web.models.system_output_props import SystemOutputProps
from explainaboard_web.models.system_outputs_return import SystemOutputsReturn
from explainaboard_web.models.systems_return import SystemsReturn
from pymongo.client_session import ClientSession


class SystemModel(MetadataDBModel, System):
    _collection_name = "dev_system_metadata"

    @classmethod
    def create(
        cls,
        metadata: SystemCreateProps,
        system_output: SystemOutputProps,
        custom_dataset: SystemOutputProps | None = None,
    ) -> SystemModel:
        """
        create a system
          1. validate and initialize a SystemModel
          2. load system_output data
          3. generate analysis report from system_output
          -- DB --
          5. write to system_metadata
            (metadata + sufficient statistics + overall analysis)
          6. write to system_outputs
        """
        system = cls.from_dict(metadata.to_dict())

        user = get_user()
        system.creator = user.email

        # validation
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

        def load_sys_output():
            if custom_dataset:
                return get_custom_dataset_loader(
                    task=metadata.task,
                    dataset_data=custom_dataset.data,
                    output_data=system_output.data,
                    dataset_source=Source.in_memory,
                    output_source=Source.in_memory,
                    dataset_file_type=custom_dataset.file_type,
                    output_file_type=system_output.file_type,
                ).load()
            else:
                return get_datalab_loader(
                    task=metadata.task,
                    dataset=DatalabLoaderOption(
                        system.dataset.dataset_name,
                        system.dataset.sub_dataset,
                        metadata.dataset_split,
                    ),
                    output_data=system_output.data,
                    output_file_type=FileType(system_output.file_type),
                    output_source=Source.in_memory,
                ).load()

        def process():
            processor = get_processor(metadata.task)
            metrics_lookup = {
                metric.name: metric
                for metric in get_metric_list_for_processor(metadata.task)
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
                "task_name": metadata.task,
                "dataset_name": system.dataset.dataset_name if system.dataset else None,
                "sub_dataset_name": system.dataset.sub_dataset
                if system.dataset
                else None,
                "dataset_split": metadata.dataset_split,
                "metric_configs": metric_configs,
            }

            return processor.get_overall_statistics(
                metadata=processor_metadata, sys_output=system_output_data
            )

        try:
            system_output_data = load_sys_output()
            overall_statistics = process()
            metric_stats = [
                binarize_bson(metric_stat.get_data())
                for metric_stat in overall_statistics.metric_stats
            ]

            # TODO(chihhao) needs proper serializiation & deserializiation in SDK
            overall_statistics.sys_info.tokenizer = (
                overall_statistics.sys_info.tokenizer.json_repr()
            )
            # TODO avoid None as nullable seems undeclarable for array and object
            # in openapi.yaml
            if overall_statistics.sys_info.results.calibration is None:
                overall_statistics.sys_info.results.calibration = []
            if overall_statistics.sys_info.results.fine_grained is None:
                overall_statistics.sys_info.results.fine_grained = {}

            system.system_info = overall_statistics.sys_info.to_dict()
            system.metric_stats = metric_stats
            system.active_features = overall_statistics.active_features

            def db_operations(session: ClientSession) -> str:
                system_id = system.insert(session)
                SystemOutputsModel(system_id, system_output_data).insert()
                return system_id

            system_id = DBModel.execute_transaction(db_operations)

            # Metric_stats is replaced with empty list for now as
            # bson's Binary and numpy array is not directly serializable
            # in swagger. If the frontend needs it,
            # we can come up with alternatives.
            system.metric_stats = []
            system.system_id = system_id
            return system
        except ValueError as e:
            abort_with_error_message(400, str(e))
            # mypy doesn't seem to understand the NoReturn type in an except block.
            # It's a noop to fix it
            raise e

    @classmethod
    def from_dict(
        cls, dikt: dict[str, Any], include_metric_stats: bool = False
    ) -> SystemModel:
        document: dict[str, Any] = {**dikt}
        if dikt.get("_id"):
            document["system_id"] = str(dikt["_id"])
        if dikt.get("is_private") is None:
            document["is_private"] = True

        metric_stats = []
        if "metric_stats" in document:
            metric_stats = document["metric_stats"]
            document["metric_stats"] = []
        system = super().from_dict(document)
        if include_metric_stats:
            # Unbinarize to numpy array and set explicitly
            system.metric_stats = [unbinarize_bson(stat) for stat in metric_stats]
        return system

    @classmethod
    def find_one_by_id(
        cls, id: str, include_metric_stats: bool = False
    ) -> SystemModel | None:
        """
        find one system that matches the id and return it.
        """
        document = super().find_one_by_id(id)
        if document is not None:
            sys = cls.from_dict(document, include_metric_stats=include_metric_stats)
            if sys.is_private and sys.creator != get_user().email:
                abort_with_error_message(
                    403, "you do not have permission to view this system"
                )
            else:
                return sys
        return None

    @classmethod
    def delete_one_by_id(cls, id: str):
        user = get_user()
        if not user.is_authenticated:
            abort_with_error_message(401, "log in required")

        def db_operations(session: ClientSession) -> bool:
            """TODO: add logging if error"""
            sys = SystemModel.find_one_by_id(
                id,
            )
            if not sys:
                return False
            if sys.creator != user.email:
                abort_with_error_message(403, "you can only delete your own systems")
            result = super(SystemModel, cls).delete_one_by_id(id, session=session)
            if not result:
                return False
            # drop cannot be added to a multi-document transaction, this seems
            # fine because drop is the last operation. If drop fails, delete
            # gets rolled back which is our only requirement here.
            SystemOutputsModel(id).drop(True)
            return True

        return DBModel.execute_transaction(db_operations)

    def insert(self, session: ClientSession = None) -> str:
        """
        insert system into DB. creates a new record (ignores system_id if provided). Use
        update instead if an existing document needs to be updated.
        Returns:
            inserted document ID
        """
        self.created_at = self.last_modified = datetime.utcnow()  # update timestamps
        document = self.to_dict()
        document.pop("system_id")
        document["dataset_metadata_id"] = (
            self.dataset.dataset_id if self.dataset else None
        )

        document.pop("dataset")
        return str(self.insert_one(document, session=session).inserted_id)

    @classmethod
    def find(
        cls,
        ids: Optional[list[str]],
        page: int,
        page_size: int,
        system_name: Optional[str],
        task: Optional[str],
        dataset_name: Optional[str],
        subdataset_name: Optional[str],
        split: Optional[str],
        sort: Optional[list],
        creator: Optional[str],
        include_metric_stats: bool = False,
    ) -> SystemsReturn:
        """find multiple systems that matches the filters"""

        filter: dict[str, Any] = {}
        if ids:
            filter["_id"] = {"$in": [ObjectId(_id) for _id in ids]}
        if system_name:
            filter["model_name"] = {"$regex": rf"^{system_name}.*"}
        if task:
            filter["system_info.task_name"] = task
        if dataset_name:
            filter["system_info.dataset_name"] = dataset_name
        if subdataset_name:
            filter["system_info.sub_dataset_name"] = subdataset_name
        if split:
            filter["system_info.dataset_split"] = split
        if creator:
            filter["creator"] = creator
        filter["$or"] = [{"is_private": False}]
        if get_user().is_authenticated:
            filter["$or"].append({"creator": get_user().email})

        cursor, total = super().find(filter, sort, page * page_size, page_size)
        documents = list(cursor)

        systems: list[System] = []
        if len(documents) == 0:
            return SystemsReturn(systems, 0)

        for doc in documents:
            system = cls.from_dict(doc, include_metric_stats=include_metric_stats)
            systems.append(system)

        return SystemsReturn(systems, len(documents))


class SystemOutputsModel(DBModel):
    """System output collection model which holds all system outputs for a system"""

    _database_name = "system_outputs"

    def __init__(self, system_id: str, data: Iterable[dict] | None = None) -> None:
        SystemOutputsModel._collection_name = system_id
        self._system_id = system_id
        self._data: Iterable[dict] = data if data is not None else list()

    def insert(self, drop_old_data: bool = True, session: ClientSession = None):
        """
        insert all data into DB
        Parameters:
            - drop_old_data: drops the collection if it already exists
        """
        if drop_old_data:
            self.drop()
        self.insert_many(list(self._data), False, session)

    @classmethod
    def find(cls, output_ids: str | None, limit=0) -> SystemOutputsReturn:
        """
        find multiple system outputs whose ids are in output_ids
        TODO: raise error if system doesn't exist
        """
        filter: dict[str, Any] = {}
        if output_ids:
            filter["id"] = {"$in": [str(id) for id in output_ids.split(",")]}
        cursor, total = super().find(filter, limit=limit)
        return SystemOutputsReturn(
            [SystemOutputModel.from_dict(doc) for doc in cursor], total
        )


class SystemOutputModel(SystemOutput):
    """one sample of system output"""

    @classmethod
    def from_dict(cls, dikt) -> SystemOutput:
        """pop _id because it's not serializable and it is irrelevant for the users"""
        document = {**dikt}
        if "_id" in document:
            document.pop("_id")
        return super().from_dict(document)
