# Resume Folder Configuration Guide

## Overview
The Resume Agent needs to know where to find PDF resume files. There are multiple ways to configure this path depending on your deployment environment.

## Configuration Methods (in priority order)

### 1. **Environment Variable (Recommended for Production)**

Set the `RESUMES_FOLDER_PATH` environment variable:

```bash
# Linux/Mac
export RESUMES_FOLDER_PATH=/app/resumes

# Windows
set RESUMES_FOLDER_PATH=C:\Users\username\Documents\resumes

# Docker
docker run -e RESUMES_FOLDER_PATH=/app/resumes ...
```

### 2. **Runtime Configuration (UI)**

- Click "Set Folder" button in the application
- Enter the absolute path to your resume folder
- Path is validated before being set
- Changes persist only during runtime

### 3. **Default Path**

If no configuration is provided, defaults to:
```
{project_root}/data/resumes
```

## Deployment Examples

### Docker Deployment

**Option A: Mount Volume (Recommended)**
```dockerfile
# docker-compose.yml
version: '3.8'
services:
  resume-agent:
    build: .
    volumes:
      - /host/path/to/resumes:/app/resumes
    environment:
      - RESUMES_FOLDER_PATH=/app/resumes
    ports:
      - "8000:8000"
```

**Option B: Copy Files**
```dockerfile
# Dockerfile
FROM python:3.11
WORKDIR /app
COPY ./resumes /app/resumes
ENV RESUMES_FOLDER_PATH=/app/resumes
# ... rest of Dockerfile
```

### Cloud Deployment (Railway, Heroku, etc.)

**1. Add environment variable in dashboard:**
```
RESUMES_FOLDER_PATH=/app/resumes
```

**2. Use cloud storage mount:**
- Railway: Mount persistent volume
- Heroku: Use S3 or similar (requires code changes)
- Google Cloud Run: Use Cloud Storage FUSE

**3. For read-only deployments:**
- Bundle resumes in Docker image
- Or use runtime configuration to point to a network path

### Local Development

**Option 1: Use default (easiest)**
```bash
# Just place PDFs in:
data/resumes/
```

**Option 2: Point to existing folder**
```bash
# In .env file:
RESUMES_FOLDER_PATH=C:\Users\yourname\Documents\MyResumes

# Then run:
python backend/run.py
```

## Validation

The system validates that:
- ✅ Path exists
- ✅ Path is a directory
- ✅ Application has read permissions
- ℹ️  Shows count of PDF files found

## Troubleshooting

### Path not found error
```
Error: Folder does not exist: /app/resumes
```
**Solution:** Ensure the folder exists or use runtime configuration

### Permission denied
```
Error: Permission denied accessing folder
```
**Solution:** Check folder permissions:
```bash
chmod 755 /path/to/resumes
```

### No PDFs found
```
Found 0 PDF files
```
**Solution:** 
- Ensure PDFs are directly in the folder (not subfolders)
- Check file extensions are `.pdf` (lowercase)

## Best Practices

1. **Development:** Use default `data/resumes` folder
2. **Production:** Use environment variable
3. **Docker:** Mount volumes for persistent storage
4. **Cloud:** Use platform-specific persistent storage solutions
5. **Security:** Never commit actual resumes to git
6. **Permissions:** Ensure read access for the application user

## Security Considerations

- ⚠️  Only administrators should configure folder paths
- ⚠️  Validate paths to prevent directory traversal attacks (backend handles this)
- ⚠️  Consider encryption for sensitive resume data
- ⚠️  Use appropriate file permissions on the resume folder

## Environment Variable Reference

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `RESUMES_FOLDER_PATH` | Absolute path to resume folder | `{project}/data/resumes` | `/app/resumes` |
| `OPENAI_API_KEY` | OpenAI API key | None | `sk-...` |
| `HUGGINGFACE_API_KEY` | HuggingFace API key | None | `hf_...` |

