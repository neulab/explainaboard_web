import os

from flask import Flask
from app.config import ProductionConfig, DevelopmentConfig


def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True, static_folder='../../frontend', static_url_path='/')

    if test_config is None:
        if os.getenv('FLASK_ENV') == 'production':
            app.config.from_object(ProductionConfig())
        else:
            app.config.from_object(DevelopmentConfig())
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from . import auth
    app.register_blueprint(auth.bp)



    @app.route('/api/version')
    def get_version()->str:
        return {"data": "0.0.1"}

    @app.route('/')
    def front_end_ui():
        return app.send_static_file('index.html')
        
    return app