import os
from typing import Final

from flask import Flask

from explainaboard_web.impl.config import (
    LocalDevelopmentConfig,
    ProductionConfig,
    StagingConfig,
)


def init(app: Flask) -> Flask:
    """Initializes the flask app"""
    _init_config(app)
    _init_gcp_credentials()
    return app


def _init_config(app: Flask):
    FLASK_ENV = os.getenv("FLASK_ENV")
    if FLASK_ENV == "production":
        app.config.from_object(ProductionConfig())
    elif FLASK_ENV == "development":
        app.config.from_object(LocalDevelopmentConfig())
    elif FLASK_ENV == "staging":
        app.config.from_object(StagingConfig())


def _init_gcp_credentials():
    if "GCP_SERVICE_CREDENTIALS" in os.environ:
        credentials = os.environ["GCP_SERVICE_CREDENTIALS"]
        gcp_credentials_path: Final = "./GCP_SERVICE_CREDENTIALS.json"
        with open(gcp_credentials_path, "w") as f:
            f.write(credentials)
        os.environ["GCP_SERVICE_CREDENTIALS"] = gcp_credentials_path
