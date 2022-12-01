from __future__ import annotations

import logging
import secrets
from typing import Any

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.utils import abort_with_error_message
from explainaboard_web.models.user import User


class UserDBUtils:
    @staticmethod
    def find_or_create_user(user_id: str, user_info: dict[str, Any]) -> User:
        """Finds a user based on user_id or create the user in the DB according
        to user_info.
        - email_verified is managed by firebase so user_info["email_verify"] is
        the source of truth for this property. This method updates this property
        in the DB if it is different from the one in user_info.

        Args:
            user_id: unique ID of the user. email cannot be used here.
            user_info: decoded JWT
        """
        user = UserDBUtils.find_user(user_id)
        if user:
            if user.email_verified != user_info["email_verified"]:
                DBUtils.update_one_by_id(
                    DBUtils.USER_METADATA,
                    user_id,
                    {"email_verified": user_info["email_verified"]},
                )
                user.email_verified = user_info["email_verified"]
            return user

        user = UserDBUtils.create_user(
            User(
                id=user_id,
                email=user_info["email"],
                email_verified=user_info["email_verified"],
                api_key=secrets.token_urlsafe(16),
                preferred_username=user_info["name"],
            )
        )
        return user

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
