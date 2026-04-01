"""
Script tải bộ trọng số (Pre-trained Models) NAFNet từ Google Drive.
Sử dụng thư viện gdown (đã có trong requirements.txt).

Cách dùng:
    python download_models.py
"""

import os
import gdown

MODEL_DIR = os.path.join("experiments", "pretrained_models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODELS = {
    "deblur.pth": "1RPpJ3U02RJUc62SVYGcKqvpWFKermTrn",
    "denoise.pth": "1lXn10v2cYOnPAm2aUjYIYAlPEck-xfKz",
}

def main():
    print("=" * 50)
    print("  NAFNet - Pretrained Model Downloader")
    print("=" * 50)

    for filename, file_id in MODELS.items():
        output_path = os.path.join(MODEL_DIR, filename)

        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"[✓] {filename} already exists ({size_mb:.1f} MB). Skipping.")
            continue

        print(f"[↓] Downloading {filename}...")
        url = f"https://drive.google.com/uc?id={file_id}"
        gdown.download(url, output_path, quiet=False)

        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"[✓] {filename} downloaded successfully ({size_mb:.1f} MB).")
        else:
            print(f"[✗] Failed to download {filename}. Please download manually.")
            print(f"    Link: https://drive.google.com/file/d/{file_id}/view")

    print()
    print("Done! Models are stored in:", MODEL_DIR)

if __name__ == "__main__":
    main()
