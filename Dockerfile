# ========= Base image (FIXED) =========
FROM python:3.9-slim-bullseye

# ========= System deps =========
RUN apt-get update && apt-get install -y \
    git \
    wget \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ========= Workdir =========
WORKDIR /app

# ========= Copy requirements =========
COPY requirements.txt .

# ========= Install PyTorch CPU =========
RUN pip install --no-cache-dir \
    torch==1.11.0+cpu \
    torchvision==0.12.0+cpu \
    torchaudio==0.11.0 \
    -f https://download.pytorch.org/whl/torch_stable.html

# ========= Install other deps =========
RUN pip install --no-cache-dir -r requirements.txt

# ========= Copy source =========
COPY . .

# ========= Create model dir =========
RUN mkdir -p experiments/pretrained_models

# ========= Download pretrained models =========
RUN pip install gdown && \
    gdown --folder \
    https://drive.google.com/drive/folders/1hskz900dsMDAmgesVgCxO4lfP8tWjy1O \
    -O experiments/pretrained_models

# ========= Expose port =========
EXPOSE 8000

# ========= Run server =========
CMD ["python", "server.py"]

