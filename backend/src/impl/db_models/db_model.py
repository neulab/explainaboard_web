from typing import Callable, Dict, List, Optional, Tuple, TypeVar
from pymongo.cursor import Cursor
from pymongo.results import InsertManyResult, InsertOneResult, DeleteResult
from pymongo.client_session import ClientSession
from explainaboard_web.impl.utils import abort_with_error_message
from explainaboard_web.impl.db import get_db
from bson.objectid import ObjectId, InvalidId


class DBModel:
    _database_name: str
    _collection_name: str

    @classmethod
    def get_database(cls):
        return get_db().cx[cls._database_name]

    @classmethod
    def get_client(cls) -> ClientSession:
        return get_db().db.client

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
    def drop(cls, check_collection_exist=False):
        """
        drop a collection
        Parameters:
            - check_collection_exist: if True and collection doesn't exist, raise exception
        """
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")
        cls.get_collection(cls._collection_name, check_collection_exist).drop()

    @classmethod
    def insert_one(cls, document: dict, check_collection_exist: bool = True, session: ClientSession = None) -> InsertOneResult:
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")
        return cls.get_collection(cls._collection_name, check_collection_exist).insert_one(document, session=session)

    @classmethod
    def insert_many(cls, documents: List[dict], check_collection_exist=True, session: ClientSession = None) -> InsertManyResult:
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")
        return cls.get_collection(cls._collection_name, check_collection_exist).insert_many(documents, session=session)

    @classmethod
    def find_one_by_id(cls, id: str, projection: Optional[Dict] = None):
        """
        Find and return a document with the _id field
        Prameters:
          - id: value of _id
          - projection: include or exclude fields in the document
        """
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")
        try:
            return cls.get_collection(cls._collection_name).find_one({"_id": ObjectId(id)}, projection)
        except InvalidId as e:
            abort_with_error_message(400, f"id: {id} is not a valid ID")

    @classmethod
    def delete_one_by_id(cls, id: str):
        """
        Delete one document with the given ID
        Returns: `True` if a single document has been deleted
        """
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")
        try:
            result: DeleteResult = cls.get_collection(
                cls._collection_name).delete_one({"_id": ObjectId(id)})
            print(result)
            if int(result.deleted_count) == 1:
                return True
            return False

        except InvalidId as e:
            abort_with_error_message(
                400, f"id: {id} is not a valid mongodb ID")

    @classmethod
    def count(cls, filter={}) -> int:
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")
        return cls.get_collection(cls._collection_name).count_documents(filter)

    @classmethod
    def find(cls, filter: Optional[Dict] = None, sort: Optional[List] = None, skip=0, limit: int = 10, projection: Optional[Dict] = None) -> Tuple[Cursor, int]:
        """
        Find multiple documents
        TODO: error handling for find
        Parameters:
          - filter: filter parameters for find
          - sort: a list of sort parameters e.g. [('field1', pymongo.ASCENDING)]
          - skip: offset
          - limit: limit, pass in 0 to retrieve all documents (this is consistent with the pyMongo API)
          - projection: include or exclude certain fileds (https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/)
        Return:
          - a cursor that can be iterated over
          - a number that represents the total matching documents without considering skip/limit
        """
        if not cls._collection_name:
            raise DBModelException("collection_name not defined")

        if not filter:
            filter = {}
        cursor = cls.get_collection(
            cls._collection_name).find(filter, projection)
        if sort:
            cursor = cursor.sort(sort)

        cursor = cursor.skip(skip).limit(limit)
        total = cls.count(filter)
        return cursor, total

    CallbackRetType = TypeVar('CallbackRetType')

    @classmethod
    def execute_transaction(cls, callback: Callable[[ClientSession], CallbackRetType]) -> CallbackRetType:
        """
        Executes `callback` in a transaction. Returns the return of callback. An exception is raised if failure.
        - Ref: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html
        """
        with cls.get_client().start_session() as session:
            with session.start_transaction():
                return callback(session)


class MetadataDBModel(DBModel):
    _database_name = "metadata"


class DBModelException(Exception):
    """
    An exception type originated from `db_model`. This exception usually means that a developer is not using `db_model` properly. The details of the exception is usually not useful for the users.
      - `DBModelException` should not be used if a user requests for a system (with id) that does not exist. For 
    this purpose, use `abort_with_error()` or define some other exception type.
    """

    def __init__(self, message: str) -> None:
        self.message = message
