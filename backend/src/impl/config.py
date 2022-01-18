import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    def __init__(self) -> None:
        self.SECRET_KEY = os.urandom(12)
        self.DEBUG = False
        self.TESTING = False
        self.DATABASE_URI = os.environ['DATABASE_URI_DEV']
        self.DB_USERNAME = os.environ['DB_USERNAME_DEV']
        self.DB_PASSWORD = os.environ['DB_PASSWORD_DEV']


class DevelopmentConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = True


class ProductionConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DATABASE_URI = os.environ['DATABASE_URI_PROD']
        self.DB_USERNAME = os.environ['DB_USERNAME_PROD']
        self.DB_PASSWORD = os.environ['DB_PASSWORD_PROD']


class TestingConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        TESTING = True
