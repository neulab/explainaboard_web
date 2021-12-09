from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, Optional, Union
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
        dataset_metadata = super().from_dict(document)
        return dataset_metadata

    @classmethod
    def find_one_by_id(cls, id: str) -> Union[DatasetMetaDataModel, None]:
        document = super().find_one_by_id(id)
        if not document:
            return None
        return cls.from_dict(document)

    @classmethod
    def find(cls, page: int, page_size: int, dataset_name: Optional[str] = None, task: Optional[str] = None) -> DatasetsReturn:
        """fuzzy match works like a `LIKE {name_prefix}%` operation now. can extend this and allow for 
        full text search in the future. TODO: add index for name"""
        filter: Dict[str, Any] = {}
        if dataset_name:
            filter["dataset_name"] = {"$regex": rf"^{dataset_name}.*"}
        if task:
            filter["tasks"] = task
        cursor, total = super().find(filter, [], page * page_size, page_size)
        return DatasetsReturn([cls.from_dict(doc) for doc in cursor], total)

    def insert(self) -> str:
        """
        Insert object into database
        Returns:
            inserted document ID
        TODO
        """
        self.created_at = self.last_modified = datetime.utcnow()  # update last modified time
        return self.insert_one(self.to_dict())
