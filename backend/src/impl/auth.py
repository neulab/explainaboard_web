from __future__ import annotations

import logging

import google.auth.transport.requests
import google.oauth2.id_token
from flask import current_app, g

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
    if not user or user.api_key != api_key:
        abort_with_error_message(401, "user email or api key is invalid")
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
        g._user = UserDBUtils.find_or_create_user(decoded_jwt["user_id"], decoded_jwt)
        return {}


def get_user() -> User | None:
    """Returns User if logged in. Otherwise, returns None."""
    return getattr(g, "_user", None)
