import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    def __init__(self) -> None:
        self.SECRET_KEY = os.urandom(12)
        self.DEBUG = False
        self.TESTING = False


class DevelopmentConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = True
        self.DATABASE_URI = os.environ['DATABASE_URI_DEV']
        self.DB_USERNAME = os.environ['DB_USERNAME_DEV']
        self.DB_PASSWORD = os.environ['DB_PASSWORD_DEV']

        self.REGION = os.environ['REGION']
        self.USER_POOL_ID = os.environ['USER_POOL_ID_DEV']
        # client id for frontend because the token is generated for the frontend
        self.USER_POOL_AUDIENCE = os.environ['USER_POOL_AUDIENCE_DEV']


class ProductionConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DATABASE_URI = os.environ['DATABASE_URI_PROD']
        self.DB_USERNAME = os.environ['DB_USERNAME_PROD']
        self.DB_PASSWORD = os.environ['DB_PASSWORD_PROD']

        self.REGION = os.environ['REGION']
        self.USER_POOL_ID = os.environ['USER_POOL_ID_PROD']
        self.USER_POOL_AUDIENCE = os.environ['USER_POOL_AUDIENCE_PROD']


class TestingConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        TESTING = True
