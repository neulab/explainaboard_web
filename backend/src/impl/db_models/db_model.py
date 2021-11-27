from typing import Tuple
from pymongo.cursor import Cursor
from pymongo.results import InsertOneResult
from explainaboard.impl.utils import abort_with_error_message
from explainaboard.impl.db import get_db
from bson.objectid import ObjectId, InvalidId


class DBModel:
    database_name: str
    collection_name: str

    @classmethod
    def get_database(cls):
        return get_db().cx[cls.database_name]

    @classmethod
    def get_collection(cls, collection_name: str, check_collection_exist=True):
        database = cls.get_database()
        if check_collection_exist:
            collection_names = database.list_collection_names()
            if collection_name in collection_names:
                return database.get_collection(collection_name)
            raise DBModelException(
                f"collection: {collection_name} does not exist")
        return database.get_collection(collection_name)

    @classmethod
    def insert_one(cls, document: dict) -> InsertOneResult:
        if not cls.collection_name:
            raise DBModelException("collection_name not defined")
        return cls.get_collection(cls.collection_name).insert_one(document)

    @classmethod
    def find_one_by_id(cls, id: str):
        if not cls.collection_name:
            raise DBModelException("collection_name not defined")
        try:
            return cls.get_collection(cls.collection_name).find_one({"_id": ObjectId(id)})
        except InvalidId as e:
            abort_with_error_message(400, f"id: {id} is not a valid ID")

    @classmethod
    def count(cls, filter={}) -> int:
        if not cls.collection_name:
            raise DBModelException("collection_name not defined")
        return cls.get_collection(cls.collection_name).count_documents(filter)

    @classmethod
    def find(cls, filter={}, sort=[], skip=0, limit=10) -> Tuple[Cursor, int]:
        """
        Find multiple documents
        TODO: error handling for find
        Parameters:
          - filter: filter parameters for find
          - sort: a list of sort parameters e.g. [('field1', pymongo.ASCENDING)]
          - skip: offset
          - limit: limit
        Return:
          - a cursor that can be iterated over
          - a number that represents the total matching documents without considering skip/limit
        """
        if not cls.collection_name:
            raise DBModelException("collection_name not defined")

        cursor = cls.get_collection(cls.collection_name).find(filter)
        if sort:
            cursor = cursor.sort(sort)

        cursor = cursor.skip(skip).limit(limit)
        total = cls.count(filter)
        return cursor, total


class MetadataDBModel(DBModel):
    database_name = "metadata"


class DBModelException(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
