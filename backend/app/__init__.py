from flask import Flask
from flask_cors import CORS
from .config import Config
from .services import ingest_resumes_from_disk

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    CORS(app)
    
    from .routes import main_bp
    app.register_blueprint(main_bp)
    
    # Auto-ingest resumes on startup - REMOVED to avoid issues and respect manual sync
    # with app.app_context():
    #     print("Checking for resumes to ingest...")
    #     ingest_resumes_from_disk()
    
    return app
