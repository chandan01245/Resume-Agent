import os
import tempfile
from flask import Blueprint, request, jsonify, Response, stream_with_context, send_file
import json
from .services import get_chroma_collection, process_pdf, analyze_resume_with_huggingface, ingest_resumes_from_disk
from .config import Config

main_bp = Blueprint('main', __name__)

@main_bp.route('/ingest', methods=['POST'])
def trigger_ingest():
    """
    Manually trigger ingestion of resumes from disk.
    Streams progress updates.
    """
    def generate():
        for progress in ingest_resumes_from_disk():
            yield json.dumps(progress) + '\n'
            
    return Response(stream_with_context(generate()), mimetype='application/json')

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
        return jsonify({"error": str(e)}), 500

@main_bp.route('/resumes/<resume_id>', methods=['GET'])
def get_resume_content(resume_id):
    """
    Get the full content of a specific resume by ID.
    """
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
        file_path = os.path.join(Config.RESUMES_DIR, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "PDF file not found on disk"}), 404
        
        return send_file(file_path, mimetype='application/pdf')
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main_bp.route('/upload', methods=['POST'])
def upload_resumes():
    if 'files' not in request.files:
        return jsonify({"error": "No files part"}), 400
    
    files = request.files.getlist('files')
    
    # try:
    #     collection = get_chroma_collection()
    # except ValueError as e:
    #     return jsonify({"error": str(e)}), 500
    
    processed_count = 0
    
    for file in files:
        if file.filename == '':
            continue
            
        try:
            # Save to disk (persistent storage)
            file_path = os.path.join(Config.RESUMES_DIR, file.filename)
            file.save(file_path)
            processed_count += 1
                
        except Exception as e:
            print(f"Error saving {file.filename}: {e}")
            continue

    return jsonify({"message": f"Successfully uploaded {processed_count} resumes. Please click 'Sync Local Folder' to process them."})

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
