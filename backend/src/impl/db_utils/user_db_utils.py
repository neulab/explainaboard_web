from __future__ import annotations

import logging

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.utils import abort_with_error_message
from explainaboard_web.models.user import User


class UserDBUtils:
    @staticmethod
    def insert_preferred_username(doc: dict) -> None:
        user = UserDBUtils.find_users([doc["creator"]])[0]
        doc["preferred_username"] = user.preferred_username

    @staticmethod
    def insert_preferred_usernames(docs: list[dict]) -> None:
        user_ids = {doc["creator"] for doc in docs}
        users = UserDBUtils.find_users(list(user_ids))
        id_to_preferred_username = {user.id: user.preferred_username for user in users}
        for doc in docs:
            doc["preferred_username"] = id_to_preferred_username[doc["creator"]]

    @staticmethod
    def create_user(user: User) -> User:
        doc = user.to_dict()
        doc["_id"] = doc["id"]
        doc.pop("id")
        DBUtils.insert_one(DBUtils.USER_METADATA, doc)
        return user

    @staticmethod
    def find_user(id_or_email: str) -> User | None:
        docs, total = DBUtils.find(
            DBUtils.USER_METADATA,
            filt={"$or": [{"_id": id_or_email}, {"email": id_or_email}]},
        )
        if total == 0:
            return None
        elif total == 1:
            doc = next(docs)
            doc["id"] = doc["_id"]
            return User.from_dict(doc)
        raise RuntimeError(f"{id_or_email} matches multiple users")

    @staticmethod
    def find_users(ids: list[str]) -> list[User]:
        filt = {"_id": {"$in": ids}}
        cursor, _ = DBUtils.find(DBUtils.USER_METADATA, filt=filt, limit=0)

        users = []

        for doc in cursor:
            doc["id"] = doc["_id"]
            users.append(User.from_dict(doc))

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
