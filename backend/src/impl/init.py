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
    FLASK_ENV = os.getenv("FLASK_ENV")
    if FLASK_ENV == "production":
        app.config.from_object(ProductionConfig())
    elif FLASK_ENV == "development":
        app.config.from_object(LocalDevelopmentConfig())
    elif FLASK_ENV == "staging":
        app.config.from_object(StagingConfig())
