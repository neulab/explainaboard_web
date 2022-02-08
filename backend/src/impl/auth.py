import jwt
import requests
from flask import g, current_app
from explainaboard_web.impl.utils import abort_with_error_message


def check_ApiKeyAuth(api_key: str, required_scopes):
    """
    TODO
    Returns: empty dict because connextion expects this function to return decoded userInfo.
    We don't really use that (I don't see how...) so we just leave it like that. See
    `security_handler_factory.py` in connexion source code for details.
    """
    raise NotImplementedError


def check_BearerAuth(token: str):
    """JWT authentication"""
    public_key_url = f"https://cognito-idp.{current_app.config.get('REGION')}.amazonaws.com/{current_app.config.get('USER_POOL_ID')}/.well-known/jwks.json"
    public_key = jwt.PyJWKClient(
        public_key_url).get_signing_key_from_jwt(token)

    try:
        decoded_jwt = jwt.decode(token, public_key.key, audience=current_app.config.get("USER_POOL_AUDIENCE"),
                                 algorithms=['RS256'])
        g._user = User(True, decoded_jwt['email'])
    except jwt.ExpiredSignatureError as e:
        abort_with_error_message(401, "token expired")

    return {}


class User:
    def __init__(self, is_authenticated: bool,  email="") -> None:
        self._is_authenticated = is_authenticated
        self._email = email

    @property
    def is_authenticated(self):
        return self._is_authenticated

    @property
    def email(self):
        return self._email


def get_user():
    """returns user information"""
    user = getattr(g, "_user", None)
    if user is None:
        user = g._user = User(False)
    return user
