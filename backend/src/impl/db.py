from flask import current_app, g
from flask_pymongo import PyMongo


def get_db():
    """
    returns the global db instance. a PyMongo instance is created if not present in g.
    """
    db = getattr(g, "_database", None)
    if db is None:
        uri: str = current_app.config.get("DATABASE_URI")
        username: str = current_app.config.get("DB_USERNAME")
        password: str = current_app.config.get("DB_PASSWORD")
        uri = uri.replace("<username>", username)
        uri = uri.replace("<password>", password)

        db = g._database = PyMongo(current_app, uri=uri)
    return db
