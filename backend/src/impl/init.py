import os

from explainaboard_web.impl.config import (
    LocalDevelopmentConfig,
    ProductionConfig,
    StagingConfig,
)
from flask import Flask


def init(app: Flask) -> Flask:
    """Initializes the flask app"""
    _init_config(app)
    return app


def _init_config(app: Flask):
    flask_env = os.getenv("FLASK_ENV")
    if flask_env == "production":
        app.config.from_object(ProductionConfig())
    elif flask_env == "development":
        app.config.from_object(LocalDevelopmentConfig())
    elif flask_env == "staging":
        app.config.from_object(StagingConfig())
