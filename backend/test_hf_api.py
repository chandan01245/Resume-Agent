"""
Quick test script to verify Hugging Face API is working
"""
import os
import requests
from dotenv import load_dotenv

# Load environment
load_dotenv('../.env')

api_key = os.getenv("HUGGINGFACE_API_KEY")

if not api_key:
    print("❌ HUGGINGFACE_API_KEY not found in environment")
    exit(1)

print(f"✓ API Key loaded (length: {len(api_key)})")

# Test the API
API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "inputs": '[INST] Respond with only this JSON: {"status": "working", "message": "API functional"} [/INST]',
    "parameters": {
        "max_new_tokens": 100,
        "temperature": 0.3,
        "return_full_text": False
    },
    "options": {
        "wait_for_model": True
    }
}

try:
    print("\nTesting API with simple prompt...")
    response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    
    response.raise_for_status()
    result = response.json()
    
    if isinstance(result, list) and len(result) > 0:
        text = result[0].get('generated_text', '')
    else:
        text = str(result)
    
    print(f"\n✓ API Response:\n{text}\n")
    print("✓ Hugging Face API is working correctly!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
