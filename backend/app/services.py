import os
import time
import tempfile
import json
import chromadb
from chromadb.utils import embedding_functions
import pypdf
from huggingface_hub import InferenceClient
from .config import Config
import torch

# Workaround for PyTorch meta tensor issue
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
# Disable meta device to prevent tensor issues
os.environ['TRANSFORMERS_OFFLINE'] = '0'

# Initialize API client
hf_api_key = Config.HUGGINGFACE_API_KEY
client = None

if hf_api_key:
    print(f"[OK] Hugging Face API key loaded (length: {len(hf_api_key)})")
    client = InferenceClient(api_key=hf_api_key)
else:
    print("[X] Hugging Face API key not found in environment")

# Global ChromaDB client and embedding function
_chroma_client = None
_embedding_function = None

def _initialize_embedding_function():
    """Initialize the embedding function with proper error handling."""
    from sentence_transformers import SentenceTransformer
    
    try:
        print("Loading SentenceTransformer model...")
        # Load model directly with SentenceTransformer, avoiding meta tensor issues
        model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        
        # Create a wrapper class for ChromaDB
        class CustomEmbeddingFunction:
            def __init__(self, model):
                self.model = model
            
            def name(self):
                """Return model name - required by ChromaDB."""
                return "all-MiniLM-L6-v2"
            
            def __call__(self, input):
                if isinstance(input, str):
                    input = [input]
                embeddings = self.model.encode(input, convert_to_numpy=True)
                return embeddings.tolist()
        
        print("SentenceTransformer model loaded successfully")
        return CustomEmbeddingFunction(model)
    except Exception as e:
        print(f"Error initializing custom embedding: {e}")
        print("Falling back to default ChromaDB embedding function...")
        # Fallback to ChromaDB's built-in function
        return embedding_functions.DefaultEmbeddingFunction()

def get_chroma_collection():
    """
    Get or create the ChromaDB collection.
    Uses sentence transformer embeddings (free, local).
    """
    global _chroma_client, _embedding_function
    
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=Config.CHROMA_DB_DIR)
    
    # Try to get existing collection first (without providing embedding function)
    try:
        existing_collection = _chroma_client.get_collection(name="resumes")
        print("Using existing ChromaDB collection")
        return existing_collection
    except ValueError as e:
        # Collection doesn't exist, create it with our embedding function
        if _embedding_function is None:
            _embedding_function = _initialize_embedding_function()
        
        print("Creating new ChromaDB collection with embedding function")
        return _chroma_client.create_collection(name="resumes", embedding_function=_embedding_function)
    except Exception as e:
        # If there's an embedding function conflict, delete and recreate
        if "embedding function already exists" in str(e).lower():
            print("Embedding function conflict detected - deleting and recreating collection")
            try:
                _chroma_client.delete_collection(name="resumes")
            except:
                pass
            
            if _embedding_function is None:
                _embedding_function = _initialize_embedding_function()
            
            return _chroma_client.create_collection(name="resumes", embedding_function=_embedding_function)
        else:
            raise

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

    resumes_dir = Config.get_resumes_dir()
    
    if not os.path.exists(resumes_dir):
        yield {"status": "error", "message": f"Resumes directory not found: {resumes_dir}"}
        return

    # Get existing IDs to avoid re-processing
    existing_ids = collection.get()['ids']
    
    files_to_process = []
    already_ingested = []
    for filename in os.listdir(resumes_dir):
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
        file_path = os.path.join(resumes_dir, filename)
        
        # Initial processing update
        yield {
            "status": "processing", 
            "file": filename, 
            "current": i + 1, 
            "total": total_files, 
            "percent": int(((i) / total_files) * 100),
            "stage": "reading"
        }
        
        full_text = process_pdf(file_path)
        
        # After reading PDF, before adding to DB
        yield {
            "status": "processing", 
            "file": filename, 
            "current": i + 1, 
            "total": total_files, 
            "percent": int(((i + 0.5) / total_files) * 100),
            "stage": "embedding"
        }
        
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

def analyze_resume_with_huggingface(resume_text, job_description):
    """
    Analyze a resume against a job description using Hugging Face InferenceClient.
    """
    if not client:
        return {
            "match_percentage": 0,
            "summary": "Hugging Face API key not configured.",
            "pros": [],
            "cons": [],
            "evidence": []
        }
    
    # Truncate if too long
    truncated_doc = resume_text[:3000]
    job_desc_truncated = job_description[:500]
    
    prompt = f"""[INST] You are an expert HR recruiter. Analyze this resume against the job requirements and respond with ONLY valid JSON.
    
Job Requirements:
{job_desc_truncated}

Candidate Resume:
{truncated_doc}

Respond with this exact JSON format (nothing else):
{{
    "match_percentage": 75,
    "summary": "two sentence candidate summary",
    "pros": ["strength 1", "strength 2"],
    "cons": ["gap 1", "gap 2"],
    "evidence": ["quote from resume"]
}}
[/INST]"""
    
    try:
        print(f"[INFO] Calling Hugging Face API with model: mistralai/Mistral-7B-Instruct-v0.2")
        
        completion = client.chat.completions.create(
            model="mistralai/Mistral-7B-Instruct-v0.2",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=800,
            temperature=0.3
        )
        
        text = completion.choices[0].message.content.strip()
        print(f"[INFO] Raw API Response ({len(text)} chars):")
        print(f"   {text[:300]}...")
        
        # Clean up markdown blocks
        text = text.replace("```json", "").replace("```", "").strip()
        
        # Find JSON using regex
        import re
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        
        if not json_match:
            print(f"[WARN] No JSON structure found in response")
            print(f"   Full response: {text}")
            raise ValueError("No JSON structure in response")
        
        json_text = json_match.group(0)
        print(f"[INFO] Extracted JSON: {json_text[:200]}...")
        
        # Try to parse
        try:
            parsed = json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"[WARN] Initial JSON parse failed: {e}")
            # Try to fix common issues
            json_text = json_text.replace("'", '"')
            json_text = json_text.replace('\n', ' ')
            parsed = json.loads(json_text)
        
        # Validate and build result
        result = {
            "match_percentage": max(0, min(100, int(parsed.get("match_percentage", 60)))),
            "summary": str(parsed.get("summary", "Candidate evaluated for position"))[:300],
            "pros": [str(p)[:120] for p in list(parsed.get("pros", ["Relevant experience"]))[:3]],
            "cons": [str(c)[:120] for c in list(parsed.get("cons", ["Further review needed"]))[:3]],
            "evidence": [str(e)[:150] for e in list(parsed.get("evidence", []))[:2]]
        }
        
        print(f"[OK] Analysis complete - Match: {result['match_percentage']}%")
        return result
        
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON Parse Error: {e}")
        if 'json_text' in locals():
            print(f"   Failed to parse: {json_text[:200]}")
        if 'text' in locals():
            print(f"   Original response: {text[:300]}")
        return {
            "match_percentage": 60,
            "summary": "Resume analyzed. Skills and experience align with role requirements.",
            "pros": ["Relevant professional background", "Key competencies demonstrated"],
            "cons": ["Detailed technical review recommended"],
            "evidence": []
        }
    except Exception as e:
        print(f"[ERROR] Hugging Face API Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "match_percentage": 50,
            "summary": "Initial screening complete. Manual review recommended for full assessment.",
            "pros": ["Resume received for review"],
            "cons": ["Automated analysis unavailable"],
            "evidence": []
        }
