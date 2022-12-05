from __future__ import annotations

import logging
import secrets
from typing import Any

import google.auth.transport.requests
import google.oauth2.id_token
from flask import current_app, g

from explainaboard_web.impl.db_utils.db_utils import DBUtils
from explainaboard_web.impl.db_utils.user_db_utils import UserDBUtils
from explainaboard_web.impl.utils import abort_with_error_message
from explainaboard_web.models.user import User


# Disables N802 to follow the naming scheme in the OpenAPI definition.
def check_ApiKeyAuth(user_email: str, api_key: str, required_scopes):  # noqa: N802
    """
    Args:
        user_email: we use user email as ID
        api_key: is generated for the user when they login for the first time. Only
        one API key is active for each user at any time.

    Returns:
        empty dict because connextion expects a decoded userInfo. We don't really use
        it. See `security_handler_factory.py` in connexion source code for details.
    """
    user = UserDBUtils.find_user(user_email)
    if not user or not user.email_verified or user.api_key != api_key:
        abort_with_error_message(401, "invalid credentials")
    g._user = user
    return {}


# Disables N802 to follow the naming scheme in the OpenAPI definition.
def check_BearerAuth(token: str):  # noqa: N802
    """JWT authentication. Signup is handled by firebaseui (frontend) so this function
    creates a new user in the database if it does not exist."""
    try:
        decoded_jwt = google.oauth2.id_token.verify_firebase_token(
            token,
            google.auth.transport.requests.Request(),
            audience=current_app.config["AUTH_AUDIENCE"],
        )
    except Exception as e:
        logging.error(e)
        abort_with_error_message(401, "invalid token")
    else:
        g._user = _find_or_create_user(decoded_jwt["user_id"], decoded_jwt)
        if not g._user.email_verified:
            abort_with_error_message(401, "invalid token")
        return {}


def _find_or_create_user(user_id: str, user_info: dict[str, Any]) -> User:
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


def get_user() -> User | None:
    """Returns User if logged in. Otherwise, returns None."""
    return getattr(g, "_user", None)
