from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.models.user_metadata_in_db import UserMetadataInDB


class UserDBUtils:
    @staticmethod
    def create_user(user: UserMetadataInDB) -> UserMetadataInDB:
        doc = user.to_dict()
        doc["_id"] = doc["username"]
        doc.pop("username")
        DBUtils.insert_one(DBUtils.USER_METADATA, doc)
        return user

    @staticmethod
    def create_users(users: list[UserMetadataInDB]) -> list[UserMetadataInDB]:
        docs = []
        for user in users:
            doc = user.to_dict()
            doc["_id"] = doc["username"]
            doc.pop("username")
            docs.append(doc)
        DBUtils.insert_many(DBUtils.USER_METADATA, docs)
        return users

    @staticmethod
    def find_user(username: str) -> UserMetadataInDB | None:
        doc = DBUtils.find_one_by_id(DBUtils.USER_METADATA, username)
        if doc is not None:
            doc["username"] = doc["_id"]
            return UserMetadataInDB.from_dict(doc)
        return None

    @staticmethod
    def find_users(usernames: list[str]) -> list[UserMetadataInDB]:
        filt = {"_id": {"$in": usernames}}
        cursor, _ = DBUtils.find(DBUtils.USER_METADATA, filt=filt)

        users = []
        for doc in cursor:
            doc["username"] = doc["_id"]
            users.append(UserMetadataInDB.from_dict(doc))

        return users
