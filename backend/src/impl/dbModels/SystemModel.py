from __future__ import annotations
from datetime import datetime
from typing import Union
from explainaboard.impl.dbModels.DBModel import DBModel
from explainaboard.models.system import System


class SystemModel(DBModel, System):
    collection_name = "systems"

    def __init__(self) -> None:
        super().__init__()

    @classmethod
    def from_dict(cls, dikt) -> SystemModel:
        document = {**dikt}
        if dikt.get("_id"):
            document["system_id"] = str(dikt["_id"])
        system = super().from_dict(document)
        return system

    @classmethod
    def find_one_by_id(cls, id: str) -> Union[SystemModel, None]:
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
