import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    def __init__(self) -> None:
        self.SECRET_KEY = os.urandom(12)
        self.DEBUG = False
        self.TESTING = False
        self.AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
        self.AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
        self.AWS_DEFAULT_REGION = os.environ["AWS_DEFAULT_REGION"]

        self.STORAGE_BUCKET_NAME = os.environ["STORAGE_BUCKET_NAME"]

        # firebase
        self.AUTH_AUDIENCE = os.environ["AUTH_AUDIENCE"]
        self.FIREBASE_API_KEY = os.environ["FIREBASE_API_KEY"]

        # used for ECS environment only
        self.GCP_SERVICE_CREDENTIALS = os.environ.get("GCP_SERVICE_CREDENTIALS")


class LocalDevelopmentConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = True
        self.DATABASE_URI = os.environ["DATABASE_URI_DEV"]
        self.DB_USERNAME = os.environ["DB_USERNAME_DEV"]
        self.DB_PASSWORD = os.environ["DB_PASSWORD_DEV"]


class StagingConfig(LocalDevelopmentConfig):
    """Used for an online staging/test environment. It has exactly the same
    configuration as local development except that the debug mode is turned off to
    prevent auto reload"""

    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = False


class ProductionConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DATABASE_URI = os.environ["DATABASE_URI_PROD"]
        self.DB_USERNAME = os.environ["DB_USERNAME_PROD"]
        self.DB_PASSWORD = os.environ["DB_PASSWORD_PROD"]


class TestingConfig(Config):
    def __init__(self) -> None:
        super().__init__()
