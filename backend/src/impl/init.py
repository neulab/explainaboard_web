import logging
import os
from typing import Final

from explainaboard_web.impl.config import (
    LocalDevelopmentConfig,
    ProductionConfig,
    StagingConfig,
)
from flask import Flask


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
    """If the app is running in an ECS container, the GCP credentials
    are passed in as an environment variable. This function reads that
    variable, writes to a file and points the Google Cloud Storage
    client to the correct file to authenticate the service.
    """
    if os.environ.get("GCP_SERVICE_CREDENTIALS"):
        credentials = os.environ["GCP_SERVICE_CREDENTIALS"]
        gcp_credentials_path: Final = "./GCP_SERVICE_CREDENTIALS.json"
        with open(gcp_credentials_path, "w") as f:
            f.write(credentials)
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = gcp_credentials_path
        logging.info("GCP credentials file initialized from environment variable.")
