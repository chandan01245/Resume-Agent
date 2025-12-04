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
    @app.route('/')
    def index():
        if os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({"message": "API is running. Frontend not built yet. Run: cd frontend && npm run build"}), 200
    
    @app.route('/<path:path>')
    def serve_static(path):
        # Skip if it's an API route (this shouldn't happen but just in case)
        if path.startswith('api'):
            return jsonify({"error": "Not found"}), 404
            
        # Serve static files if they exist
        if app.static_folder and os.path.exists(app.static_folder):
            file_path = os.path.join(app.static_folder, path)
            if os.path.isfile(file_path):
                return send_from_directory(app.static_folder, path)
            # Otherwise serve index.html for client-side routing
            index_path = os.path.join(app.static_folder, 'index.html')
            if os.path.exists(index_path):
                return send_from_directory(app.static_folder, 'index.html')
        
        return jsonify({"error": "Frontend not built"}), 404
    
    # Auto-ingest resumes on startup - REMOVED to avoid issues and respect manual sync
    # with app.app_context():
    #     print("Checking for resumes to ingest...")
    #     ingest_resumes_from_disk()
    
    return app
