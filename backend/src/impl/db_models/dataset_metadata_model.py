from __future__ import annotations

from datetime import datetime
from typing import Any, Optional, Union

from bson.objectid import ObjectId
from explainaboard_web.impl.db_models.db_model import MetadataDBModel
from explainaboard_web.models.dataset_metadata import DatasetMetadata
from explainaboard_web.models.datasets_return import DatasetsReturn


class DatasetMetaDataModel(MetadataDBModel, DatasetMetadata):
    _collection_name = "dataset_metadata"

    @classmethod
    def from_dict(cls, dikt) -> DatasetMetaDataModel:
        document = {**dikt}
        if dikt.get("_id"):
            document["dataset_id"] = str(dikt["_id"])
        if not dikt.get("tasks"):
            document["tasks"] = []
        dataset_metadata = super().from_dict(document)
        return dataset_metadata

    @classmethod
    def find_one_by_id(cls, id: str) -> Union[DatasetMetaDataModel, None]:
        document = super().find_one_by_id(id)
        if not document:
            return None
        return cls.from_dict(document)

    @classmethod
    def find(
        cls,
        page: int,
        page_size: int,
        dataset_ids: Optional[list[str]] = None,
        dataset_name: Optional[str] = None,
        task: Optional[str] = None,
        no_limit: bool = False,
    ) -> DatasetsReturn:
        """
        fuzzy match works like a `LIKE {name_prefix}%` operation now. can extend this
        and allow for full text search in the future.
          - `no_limit=True` ignores page and page_size to retrieve unlimited records.
            This option should not be exposed to users.
        """
        filter: dict[str, Any] = {}
        if dataset_ids is not None:
            filter["_id"] = {"$in": [ObjectId(_id) for _id in dataset_ids]}
        if dataset_name is not None:
            filter["dataset_name"] = {"$regex": rf"^{dataset_name}.*"}
        if task:
            filter["tasks"] = task
        if no_limit:
            # limit=0 means no limit in pymongo
            cursor, total = super().find(filter, limit=0)
        else:
            cursor, total = super().find(filter, [], page * page_size, page_size)
        return DatasetsReturn([cls.from_dict(doc) for doc in cursor], total)

    def insert(self) -> str:
        """
        Insert object into database
        Returns:
            inserted document ID
        TODO
        """
        # update last modified time
        self.created_at = self.last_modified = datetime.utcnow()
        return self.insert_one(self.to_dict())
