# Deployment Guide

## 1. Backend (Render)

Render is a great platform for deploying Python Flask apps.

1.  **Create a `requirements.txt`**: Ensure `backend/requirements.txt` lists all dependencies.
    *   `flask`
    *   `flask-cors`
    *   `chromadb`
    *   `pypdf`
    *   `python-dotenv`
    *   `google-generativeai`
    *   `gunicorn` (Important for production!)

2.  **Create a `render.yaml`** (optional, or configure in dashboard):
    *   **Build Command**: `pip install -r backend/requirements.txt`
    *   **Start Command**: `gunicorn --chdir backend run:app` (Assuming `run.py` contains `app` and is in `backend/`) or `python backend/run.py` if using the simple runner.
    *   **Environment Variables**:
        *   `GOOGLE_API_KEY`: Your Gemini API Key.
        *   `CHROMA_DB_DIR`: `/opt/render/project/src/data/chroma_db` (Render has ephemeral disks unless you use a persistent disk, but for a demo, ephemeral is fine, just know data resets on deploy).

3.  **Push to GitHub**: Push this code to a GitHub repository.

4.  **Deploy on Render**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   New -> Web Service.
    *   Connect your GitHub repo.
    *   Root Directory: `.` (or `backend` if you want to isolate).
    *   Build Command: `pip install -r backend/requirements.txt`
    *   Start Command: `python backend/run.py` (or use gunicorn for better performance).

## 2. Frontend (Vercel)

Vercel is the best place for React/Vite apps.

1.  **Push to GitHub**: Same repo as above.

2.  **Deploy on Vercel**:
    *   Go to [vercel.com](https://vercel.com).
    *   Add New -> Project.
    *   Import your GitHub repo.
    *   **Framework Preset**: Vite.
    *   **Root Directory**: `frontend`.
    *   **Environment Variables**:
        *   `VITE_API_URL`: The URL of your deployed Backend (e.g., `https://resume-agent-backend.onrender.com`).
        *   *Note*: You need to update `frontend/src/api.js` to use `import.meta.env.VITE_API_URL || 'http://localhost:5000'` instead of hardcoding localhost.

3.  **Update Frontend Code**:
    *   In `frontend/src/api.js`, change:
        ```javascript
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        ```

## 3. Important Notes

*   **Persistence**: On free tiers of Render/Heroku, the filesystem is **ephemeral**. This means your uploaded resumes and ChromaDB database will be **deleted** every time the app restarts or redeploys.
*   **Solution**: For a real production app, you need to use:
    *   **S3 / Google Cloud Storage** for storing PDF files.
    *   **ChromaDB Client/Server** mode or a managed vector database (like Pinecone) instead of a local file-based DB.
