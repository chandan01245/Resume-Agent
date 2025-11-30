# 🌌 Gravitic Equinox Resume Screener

An intelligent, AI-powered resume screening agent that goes beyond keyword matching. It uses **Hugging Face AI** for reasoning and **ChromaDB** for semantic search to analyze resumes against job descriptions, providing detailed feedback on strengths, gaps, and evidence.

## 🚀 Features

-   **Semantic Search**: Finds candidates based on meaning, not just keywords.
-   **AI Reasoning**: Uses LLMs to explain *why* a candidate is a match.
-   **Evidence Extraction**: Highlights specific quotes from the resume.
-   **Modern UI**: A premium, "Command Center" style interface built with React and Tailwind CSS.

## 🏗️ Project Structure

```
Resume-Agent/
├── backend/                # Flask Backend
│   ├── app/
│   │   ├── __init__.py    # App Factory
│   │   ├── routes.py      # API Endpoints
│   │   ├── services.py    # Business Logic (Gemini, ChromaDB)
│   │   └── config.py      # Configuration
│   ├── run.py             # Entry Point
│   └── requirements.txt
├── frontend/               # React Frontend (Vite)
├── data/                   # Data Storage
│   ├── resumes/           # Uploaded Resumes
│   └── chroma_db/         # Vector Database
└── start_app.bat          # One-click start script
```

## 🛠️ Setup & Installation

1.  **Prerequisites**:
    *   Python 3.10+
    *   Node.js 18+
    *   Hugging Face API Key

2.  **Backend Setup**:
    ```bash
    cd backend
    pip install -r requirements.txt
    ```

3.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    ```

4.  **Environment Variables**:
    *   Create a `.env` file in the root directory.
    *   Add your API key: `HUGGINGFACE_API_KEY=your_huggingface_api_key_here`
    *   Get your free API key from: https://huggingface.co/settings/tokens

## ▶️ Running the App

Simply run the start script:
```bash
./start_app.bat
```

Or run manually:
*   **Backend**: `cd backend && python run.py` (Runs on port 5000)
*   **Frontend**: `cd frontend && npm run dev` (Runs on port 5173)

## 🧠 How it Works

1.  **Upload**: Resumes are converted to text and embedded into ChromaDB.
2.  **Search**: When you enter a Job Description, we first find the top 10 semantic matches.
3.  **Analyze**: We send the top matches + JD to Hugging Face AI (Mistral-7B-Instruct).
4.  **Reason**: The AI evaluates the fit, extracting pros, cons, and evidence.
5.  **Display**: The UI shows a detailed breakdown for each candidate.

## 🔑 Getting Your Hugging Face API Key

1. Go to [Hugging Face](https://huggingface.co/join) and create a free account
2. Navigate to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
3. Click "New token" and create a token with "Read" access
4. Copy the token and paste it in your `.env` file as `HUGGINGFACE_API_KEY`
