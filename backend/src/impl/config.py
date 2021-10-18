import os
from dotenv import load_dotenv

load_dotenv()


class Config(object):
    SECRET_KEY = os.urandom(12)
    DEBUG = False
    TESTING = False
    DATABASE_URI = os.getenv('DATABASE_URI_DEV')
    DB_USERNAME = os.getenv('DB_USERNAME_DEV')
    DB_PASSWORD = os.getenv('DB_PASSWORD_DEV')


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DATABASE_URI = ''
    DB_USERNAME = os.getenv('DB_USERNAME_PROD', '')
    DB_PASSWORD = os.getenv('DB_PASSWORD_PROD', '')


class TestingConfig(Config):
    TESTING = True
