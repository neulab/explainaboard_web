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
    env = os.getenv("EB_ENV")
    if env == "production":
        app.config.from_object(ProductionConfig())
    elif env == "development":
        app.config.from_object(LocalDevelopmentConfig())
    elif env == "staging":
        app.config.from_object(StagingConfig())
