# Multi-stage build for production deployment
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Python backend with frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/dist ./static

# Create necessary directories
RUN mkdir -p /app/data/resumes /app/data/chroma_db

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose port (Railway will override this)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/resumes || exit 1

# Start with gunicorn
CMD gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120 --access-logfile - --error-logfile - run:app
