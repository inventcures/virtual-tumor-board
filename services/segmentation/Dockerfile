FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV.
# `libgl1-mesa-glx` was removed in Debian 13 (trixie); the loader is now `libgl1`.
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway injects $PORT; default 8000 for local docker run).
EXPOSE 8000

# Use shell form so ${PORT:-8000} is expanded at container start.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
