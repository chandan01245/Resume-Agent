import os
import time
import tempfile
import json
import chromadb
from chromadb.utils import embedding_functions
import pypdf
import requests
from .config import Config

# Initialize API client
hf_api_key = Config.HUGGINGFACE_API_KEY
HF_API_URL = "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"

# Debug: Log if API key is configured
if hf_api_key:
    print(f"✓ Hugging Face API key loaded (length: {len(hf_api_key)})")
else:
    print("✗ Hugging Face API key not found in environment")

def get_chroma_collection():
    """
    Get or create the ChromaDB collection.
    Uses default sentence transformer embeddings (free, no API key needed).
    """
    chroma_client = chromadb.PersistentClient(path=Config.CHROMA_DB_DIR)
    # Use default sentence transformer (all-MiniLM-L6-v2) - free and local
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )
    return chroma_client.get_or_create_collection(name="resumes", embedding_function=sentence_transformer_ef)

def process_pdf(file_path):
    """
    Extract text from a PDF file.
    """
    try:
        reader = pypdf.PdfReader(file_path)
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
        return full_text
    except Exception as e:
        print(f"Error reading PDF {file_path}: {e}")
        return None

def ingest_resumes_from_disk():
    """
    Scan the data/resumes directory and ingest any new PDFs into ChromaDB.
    Yields progress updates.
    """
    try:
        collection = get_chroma_collection()
    except ValueError as e:
        yield {"status": "error", "message": f"Error getting collection: {e}"}
        return

    if not os.path.exists(Config.RESUMES_DIR):
        yield {"status": "error", "message": f"Resumes directory not found: {Config.RESUMES_DIR}"}
        return

    # Get existing IDs to avoid re-processing
    existing_ids = collection.get()['ids']
    
    files_to_process = []
    already_ingested = []
    for filename in os.listdir(Config.RESUMES_DIR):
        if filename.lower().endswith(".pdf"):
            if filename not in existing_ids:
                files_to_process.append(filename)
            else:
                already_ingested.append(filename)
            
    total_files = len(files_to_process)
    if total_files == 0:
        if len(already_ingested) > 0:
            yield {"status": "complete", "message": f"All {len(already_ingested)} resumes are already ingested. No new resumes to process.", "processed": 0, "total": 0, "already_ingested": len(already_ingested)}
        else:
            yield {"status": "complete", "message": "No PDF resumes found in the folder.", "processed": 0, "total": 0}
        return

    processed_count = 0
    
    for i, filename in enumerate(files_to_process):
        file_path = os.path.join(Config.RESUMES_DIR, filename)
        
        yield {
            "status": "processing", 
            "file": filename, 
            "current": i + 1, 
            "total": total_files,
            "percent": int(((i) / total_files) * 100)
        }
        
        full_text = process_pdf(file_path)
        
        if full_text and full_text.strip():
            try:
                collection.add(
                    documents=[full_text], 
                    metadatas=[{"source": filename}], 
                    ids=[filename]
                )
                processed_count += 1
                yield {
                    "status": "processing", 
                    "file": filename, 
                    "current": i + 1, 
                    "total": total_files, 
                    "percent": int(((i + 1) / total_files) * 100)
                } 
            except Exception as e:
                error_msg = f"Error adding {filename}: {str(e)}"
                print(error_msg)
                yield {"status": "error", "message": error_msg, "file": filename}
        else:
            yield {"status": "error", "message": f"Could not extract text from {filename}", "file": filename}
        
    yield {"status": "complete", "message": f"Ingested {processed_count} new resumes.", "processed": processed_count, "total": total_files}

def analyze_resume_with_gemini(resume_text, job_description):
    """
    Analyze a resume against a job description using Hugging Face API.
    """
    if not hf_api_key:
        return {
            "match_percentage": 0,
            "summary": "Hugging Face API key not configured.",
            "pros": [],
            "cons": [],
            "evidence": []
        }
    
    # Truncate if too long
    truncated_doc = resume_text[:4000]
    
    prompt = f"""[INST] You are an expert HR AI Recruiter. Analyze the resume against the job description and respond with ONLY valid JSON.

JOB DESCRIPTION:
{job_description}

RESUME CONTENT:
{truncated_doc}

Respond with valid JSON in this exact format:
{{
    "match_percentage": 75,
    "summary": "One sentence candidate summary",
    "pros": ["Strong point 1", "Strong point 2"],
    "cons": ["Weak point 1", "Weak point 2"],
    "evidence": ["Quote from resume", "Another quote"]
}}
[/INST]"""
    
    try:
        headers = {
            "Authorization": f"Bearer {hf_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 800,
                "temperature": 0.7,
                "top_p": 0.95,
                "return_full_text": False
            }
        }
        
        response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 503:
            time.sleep(20)
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=30)
        
        response.raise_for_status()
        result = response.json()
        
        if isinstance(result, list) and len(result) > 0:
            text = result[0].get('generated_text', '').strip()
        else:
            text = result.get('generated_text', '').strip()
        
        # Clean up markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        # Extract JSON from text
        text = text.strip()
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            json_text = text[start_idx:end_idx+1]
            parsed = json.loads(json_text)
            
            # Ensure all required fields exist with defaults
            return {
                "match_percentage": parsed.get("match_percentage", 50),
                "summary": parsed.get("summary", "Candidate analysis completed."),
                "pros": parsed.get("pros", ["Experience relevant to role"]),
                "cons": parsed.get("cons", ["Some skills may need development"]),
                "evidence": parsed.get("evidence", [])
            }
        else:
            raise ValueError("No valid JSON found in response")
            
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Response text: {text[:200]}")
        return {
            "match_percentage": 50,
            "summary": "Analysis completed but response parsing failed.",
            "pros": ["Relevant experience found"],
            "cons": ["Need more detailed evaluation"],
            "evidence": []
        }
    except Exception as e:
        print(f"Hugging Face Analysis Error: {e}")
        return {
            "match_percentage": 0,
            "summary": f"Error analyzing resume: {str(e)[:50]}",
            "pros": [],
            "cons": [],
            "evidence": []
        }
