import secrets
from typing import Optional

import boto3
import jwt
from explainaboard_web.impl.utils import abort_with_error_message
from flask import current_app, g


def check_ApiKeyAuth(api_key: str, required_scopes):
    """
    TODO
    :return: empty dict because connextion expects a decoded userInfo.
    We don't really use that (I don't see how...) so we just leave it like that. See
    `security_handler_factory.py` in connexion source code for details.
    """
    raise NotImplementedError


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
        g._user = User(True, token, decoded_jwt)
    except jwt.ExpiredSignatureError:
        abort_with_error_message(401, "token expired")

    return {}


class User:
    """TODO: unittest"""

    _USERNAME_KEY = "username"
    _EMAIL_KEY = "email"

    def __init__(
        self,
        is_authenticated: bool,
        token: Optional[str] = None,
        info: Optional[dict] = None,
    ) -> None:
        self._is_authenticated = is_authenticated
        if self._is_authenticated and (not token or not info):
            raise Exception("token is required to create an authenticated user")
        self._token = token
        info[self._USERNAME_KEY] = info["cognito:username"]
        info.pop("cognito:username")
        self._info = info

    def get_user_info(self):
        if "api_key" not in self._info or "preferred_username" not in self._info:
            user = CognitoClient().fetch_user_info(self.username)
            if not user:
                raise Exception("user info not found")
            self._info.update(
                {
                    "api_key": user["custom:api_key"],
                    "preferred_username": user["preferred_username"],
                }
            )
        return self._info

    @property
    def is_authenticated(self):
        return self._is_authenticated

    @property
    def email(self):
        return self._info[self._EMAIL_KEY]

    @property
    def username(self):
        return self._info[self._USERNAME_KEY]

    @property
    def token(self):
        return self._token


def get_user() -> Optional[User]:
    """returns user information"""
    user = getattr(g, "_user", None)
    if user is None:
        user = g._user = User(False)
    return user


class CognitoClient:
    def __init__(self) -> None:
        self._client = boto3.client(
            "cognito-idp",
            aws_access_key_id=current_app.config.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=current_app.config.get("AWS_SECRET_ACCESS_KEY"),
        )
        self._user_pool_id = current_app.config.get("USER_POOL_ID")

    def fetch_user_info(self, username: str):
        users = self._client.list_users(
            UserPoolId=self._user_pool_id,
            Filter=f'username="{username}"',
        )["Users"]

        if not users:
            return None
        if len(users) > 1:
            raise Exception(f"internal error: username {username} is not unique")
        user = {attr["Name"]: attr["Value"] for attr in users[0]["Attributes"]}
        if "custom:api_key" not in user:
            api_key = secrets.token_urlsafe(16)
            self.update_user(username, {"custom:api_key": api_key})
            user["custom:api_key"] = api_key
        return user

    def update_user(self, username: str, attributes: dict):
        self._client.admin_update_user_attributes(
            UserPoolId=self._user_pool_id,
            Username=username,
            UserAttributes=[{"Name": k, "Value": v} for k, v in attributes.items()],
        )
