# ============================================================
# NAFNet Docker Image - Image Restoration AI Server
# ============================================================
# Build:   docker build -t nafnet .
# Run:     docker run -p 8000:8000 nafnet
# Access:  http://localhost:8000
# ============================================================

FROM python:3.10-slim

# System dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY basicsr/ basicsr/
COPY options/ options/
COPY static/ static/
COPY server.py .
COPY download_models.py .

# Download pre-trained models during build
RUN python download_models.py

# Create runtime directories
RUN mkdir -p uploads results

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
