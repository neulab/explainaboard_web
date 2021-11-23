from __future__ import annotations
from datetime import datetime
from typing import Union
from explainaboard.impl.db_models.db_model import MetadataDBModel
from explainaboard.models.system_metadata import SystemMetadata


class SystemMetadataModel(MetadataDBModel, SystemMetadata):
    collection_name = "system_metadata"

    def __init__(self) -> None:
        super().__init__()

    @classmethod
    def from_dict(cls, dikt) -> SystemMetadata:
        document = {**dikt}
        if dikt.get("_id"):
            document[f"{cls.collection_name}_id"] = str(dikt["_id"])
        system_metadata = super().from_dict(document)
        return system_metadata

    @classmethod
    def find_one_by_id(cls, id: str) -> Union[SystemMetadata, None]:
        document = super().find_one_by_id(id)
        if not document:
            return None
        return cls.from_dict(document)

    def insert(self) -> str:
        """
        Insert object into database
        Returns:
            inserted document ID
        TODO
        """
        self.created_at = self.last_modified = datetime.utcnow()  # update last modified time
        return self.insert_one(self.to_dict())
