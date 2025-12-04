import os
from dotenv import load_dotenv

# Use absolute path for data directory
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Load .env from the root directory
dotenv_path = os.path.join(BASE_DIR, '.env')
load_dotenv(dotenv_path)

class Config:
    BASE_DIR = BASE_DIR
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    
    # Resume folder - can be set via environment variable or runtime
    # Priority: 1. Runtime setting, 2. Environment variable, 3. Default
    _env_resumes_path = os.getenv("RESUMES_FOLDER_PATH")
    _resumes_dir = _env_resumes_path if _env_resumes_path else os.path.join(DATA_DIR, 'resumes')
    
    CHROMA_DB_DIR = os.path.join(DATA_DIR, 'chroma_db')
    
    if not os.path.exists(CHROMA_DB_DIR):
        os.makedirs(CHROMA_DB_DIR)
    
    # Create default resumes directory if no custom path is set
    if not _env_resumes_path and not os.path.exists(_resumes_dir):
        os.makedirs(_resumes_dir)
    
    @classmethod
    def get_resumes_dir(cls):
        """Get the current resume folder path"""
        return cls._resumes_dir
    
    @classmethod
    def set_resumes_dir(cls, path):
        """Set a custom resume folder path at runtime"""
        if os.path.exists(path) and os.path.isdir(path):
            cls._resumes_dir = os.path.abspath(path)
            print(f"[CONFIG] Resume folder path set to: {cls._resumes_dir}")
            return True
        return False
    
    # For backward compatibility
    @property
    def RESUMES_DIR(self):
        return self._resumes_dir
