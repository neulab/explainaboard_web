import dataclasses
import logging
from dataclasses import dataclass
from typing import Optional

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.utils import abort_with_error_message


@dataclass
class UserInDB:
    id: str
    preferred_username: str

    def to_dict(self) -> dict:
        """Serialization function."""
        ret_dict = {}
        for f in dataclasses.fields(self):
            obj = getattr(self, f.name)
            ret_dict[f.name] = obj
        return ret_dict

    @classmethod
    def from_dict(cls, dikt: dict):
        """Deserialization function."""
        return UserInDB(id=dikt["id"], preferred_username=dikt["preferred_username"])


class UserDBUtils:
    @staticmethod
    def create_user(user: UserInDB) -> UserInDB:
        doc = user.to_dict()
        doc["_id"] = doc["id"]
        doc.pop("id")
        DBUtils.insert_one(DBUtils.USER_METADATA, doc)
        return user

    @staticmethod
    def create_users(users: list[UserInDB]) -> list[UserInDB]:
        docs = []
        for user in users:
            doc = user.to_dict()
            doc["_id"] = doc["id"]
            doc.pop("id")
            docs.append(doc)
        DBUtils.insert_many(DBUtils.USER_METADATA, docs)
        return users

    @staticmethod
    def find_user(id: str) -> Optional[UserInDB]:
        doc = DBUtils.find_one_by_id(DBUtils.USER_METADATA, id)
        if doc is not None:
            doc["id"] = doc["_id"]
            return UserInDB.from_dict(doc)
        return None

    @staticmethod
    def find_users(ids: list[str]) -> list[UserInDB]:
        filt = {"_id": {"$in": ids}}
        cursor, _ = DBUtils.find(DBUtils.USER_METADATA, filt=filt, limit=0)

        users = []

        for doc in cursor:
            doc["id"] = doc["_id"]
            users.append(UserInDB.from_dict(doc))

        if len(users) < len(ids):
            found_ids = {x.id for x in users}
            missing_ids = [id for id in ids if id not in found_ids]
            logging.getLogger().error(
                f"system creator ID(s) {missing_ids} not found in DB"
            )
            abort_with_error_message(
                500, "system creator not found in DB, please contact the system admins"
            )
        return users
