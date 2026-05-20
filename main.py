import os
import tempfile
import base64
import requests
import asyncio
import json
import hashlib
from datetime import date
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Optional
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

async def generate_prompt_from_gemini(image_path: str, physics_stats: dict) -> tuple[str, str]:
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
        "Also generate a highly tailored, custom Negative Prompt specifying elements, styles, anomalies, and qualities to avoid "
        "based on the analyzed properties and composition of the image. The negative prompt must be short and concise (under 15 comma-separated words/phrases).\n\n"
        "Format your output exactly as follows with the markers:\n"
        "---POSITIVE PROMPT---\n"
        "[Insert the descriptive positive prompt text here]\n"
        "---NEGATIVE PROMPT---\n"
        "[Insert a short, comma-separated list of negative prompt keywords/phrases to avoid here]"
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
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                pos_prompt = ""
                neg_prompt = ""
                if "---POSITIVE PROMPT---" in text and "---NEGATIVE PROMPT---" in text:
                    parts = text.split("---NEGATIVE PROMPT---")
                    pos_part = parts[0].replace("---POSITIVE PROMPT---", "").strip()
                    neg_part = parts[1].strip()
                    pos_prompt = pos_part
                    neg_prompt = neg_part
                else:
                    pos_prompt = text.strip()
                    neg_prompt = "low quality, blurry, low resolution, artifacts, distorted"
                return pos_prompt, neg_prompt
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

class AnatomyRequest(BaseModel):
    prompt: str

class DailySubmitRequest(BaseModel):
    challenge_id: str
    user_prompt: str

# ── Daily Challenge Data ──────────────────────────────────────────────────────
DAILY_CHALLENGES = [
    {"image_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80", "category": "Portrait", "difficulty": 2},
    {"image_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", "category": "Landscape", "difficulty": 1},
    {"image_url": "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80", "category": "Architecture", "difficulty": 2},
    {"image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80", "category": "Food Photography", "difficulty": 1},
    {"image_url": "https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800&q=80", "category": "Wildlife", "difficulty": 3},
    {"image_url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80", "category": "Abstract", "difficulty": 3},
    {"image_url": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80", "category": "Cityscape", "difficulty": 2},
    {"image_url": "https://images.unsplash.com/photo-1518173946687-a53f45400867?w=800&q=80", "category": "Nature Macro", "difficulty": 2},
    {"image_url": "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80", "category": "Moody Landscape", "difficulty": 2},
    {"image_url": "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80", "category": "Night Photography", "difficulty": 3},
    {"image_url": "https://images.unsplash.com/photo-1495567720989-cebdbdd97913?w=800&q=80", "category": "Minimalist", "difficulty": 1},
    {"image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", "category": "Portrait Close-up", "difficulty": 2},
    {"image_url": "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", "category": "Forest", "difficulty": 1},
    {"image_url": "https://images.unsplash.com/photo-1551244072-5d12893278ab?w=800&q=80", "category": "Product Shot", "difficulty": 2},
]

# Cache for daily challenge analysis (avoid re-processing same image)
_daily_cache = {}

@app.post("/api/improve")
async def improve_text(request: ImproveRequest):
    prompt_template = (
        "You are an expert AI prompt engineer. Rewrite and vastly improve the following basic image generation prompt "
        "by adding descriptive details, lighting, camera angles, and art style, while maintaining the core subject.\n\n"
        f"Original Prompt: {request.text}\n\n"
        "Also generate a highly tailored, custom Negative Prompt listing terms, qualities, and concepts to avoid for this style.\n\n"
        "Format your output exactly as follows with the markers:\n"
        "---POSITIVE PROMPT---\n"
        "[Insert the improved prompt text here]\n"
        "---NEGATIVE PROMPT---\n"
        "[Insert the negative prompt terms here]"
    )
    
    payload = {
        "contents": [{"parts": [{"text": prompt_template}]}],
        "generationConfig": {"temperature": 0.5, "topP": 0.9, "maxOutputTokens": 800}
    }
    
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: _gemini_post(payload))
        if response.status_code == 200:
            result = response.json()
            try:
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                pos_prompt = ""
                neg_prompt = ""
                if "---POSITIVE PROMPT---" in text and "---NEGATIVE PROMPT---" in text:
                    parts = text.split("---NEGATIVE PROMPT---")
                    pos_part = parts[0].replace("---POSITIVE PROMPT---", "").strip()
                    neg_part = parts[1].strip()
                    pos_prompt = pos_part
                    neg_prompt = neg_part
                else:
                    pos_prompt = text.strip()
                    neg_prompt = "low quality, blurry, distorted, low resolution, artifacts"
                return JSONResponse(content={"result": pos_prompt, "negative_prompt": neg_prompt})
            except (KeyError, IndexError):
                return JSONResponse(content={"result": "No response from model.", "negative_prompt": ""})
        else:
            return JSONResponse(content={"result": f"Model error: {response.text}", "negative_prompt": ""}, status_code=500)
    except Exception as e:
        print(f"Error improving text: {e}")
        return JSONResponse(content={"result": "Backend failed to process text.", "negative_prompt": ""}, status_code=500)

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
        
        reprompt_text, negative_prompt = await generate_prompt_from_gemini(temp_path, stats)
        
        return JSONResponse(content={"reprompt": reprompt_text, "negative_prompt": negative_prompt, "stats": stats})
        
    except Exception as e:
        print(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ── Learning Feature Endpoints ────────────────────────────────────────────────

@app.post("/api/anatomy")
async def analyze_anatomy(request: AnatomyRequest):
    """Parse a prompt into color-coded categorized segments."""
    anatomy_prompt = (
        "Parse the following AI image generation prompt into categorized segments. "
        "Each segment should be a meaningful phrase from the prompt.\n\n"
        f'Prompt: "{request.prompt}"\n\n'
        "Categorize each segment into one of these categories:\n"
        "- subject: Description of the main subject/scene\n"
        "- lighting: Lighting conditions, light quality, direction\n"
        "- composition: Camera angle, framing, perspective\n"
        "- style: Art style, medium, artistic technique\n"
        "- mood: Atmosphere, emotion, feeling\n"
        "- technical: Camera settings, lens, depth of field, resolution\n\n"
        "Return ONLY a JSON array (no markdown, no backticks):\n"
        '[{"text": "exact phrase from prompt", "category": "subject", '
        '"tooltip": "Brief explanation of why this element matters in prompts"}]'
    )
    payload = {
        "contents": [{"parts": [{"text": anatomy_prompt}]}],
        "generationConfig": {"temperature": 0.1, "topP": 0.8, "maxOutputTokens": 1500}
    }
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: _gemini_post(payload))
        if response.status_code == 200:
            result = response.json()
            raw = result["candidates"][0]["content"]["parts"][0]["text"]
            raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            segments = json.loads(raw)
            return JSONResponse(content={"segments": segments})
        else:
            raise HTTPException(status_code=response.status_code, detail="Anatomy analysis failed.")
    except json.JSONDecodeError:
        return JSONResponse(content={"segments": [{"text": request.prompt, "category": "subject", "tooltip": "Full prompt"}]})
    except Exception as e:
        print(f"Anatomy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _run_evaluation(image_path: str, user_prompt: str):
    """Shared logic: run physics analysis + Gemini scoring on an image."""
    meta = preprocess(image_path)
    physics = analyze_physics(meta)
    stats = {
        "brightness_class": physics.brightness_class,
        "mean_brightness": physics.mean_brightness,
        "dof_class": physics.dof_class,
        "sharpness_score": physics.sharpness_score,
        "shadow_hardness": physics.shadow_hardness,
        "shadow_score": physics.shadow_score,
        "light_direction": physics.light_direction,
        "contrast_ratio": physics.contrast_ratio,
    }

    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    ext = Path(image_path).suffix.lower()
    mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.bmp': 'image/bmp'}
    mime_type = mime_map.get(ext, 'image/jpeg')

    eval_prompt = (
        "You are an expert prompt engineering instructor scoring a student's attempt.\n\n"
        f"Physical measurements of this image:\n"
        f"- Brightness: {stats['brightness_class']} (Mean: {stats['mean_brightness']})\n"
        f"- Depth of Field: {stats['dof_class']}\n"
        f"- Shadows: {stats['shadow_hardness']}\n"
        f"- Light Direction: {stats['light_direction']}\n"
        f"- Contrast Ratio: {stats['contrast_ratio']}\n\n"
        f'Student\'s prompt attempt: "{user_prompt}"\n\n'
        "Score the student 1-10 and analyze their prompt. Return ONLY valid JSON (no markdown, no backticks):\n"
        '{"score": 7, "feedback": "Overall feedback", '
        '"ideal_prompt": "The ideal prompt for this image", '
        '"ideal_negative_prompt": "blurry, low quality, artifacts, distorted, out of focus", '
        '"breakdown": ['
        '{"element": "Subject Description", "status": "covered", "detail": "..."},'
        '{"element": "Lighting", "status": "missing", "detail": "..."},'
        '{"element": "Composition", "status": "partial", "detail": "..."},'
        '{"element": "Style/Medium", "status": "covered", "detail": "..."},'
        '{"element": "Mood/Atmosphere", "status": "missing", "detail": "..."},'
        '{"element": "Technical Details", "status": "wrong", "detail": "..."},'
        '{"element": "Shadow Description", "status": "missing", "detail": "..."},'
        '{"element": "Color Palette", "status": "missing", "detail": "..."}]}\n'
        "Use status values: covered, missing, partial, wrong. Be encouraging but honest."
    )
    payload = {
        "contents": [{"parts": [
            {"text": eval_prompt},
            {"inline_data": {"mime_type": mime_type, "data": img_b64}}
        ]}],
        "generationConfig": {"temperature": 0.15, "topP": 0.85, "maxOutputTokens": 2000}
    }
    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, lambda: _gemini_post(payload))
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Evaluation failed.")
    raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    evaluation = json.loads(raw)
    evaluation["stats"] = stats
    return evaluation


@app.post("/api/evaluate")
async def evaluate_prompt(file: UploadFile = File(...), user_prompt: str = Form(...)):
    """Score a user's prompt attempt against an uploaded image."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name
    try:
        result = await _run_evaluation(temp_path, user_prompt)
        return JSONResponse(content=result)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="Failed to parse AI evaluation response.")
    except Exception as e:
        print(f"Evaluate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/api/daily-challenge")
async def get_daily_challenge():
    """Return today's daily challenge."""
    today = date.today()
    day_index = today.timetuple().tm_yday % len(DAILY_CHALLENGES)
    challenge = DAILY_CHALLENGES[day_index]
    return JSONResponse(content={
        "id": today.isoformat(),
        "image_url": challenge["image_url"],
        "category": challenge["category"],
        "difficulty": challenge["difficulty"],
    })


@app.post("/api/daily-evaluate")
async def evaluate_daily(request: DailySubmitRequest):
    """Evaluate a user's prompt for the daily challenge."""
    today = date.today()
    day_index = today.timetuple().tm_yday % len(DAILY_CHALLENGES)
    challenge = DAILY_CHALLENGES[day_index]
    image_url = challenge["image_url"]

    # Download the challenge image
    try:
        img_resp = requests.get(image_url, timeout=15)
        img_resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to download challenge image: {e}")

    ext = ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(img_resp.content)
        temp_path = tmp.name
    try:
        result = await _run_evaluation(temp_path, request.user_prompt)
        return JSONResponse(content=result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI evaluation response.")
    except Exception as e:
        print(f"Daily evaluate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
