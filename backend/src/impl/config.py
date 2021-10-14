import os


class Config(object):
    SECRET_KEY = os.urandom(12)
    DEBUG = False
    TESTING = False
    DATABASE_URI = 'mongodb+srv://<username>:<password>@explainaboarddev.dejqa.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
    DB_USERNAME = 'explainaBoardDev'
    DB_PASSWORD = 'explainaBoardDev'


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DATABASE_URI = ''
    DB_USERNAME = os.getenv('DB_USERNAME_PROD', '')
    DB_PASSWORD = os.getenv('DB_PASSWORD_PROD', '')


class TestingConfig(Config):
    TESTING = True
