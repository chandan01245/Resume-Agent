import os
import tempfile
from flask import Blueprint, request, jsonify, Response, stream_with_context, send_file
import json
import time
from .services import get_chroma_collection, process_pdf, analyze_resume_with_huggingface, ingest_resumes_from_disk
from .config import Config

main_bp = Blueprint('main', __name__)



@main_bp.route('/ingest', methods=['POST'])
def trigger_ingest():
    """
    Manually trigger ingestion of resumes from disk.
    Streams progress updates.
    """
    try:
        def generate():
            try:
                for progress in ingest_resumes_from_disk():
                    yield json.dumps(progress) + '\n'
            except Exception as e:
                print(f"Error during ingestion: {e}")
                import traceback
                traceback.print_exc()
                yield json.dumps({
                    "status": "error",
                    "message": str(e)
                }) + '\n'
                
        return Response(stream_with_context(generate()), mimetype='application/json')
    except Exception as e:
        print(f"Error starting ingestion: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/resumes', methods=['GET'])
def list_resumes():
    """
    List all resumes currently in the database.
    """
    try:
        collection = get_chroma_collection()
        # Get all IDs and metadatas
        data = collection.get()
        
        resumes = []
        if data and data['ids']:
            for i, id in enumerate(data['ids']):
                meta = data['metadatas'][i] if data['metadatas'] else {}
                resumes.append({
                    "id": id,
                    "filename": meta.get("source", id),
                    "uploaded_at": meta.get("uploaded_at", "Unknown") # Placeholder if we add timestamps later
                })
        
        return jsonify({"resumes": resumes})
    except Exception as e:
        print(f"Error in list_resumes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/resumes/<resume_id>', methods=['GET', 'DELETE'])
def manage_resume(resume_id):
    """
    Get or delete a specific resume by ID.
    """
    if request.method == 'GET':
        try:
            collection = get_chroma_collection()
            result = collection.get(ids=[resume_id], include=['documents', 'metadatas'])
            
            if not result['ids']:
                return jsonify({"error": "Resume not found"}), 404
            
            return jsonify({
                "id": result['ids'][0],
                "filename": result['metadatas'][0].get("source", resume_id),
                "content": result['documents'][0]
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            collection = get_chroma_collection()
            
            # Get the filename before deleting from DB (just for response)
            result = collection.get(ids=[resume_id], include=['metadatas'])
            
            if not result['ids']:
                return jsonify({"error": "Resume not found"}), 404
            
            filename = result['metadatas'][0].get("source", resume_id)
            
            # Delete from ChromaDB
            collection.delete(ids=[resume_id])
            
            # NOTE: User requested to NOT delete the actual file from disk
            # file_path = os.path.join(Config.get_resumes_dir(), filename)
            # if os.path.exists(file_path):
            #     os.remove(file_path)
            
            return jsonify({
                "message": f"Resume '{filename}' deleted from database",
                "id": resume_id,
                "filename": filename
            })
        except Exception as e:
            print(f"Error deleting resume: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

@main_bp.route('/resumes/delete', methods=['POST'])
def bulk_delete_resumes():
    """
    Delete multiple resumes by ID.
    """
    data = request.get_json()
    if not data or 'ids' not in data:
        return jsonify({"error": "List of IDs is required"}), 400
        
    ids_to_delete = data['ids']
    if not isinstance(ids_to_delete, list):
        return jsonify({"error": "IDs must be a list"}), 400
        
    if not ids_to_delete:
        return jsonify({"message": "No IDs provided", "count": 0, "ids": []})
        
    try:
        collection = get_chroma_collection()
        
        # Delete from ChromaDB
        collection.delete(ids=ids_to_delete)
        
        # NOTE: Not deleting files from disk as requested
        
        return jsonify({
            "message": f"Successfully deleted {len(ids_to_delete)} resumes",
            "count": len(ids_to_delete),
            "ids": ids_to_delete
        })
    except Exception as e:
        print(f"Error in bulk delete: {e}")
        return jsonify({"error": str(e)}), 500

@main_bp.route('/resumes/<resume_id>/pdf', methods=['GET'])
def get_resume_pdf(resume_id):
    """
    Serve the actual PDF file for a resume.
    """
    try:
        # Get the filename from ChromaDB metadata
        collection = get_chroma_collection()
        result = collection.get(ids=[resume_id], include=['metadatas'])
        
        if not result['ids']:
            return jsonify({"error": "Resume not found"}), 404
        
        filename = result['metadatas'][0].get("source", resume_id)
        file_path = os.path.join(Config.get_resumes_dir(), filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "PDF file not found on disk"}), 404
        
        return send_file(file_path, mimetype='application/pdf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@main_bp.route('/scan-folder', methods=['GET'])
def scan_folder():
    """
    Scan the resumes folder and return list of PDF files found.
    Does NOT upload or modify files - just reads what's already there.
    """
    try:
        resumes_dir = Config.get_resumes_dir()
        if not os.path.exists(resumes_dir):
            return jsonify({"files": [], "message": "Resume folder not found"})
        
        pdf_files = [f for f in os.listdir(resumes_dir) if f.lower().endswith('.pdf')]
        
        return jsonify({
            "files": pdf_files,
            "count": len(pdf_files),
            "folder": resumes_dir
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main_bp.route('/upload', methods=['POST'])
def upload_resumes():
    """
    Upload PDF files from user-selected folder to the resumes directory.
    """
    print("\n" + "="*60)
    print("UPLOAD ENDPOINT HIT - Files are being uploaded to server!")
    print("="*60 + "\n")
    
    try:
        resumes_dir = Config.get_resumes_dir()
        os.makedirs(resumes_dir, exist_ok=True)
        
        if 'files' not in request.files:
            return jsonify({"error": "No files provided"}), 400
        
        files = request.files.getlist('files')
        
        if len(files) == 0:
            return jsonify({"error": "No files selected"}), 400
        
        print(f"Received {len(files)} files for upload")
        processed_count = 0
        errors = []
        
        for file in files:
            if file.filename == '':
                continue
            
            # Only accept PDFs
            if not file.filename.lower().endswith('.pdf'):
                continue
                
            try:
                from werkzeug.utils import secure_filename
                safe_filename = secure_filename(file.filename)
                
                if not safe_filename:
                    import uuid
                    safe_filename = f"resume_{uuid.uuid4().hex}.pdf"
                
                file_path = os.path.join(resumes_dir, safe_filename)
                file.save(file_path)
                processed_count += 1
                print(f"Saved: {safe_filename}")
                    
            except Exception as e:
                print(f"Error saving {file.filename}: {e}")
                errors.append(f"Failed to save {file.filename}")
                continue
        
        return jsonify({
            "message": f"Successfully uploaded {processed_count} PDF files. Ready for processing.",
            "count": processed_count,
            "errors": errors if errors else None
        })
        
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@main_bp.route('/analyze', methods=['POST'])
def analyze_resumes():
    data = request.get_json()
    if not data or 'description' not in data:
        return jsonify({"error": "Job description is required"}), 400
        
    job_description = data['description']
    
    try:
        collection = get_chroma_collection()
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    
    # 1. Query ChromaDB for top matches
    count = collection.count()
    if count == 0:
        return jsonify({"results": []})
        
    n_results = min(count, 10) # Get top 10
    
    results = collection.query(
        query_texts=[job_description],
        n_results=n_results
    )
    
    if not results['documents']:
        return jsonify({"results": []})
        
    # 2. Use Gemini to analyze the match
    analyzed_results = []
    
    docs = results['documents'][0]
    metadatas = results['metadatas'][0]
    ids = results['ids'][0]
    
    for i, doc in enumerate(docs):
        meta = metadatas[i]
        source = meta.get("source", "Unknown")
        
        analysis_data = analyze_resume_with_huggingface(doc, job_description)
        
        analyzed_results.append({
            "resume_name": source,
            "score": analysis_data.get("match_percentage", 0),
            "summary": analysis_data.get("summary", "No summary provided."),
            "pros": analysis_data.get("pros", []),
            "cons": analysis_data.get("cons", []),
            "evidence": analysis_data.get("evidence", []),
            "id": ids[i]
        })
            
    # Sort by score
    analyzed_results.sort(key=lambda x: x['score'], reverse=True)
    
    return jsonify({"results": analyzed_results})


