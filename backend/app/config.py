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
    RESUMES_DIR = os.path.join(DATA_DIR, 'resumes')
    CHROMA_DB_DIR = os.path.join(DATA_DIR, 'chroma_db')
    
    if not os.path.exists(CHROMA_DB_DIR):
        os.makedirs(CHROMA_DB_DIR)
    
    if not os.path.exists(RESUMES_DIR):
        os.makedirs(RESUMES_DIR)
