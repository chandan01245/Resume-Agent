from flask import Flask, send_from_directory
from flask_cors import CORS
from .config import Config
from .services import ingest_resumes_from_disk
import os

def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)
    
    # Configure CORS for production
    CORS(app, resources={
        r"/*": {
            "origins": ["*"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": False
        }
    })
    
    from .routes import main_bp
    app.register_blueprint(main_bp, url_prefix='/api')
    
    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    # Auto-ingest resumes on startup - REMOVED to avoid issues and respect manual sync
    # with app.app_context():
    #     print("Checking for resumes to ingest...")
    #     ingest_resumes_from_disk()
    
    return app
