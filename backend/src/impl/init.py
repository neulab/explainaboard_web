import os

from explainaboard_web.impl.config import (
    LocalDevelopmentConfig,
    ProductionConfig,
    StagingConfig,
)
from explainaboard_web.impl.utils import abort_with_error_message, get_api_version
from flask import Flask, request


def init(app: Flask) -> Flask:
    """Initializes the flask app"""
    _init_config(app)

    @app.before_request
    def check_api_version():
        api_version = get_api_version()
        header_api_version = request.headers.get("X-API-version", None)
        if header_api_version is not None and header_api_version != api_version:
            abort_with_error_message(
                400,
                f"Requires explainaboard_api_client=={api_version}, "
                + f"got {header_api_version} instead. "
                + "Please upgrade to the required version.",
            )

    return app


def _init_config(app: Flask):
    env = os.getenv("EB_ENV")
    if env == "production":
        app.config.from_object(ProductionConfig())
    elif env == "development":
        app.config.from_object(LocalDevelopmentConfig())
    elif env == "staging":
        app.config.from_object(StagingConfig())
