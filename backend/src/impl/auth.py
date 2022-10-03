from __future__ import annotations

import secrets
from typing import Optional

import boto3
import jwt
from explainaboard_web.impl.utils import abort_with_error_message
from flask import current_app, g


def check_ApiKeyAuth(user_email: str, api_key: str, required_scopes):
    """
    :param user_id: we use user email as ID
    :param api_key: is generated for the user when they login for the first time. Only
    one API key is active for each user at any time.
    :return: empty dict because connextion expects a decoded userInfo.
    We don't really use it. See `security_handler_factory.py` in connexion source code
    for details.
    """
    user_info = CognitoClient().fetch_user_info(email=user_email)
    if not user_info or user_info[CognitoClient.API_KEY_KEY] != api_key:
        abort_with_error_message(401, "user email or api key is invalid")
    g._user = User(True, user_info)
    return {}


def check_BearerAuth(token: str):
    """JWT authentication"""
    public_key_url = f"https://cognito-idp.{current_app.config.get('AWS_DEFAULT_REGION')}.amazonaws.com/{current_app.config.get('USER_POOL_ID')}/.well-known/jwks.json"  # noqa
    public_key = jwt.PyJWKClient(public_key_url).get_signing_key_from_jwt(token)

    try:
        decoded_jwt = jwt.decode(
            token,
            public_key.key,
            audience=current_app.config.get("USER_POOL_AUDIENCE"),
            algorithms=["RS256"],
        )
        g._user = User(True, decoded_jwt)
    except jwt.ExpiredSignatureError:
        abort_with_error_message(401, "token expired")

    return {}


class User:
    # keys for fields in self._info
    _USERNAME_KEY = "username"
    _EMAIL_KEY = "email"
    _API_KEY_KEY = "api_key"
    _PREFERRED_USERNAME_KEY = "preferred_username"

    def __init__(
        self,
        is_authenticated: bool,
        info: Optional[dict] = None,
    ) -> None:
        self._is_authenticated: bool = is_authenticated
        self._info: dict = info.copy() if info else {}
        if self._is_authenticated:
            if not self._info:
                raise ValueError("info is required to create an authenticated user")
            self._info[self._USERNAME_KEY] = self._info.pop(CognitoClient.USERNAME_KEY)
            self._info[self._API_KEY_KEY] = self._info.pop(
                CognitoClient.API_KEY_KEY, None
            )

    def get_user_info(self) -> dict:
        if not self._info.get(self._API_KEY_KEY) or not self._info.get(
            "preferred_username"
        ):
            user = CognitoClient().fetch_user_info(username=self.username)
            if not user:
                raise Exception("user info not found")
            self._info.update(
                {
                    self._API_KEY_KEY: user[CognitoClient.API_KEY_KEY],
                    "preferred_username": user["preferred_username"],
                }
            )
        return self._info

    @property
    def is_authenticated(self) -> bool:
        return self._is_authenticated

    @property
    def email(self) -> str:
        return self._info[self._EMAIL_KEY]

    @property
    def username(self) -> str:
        return self._info[self._USERNAME_KEY]

    @property
    def preferred_username(self) -> str:
        return self.get_user_info()[self._PREFERRED_USERNAME_KEY]


def get_user() -> User:
    """returns user information"""
    user = getattr(g, "_user", None)
    if user is None:
        user = g._user = User(False)
    return user


class CognitoClient:
    # keys for fields in returned user_info
    USERNAME_KEY = "cognito:username"
    API_KEY_KEY = "custom:api_key"

    def __init__(self) -> None:
        self._client = boto3.client(
            "cognito-idp",
            aws_access_key_id=current_app.config.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=current_app.config.get("AWS_SECRET_ACCESS_KEY"),
        )
        self._user_pool_id = current_app.config.get("USER_POOL_ID")

    def fetch_user_info(self, username: str | None = None, email: str | None = None):
        if not username and not email:
            raise ValueError("no user ID provided")
        filter = f'username="{username}"' if username else f'email="{email}"'
        users = self._client.list_users(
            UserPoolId=self._user_pool_id,
            Filter=filter,
        )["Users"]

        if not users:
            return None
        if len(users) > 1:
            raise RuntimeError(f"user ID {username or email} is not unique")
        user = {attr["Name"]: attr["Value"] for attr in users[0]["Attributes"]}
        user[self.USERNAME_KEY] = users[0]["Username"]
        if self.API_KEY_KEY not in user:
            api_key = secrets.token_urlsafe(16)
            self.update_user(user[self.USERNAME_KEY], {self.API_KEY_KEY: api_key})
            user[self.API_KEY_KEY] = api_key
        return user

    def update_user(self, username: str, attributes: dict):
        self._client.admin_update_user_attributes(
            UserPoolId=self._user_pool_id,
            Username=username,
            UserAttributes=[{"Name": k, "Value": v} for k, v in attributes.items()],
        )
