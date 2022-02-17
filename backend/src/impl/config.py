import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    def __init__(self) -> None:
        self.SECRET_KEY = os.urandom(12)
        self.DEBUG = False
        self.TESTING = False


class LocalDevelopmentConfig(Config):
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
        self.AUTH_URL = f"https://explainaboard-dev-user.auth.{self.REGION}.amazoncognito.com/oauth2/authorize?client_id={self.USER_POOL_AUDIENCE}&response_type=token&scope=email+openid+phone&redirect_uri="


class StagingConfig(LocalDevelopmentConfig):
    """Used for an online staging/test environment. It has exactly the same configuration as local development 
    except that the debug mode is turned off to prevent auto reload"""

    def __init__(self) -> None:
        super().__init__()
        self.DEBUG = False


class ProductionConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        self.DATABASE_URI = os.environ['DATABASE_URI_PROD']
        self.DB_USERNAME = os.environ['DB_USERNAME_PROD']
        self.DB_PASSWORD = os.environ['DB_PASSWORD_PROD']

        self.REGION = os.environ['REGION']
        self.USER_POOL_ID = os.environ['USER_POOL_ID_PROD']
        self.USER_POOL_AUDIENCE = os.environ['USER_POOL_AUDIENCE_PROD']
        self.AUTH_URL = f"https://explainaboard-prod-user.auth.{self.REGION}.amazoncognito.com/login?client_id={self.USER_POOL_AUDIENCE}&response_type=token&scope=email+openid+phone&redirect_uri="


class TestingConfig(Config):
    def __init__(self) -> None:
        super().__init__()
        TESTING = True
