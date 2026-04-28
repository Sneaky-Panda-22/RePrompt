import os
import tempfile
import base64
import requests
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any
from pathlib import Path

from modules.preprocessors import preprocess
from modules.physics_analyzer import analyze_physics

app = FastAPI(title="RePrompt API")

os.makedirs("static", exist_ok=True)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# It's good practice to add a safeguard so the app fails loudly if the key is missing
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set!")
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
# Ordered list of models to try (each has its own separate free-tier quota)
GEMINI_MODELS = [
    "gemini-2.5-flash-lite",   # newest, separate quota
    "gemini-2.0-flash-lite",   # lightweight, generous quota
    "gemini-2.5-flash",        # very capable, separate quota
    "gemini-2.0-flash",        # original
]

import time

def _gemini_post(payload: dict) -> requests.Response:
    """Try each model in order; retry once after a short delay on 429."""
    for model in GEMINI_MODELS:
        url = f"{GEMINI_BASE}/{model}:generateContent?key={GEMINI_API_KEY}"
        print(f"[RePrompt] Trying model: {model}...")
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code == 200:
            print(f"[RePrompt] ✓ Success with {model}")
            return resp
        if resp.status_code == 429:
            # Try a quick retry for this model
            time.sleep(5)
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                return resp
            # Move on to the next model
            continue
        return resp  # Non-429 error, return as-is
    return resp  # All models exhausted, return last response

async def generate_prompt_from_gemini(image_path: str, physics_stats: dict) -> str:
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    ext = Path(image_path).suffix.lower()
    mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.bmp': 'image/bmp'}
    mime_type = mime_map.get(ext, 'image/jpeg')
    
    llm_prompt = (
        "You are an elite AI image prompt engineer. Extract an exhaustively detailed prompt from the provided image for Midjourney v6 or Stable Diffusion.\n"
        "Detect every nuance, art style, lighting effect, and character detail. Format as flowing descriptive paragraphs.\n\n"
        f"Incorporate these verified physical measurements naturally:\n"
        f"- Brightness: {physics_stats['brightness_class']} (Mean: {physics_stats['mean_brightness']})\n"
        f"- Depth of Field: {physics_stats['dof_class']} focus\n"
        f"- Shadows: {physics_stats['shadow_hardness']}\n"
        f"- Lighting Direction: {physics_stats['light_direction']}\n"
        f"- Contrast Ratio: {physics_stats['contrast_ratio']}\n\n"
        "Output ONLY the final descriptive generative prompt text. Start immediately with the prompt."
    )
    
    payload = {
        "contents": [{"parts": [
            {"text": llm_prompt},
            {"inline_data": {"mime_type": mime_type, "data": img_b64}}
        ]}],
        "generationConfig": {"temperature": 0.15, "topP": 0.85, "maxOutputTokens": 1500}
    }
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: _gemini_post(payload))
        if response.status_code == 200:
            result = response.json()
            try:
                return result["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                raise HTTPException(status_code=500, detail="Gemini returned an unexpected response format.")
        elif response.status_code == 429:
            raise HTTPException(status_code=429, detail="Gemini API is currently overloaded. Please try again in 10 seconds.")
        else:
            raise HTTPException(status_code=response.status_code, detail="Gemini API request failed. Check API key and quota.")
    except requests.exceptions.RequestException as e:
        print(f"Gemini API error: {e}")
        raise HTTPException(status_code=503, detail="Could not connect to Gemini API. Please check your internet connection.")

class ImproveRequest(BaseModel):
    text: str

@app.post("/api/improve")
async def improve_text(request: ImproveRequest):
    prompt_template = (
        "You are an expert AI prompt engineer. Rewrite and vastly improve the following basic image generation prompt "
        "by adding descriptive details, lighting, camera angles, and art style, while maintaining the core subject.\n\n"
        f"Original Prompt: {request.text}\n\n"
        "Output ONLY the improved prompt text."
    )
    
    payload = {
        "contents": [{"parts": [{"text": prompt_template}]}],
        "generationConfig": {"temperature": 0.5, "topP": 0.9, "maxOutputTokens": 500}
    }
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: _gemini_post(payload))
        if response.status_code == 200:
            result = response.json()
            try:
                improved = result["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                improved = "No response from model."
            return JSONResponse(content={"result": improved.strip()})
        else:
            return JSONResponse(content={"result": f"Model error: {response.text}"}, status_code=500)
    except Exception as e:
        print(f"Error improving text: {e}")
        return JSONResponse(content={"result": "Backend failed to process text."}, status_code=500)

@app.post("/api/reprompt")
async def create_reprompt(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp')):
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name
        
    try:
        meta = preprocess(temp_path)
        physics = analyze_physics(meta)
        
        stats = {
            "aspect_ratio": meta.aspect_ratio,
            "mean_brightness_global": meta.mean_brightness,
            "global_contrast": meta.global_contrast,
            "dominant_hues": meta.dominant_hues,
            "brightness_class": physics.brightness_class,
            "mean_brightness": physics.mean_brightness,
            "dof_class": physics.dof_class,
            "sharpness_score": physics.sharpness_score,
            "shadow_hardness": physics.shadow_hardness,
            "shadow_score": physics.shadow_score,
            "light_direction": physics.light_direction,
            "contrast_ratio": physics.contrast_ratio,
        }
        
        reprompt_text = await generate_prompt_from_gemini(temp_path, stats)
        
        return JSONResponse(content={"reprompt": reprompt_text, "stats": stats})
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
