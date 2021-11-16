from pymongo.results import InsertOneResult
from explainaboard.impl.db import get_db
from bson.objectid import ObjectId


class DBModel:
    database_name = "explainaboard_dev"
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
            return None
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
        return cls.get_collection(cls.collection_name).find_one({"_id": ObjectId(id)})


class DBModelException(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
