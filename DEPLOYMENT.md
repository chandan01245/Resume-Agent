# Deployment Guide

## Overview

Nebula is configured for seamless deployment on Railway using Docker. The application uses a multi-stage build to bundle the React frontend with the Flask backend for unified serving.

## Deployment Architecture

- **Build Process**: Multi-stage Docker build - frontend built first, then copied to backend
- **Server**: Gunicorn serves both the Flask API and React frontend
- **Routing**: API routes at `/api/*`, React app serves all other routes
- **Database**: ChromaDB persists in the Railway volume

## Railway Deployment

### Quick Deploy

1. Fork this repository
2. Connect to Railway: [railway.app/new](https://railway.app/new)
3. Select your forked repository
4. Add environment variable:
   ```
   HUGGINGFACE_API_KEY=your_key_here
   ```
5. Deploy!

### Configuration Files

- **Dockerfile**: Multi-stage Docker build for production
- **railway.json**: Railway-specific settings (uses DOCKERFILE builder)
- **Procfile**: Alternative process definition (for Heroku compatibility)

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `HUGGINGFACE_API_KEY` | HuggingFace API key for AI inference | Yes |
| `FLASK_ENV` | Environment mode (auto-set to production) | No |
| `PORT` | Server port (auto-assigned by Railway) | No |

### Build Process (Docker Multi-Stage)

1. **Stage 1 - Frontend Builder**:
   - Use Node.js 18 Alpine image
   - Install frontend dependencies
   - Build React app with Vite
   
2. **Stage 2 - Production Image**:
   - Use Python 3.11 slim image
   - Install system dependencies
   - Install Python dependencies from `backend/requirements.txt`
   - Copy backend code
   - Copy built frontend from Stage 1 to `static/` folder
   
3. **Start**: Launch Gunicorn with Flask app serving both API and frontend

### Post-Deployment

After deployment:
- Access your app at the Railway-provided URL
- Upload resumes via the UI or use the `/api/ingest` endpoint
- ChromaDB data persists across deployments

## Alternative Deployment Options

### Heroku

1. Fork this repository
2. Create new Heroku app
3. Connect GitHub repository
4. Add environment variable: `HUGGINGFACE_API_KEY`
5. Deploy - Heroku will use the Procfile

### Docker (Self-Hosted)

Build and run locally:

```bash
# Build the image
docker build -t nebula-resume .

# Run the container
docker run -p 8000:8000 \
  -e HUGGINGFACE_API_KEY=your_key \
  -v $(pwd)/data:/app/data \
  nebula-resume
```

### Docker Compose (Development)

For local development with separate frontend/backend:

```bash
docker-compose up
```

## Local Development vs Production

### Local Development
- Frontend dev server on port 5173 (Vite)
- Backend API server on port 8000 (Flask)
- API proxy configured in `vite.config.js`

### Production (Railway/Docker)
- Single server on assigned port
- Backend serves static frontend files
- API routes prefixed with `/api`

## Troubleshooting

### Build Failures
- Check that `requirements.txt` and `package.json` are valid
- Ensure Dockerfile syntax is correct
- Review build logs in Railway dashboard

### Runtime Issues
- Check application logs in Railway
- Verify `HUGGINGFACE_API_KEY` is valid
- Ensure sufficient memory allocation (ChromaDB + embeddings)

### Cold Starts
- First request may be slow due to model loading
- HuggingFace API may have cold start latency
- Consider upgrading Railway plan for better performance

## Scaling Considerations

- **Workers**: Configured for 2 Gunicorn workers
- **Timeout**: 120 seconds for long-running AI operations
- **Memory**: Recommend at least 1GB RAM for ChromaDB operations
- **Storage**: Persistent volume needed for ChromaDB data

## Security Notes

- Never commit `.env` file with real API keys
- Use Railway's environment variables for secrets
- CORS configured for all origins (tighten for production)
- Consider adding rate limiting for production use

## Performance Tips

- ChromaDB embedding model loads on first request (adds ~5s)
- Consider using Railway's persistent disk for faster restarts
- Increase worker count for higher concurrent requests
- Use Railway's auto-scaling features for traffic spikes
