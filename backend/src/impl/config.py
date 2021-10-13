import os


class Config(object):
    SECRET_KEY = os.urandom(12)
    DEBUG = False
    TESTING = False
    DATABASE_URI = ''


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DATABASE_URI = ''


class TestingConfig(Config):
    TESTING = True
