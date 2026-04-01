import os
import uuid
import shutil
import logging
import gc
import threading

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

import torch
# KHÓA SỨC MẠNH ĐÃ ĐƯỢC MỞ: Bật tính năng sử dụng toàn bộ nhân CPU Intel Core i7
# PyTorch mặc định sẽ tự động nhận diện phần cứng và dùng hết luồng rảnh khi Inference.

import cv2
from basicsr.models import create_model
from basicsr.utils.options import parse
from basicsr.utils import img2tensor, tensor2img

# ================== CONFIG ==================
UPLOAD_DIR = "uploads"
RESULT_DIR = "results"
MAX_FILE_SIZE_MB = 10 # 10 Megabytes

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

# Tắt log rác của BasicSR
logging.getLogger("basicsr").setLevel(logging.ERROR)

# ================== FASTAPI ==================
app = FastAPI(title="NAFNet Academic System", version="1.0.0")

# Security: CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# ================== MODEL MANAGEMENT ==================
CURRENT_MODEL = {
    "task": None,
    "model": None
}
AI_LOCK = threading.Lock()

def load_model(task: str):
    if task == "deblur":
        opt_path = "options/deblur.yml"
    elif task == "denoise":
        opt_path = "options/denoise.yml"
    else:
        raise ValueError("Task không hợp lệ")

    opt = parse(opt_path, is_train=False)

    opt["dist"] = False
    opt["rank"] = 0
    opt["world_size"] = 1

    model = create_model(opt)
    model.net_g.eval()
    return model

def get_model(task: str):
    # Cache and garbage collect old models
    if CURRENT_MODEL["task"] != task:
        if CURRENT_MODEL["model"] is not None:
            del CURRENT_MODEL["model"]
            gc.collect()

        CURRENT_MODEL["model"] = load_model(task)
        CURRENT_MODEL["task"] = task

    return CURRENT_MODEL["model"]

# ================== HELPERS ==================
def cleanup_files(*file_paths):
    """Xóa file để giải phóng ổ cứng thông qua BackgroundTasks"""
    for path in file_paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
                print(f"--> [Cleanup] System removed: {path}")
            except Exception as e:
                print(f"!!! [Cleanup Error]: Cannot remove {path}: {e}")

# ================== ROUTES ==================
@app.get("/", response_class=HTMLResponse)
def index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/process")
def process_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    task: str = Form("deblur")
):
    # 1. Security check: Content-Type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are supported.")

    uid = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{uid}.png")
    output_path = os.path.join(RESULT_DIR, f"{uid}.png")

    try:
        print(f"--> [Server] Request received: {file.filename} | Task: {task}")

        # 2. Prevent large payloads & Save to disk safely
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
        
        if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"File exceeds limit of {MAX_FILE_SIZE_MB}MB")

        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 3. Read image
        img = cv2.imread(input_path, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Cannot read image data. The file might be corrupted.")

        # 4. Limit image dimensions to prevent Server OOM
        MAX_SIZE = 1024
        h, w = img.shape[:2]
        if max(h, w) > MAX_SIZE:
            scale = MAX_SIZE / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))

        # 5. Preprocess for Neural Network
        img = img.astype("float32") / 255.0
        img = img[:, :, ::-1].copy() # BGR to RGB
        img = img2tensor(img, bgr2rgb=False, float32=True)
        img = img.unsqueeze(0)

        # 6. Inference (Thread-safe Lock)
        # Bắt buộc xếp hàng 1-1 qua nút thắt cổ chai AI này để không bị nổ RAM (OOM)
        with AI_LOCK:
            model = get_model(task)
            print(f"--> [Server] [LOCKED] Running forward pass: {task}...")

            with torch.no_grad():
                model.feed_data({"lq": img})
                model.test()
                visuals = model.get_current_visuals()
                output = visuals["result"]

        # 7. Postprocess
        output_img = tensor2img(output, rgb2bgr=True)
        cv2.imwrite(output_path, output_img)
        print("--> [Server] AI Inference Complete. Returning Payload.")

        # 8. Schedule Cleanup Tasks (runs AFTER giving file to user)
        background_tasks.add_task(cleanup_files, input_path, output_path)

        for var in ["img", "output", "visuals"]:
            if var in locals():
                del locals()[var]
        gc.collect()

        return FileResponse(
            output_path,
            media_type="image/png",
            filename=f"nafnet_{task}.png"
        )

    except HTTPException as he:
        # Cleanup uploaded part before raising
        if os.path.exists(input_path):
            os.remove(input_path)
        raise he

    except Exception as e:
        print("!!! [Server Crash]:", e)
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"AI Engine Error: {str(e)}")

# ================== RUN ==================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
