from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.models.user_metadata_in_db import UserMetadataInDB


class UserDBUtils:
    @staticmethod
    def create_user(user: UserMetadataInDB) -> UserMetadataInDB:
        document = user.to_dict()
        document["_id"] = document["username"]
        document.pop("username")
        DBUtils.insert_one(DBUtils.USER_METADATA, document)
        return user

    @staticmethod
    def create_users(users: list[UserMetadataInDB]) -> list[UserMetadataInDB]:
        documents = []
        for user in users:
            document = user.to_dict()
            document["_id"] = document["username"]
            document.pop("username")
            documents.append(document)
        DBUtils.insert_many(DBUtils.USER_METADATA, documents)
        return users
