# ================== CPU & MEMORY LIMIT (BẮT BUỘC ĐẶT TRÊN CÙNG) ==================
import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

import uuid
import shutil
import logging
import gc

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

import torch
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

import cv2
from basicsr.models import create_model
from basicsr.utils.options import parse
from basicsr.utils import img2tensor, tensor2img

# ================== CONFIG ==================
UPLOAD_DIR = "uploads"
RESULT_DIR = "results"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

# Tắt log rác của BasicSR
logging.getLogger("basicsr").setLevel(logging.ERROR)

# ================== FASTAPI ==================
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# ================== MODEL MANAGEMENT (CHỈ 1 MODEL TRONG RAM) ==================
CURRENT_MODEL = {
    "task": None,
    "model": None
}

def load_model(task: str):
    if task == "deblur":
        opt_path = "options/deblur.yml"
    elif task == "denoise":
        opt_path = "options/denoise.yml"
    else:
        raise ValueError("Task không hợp lệ")

    opt = parse(opt_path, is_train=False)

    # FIX BUG BASICSR (BẮT BUỘC)
    opt["dist"] = False
    opt["rank"] = 0
    opt["world_size"] = 1

    model = create_model(opt)
    model.net_g.eval()
    return model


def get_model(task: str):
    # Nếu đổi task → giải phóng model cũ
    if CURRENT_MODEL["task"] != task:
        if CURRENT_MODEL["model"] is not None:
            del CURRENT_MODEL["model"]
            gc.collect()

        CURRENT_MODEL["model"] = load_model(task)
        CURRENT_MODEL["task"] = task

    return CURRENT_MODEL["model"]

# ================== ROUTES ==================
@app.get("/", response_class=HTMLResponse)
def index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    task: str = Form("deblur")
):
    uid = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{uid}.png")
    output_path = os.path.join(RESULT_DIR, f"{uid}.png")

    try:
        print(f"--> [Server] Nhận file: {file.filename} | Task: {task}")

        # ===== Save upload =====
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # ===== Read image =====
        img = cv2.imread(input_path, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Không đọc được ảnh")

        # ===== LIMIT IMAGE SIZE (CHỐNG OOM – RẤT QUAN TRỌNG) =====
        MAX_SIZE = 1024
        h, w = img.shape[:2]
        if max(h, w) > MAX_SIZE:
            scale = MAX_SIZE / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))

        # ===== Preprocess =====
        img = img.astype("float32") / 255.0
        img = img[:, :, ::-1].copy()  # FIX negative stride
        img = img2tensor(img, bgr2rgb=False, float32=True)
        img = img.unsqueeze(0)

        # ===== Inference =====
        model = get_model(task)
        print(f"--> [Server] Đang chạy model: {task}...")

        with torch.no_grad():
            model.feed_data({"lq": img})
            model.test()
            visuals = model.get_current_visuals()
            output = visuals["result"]

        output_img = tensor2img(output, rgb2bgr=True)
        cv2.imwrite(output_path, output_img)

        print("--> [Server] Xong. Trả kết quả.")

        return FileResponse(
            output_path,
            media_type="image/png",
            filename=f"nafnet_{task}.png"
        )

    except Exception as e:
        print("!!! [Server Error]:", e)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # ===== Cleanup upload =====
        if os.path.exists(input_path):
            os.remove(input_path)
            print(f"--> [Cleanup] Đã xóa: {input_path}")

        # ===== Free memory =====
        for var in ["img", "output", "visuals"]:
            if var in locals():
                del locals()[var]

        gc.collect()


# ================== RUN ==================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

