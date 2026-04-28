# RePrompt — Codebase Architecture Analysis

## 1. Architecture & Pipeline Overview

### The Big Picture

RePrompt is an **AI-powered image forensics web application**. Given any AI-generated image, it reverse-engineers the prompt that was likely used to create it. It does this by combining two strategies:

1. **Computer vision** (OpenCV): Extracts measurable, objective physical properties from the image — brightness, sharpness, shadow hardness, light direction, contrast ratio, and depth of field. These are not guesses; they are real numerical measurements from pixel data.
2. **Vision-Language AI** (Google Gemini): Takes both the raw image *and* the verified physics measurements, and synthesizes a richly detailed, reusable generative prompt in natural language.

The result is far more accurate than asking an LLM alone, because Gemini is grounded by the factual measurements the OpenCV layer already computed.

---

### The Pipeline (Execution Path)

```
[User Browser]
     │
     │  POST /api/reprompt (multipart/form-data, image file)
     ▼
[FastAPI — main.py]
     │
     │  1. Writes image to a temporary file (tempfile)
     ▼
[modules/preprocessors.py — preprocess()]
     │  - Validates the image format
     │  - Reads the original resolution & aspect ratio
     │  - Letterbox-resizes to 1024×1024 (preserving aspect ratio)
     │  - Applies bilateral filter (noise reduction, edge-preserving)
     │  - Converts to grayscale
     │  - Computes global brightness & contrast (std dev)
     │  - Runs HSV color histogram analysis for dominant hues
     │  - Returns: PreprocessMetadata (dataclass carrying all stats + image arrays)
     ▼
[modules/physics_analyzer.py — analyze_physics()]
     │  - Takes the grayscale image from PreprocessMetadata
     │  - Strips letterbox padding to avoid measuring black borders
     │  - Runs 5 measurements in sequence:
     │     • classify_brightness()   → Laplacian mean → "high-key" / "mid-key" / "low-key"
     │     • estimate_sharpness()    → Laplacian variance → "deep" / "moderate" / "shallow" DoF
     │     • estimate_shadow_hardness() → Sobel gradient magnitude → "hard" / "soft" / "diffuse"
     │     • estimate_light_direction()  → Bright pixel centroid → "top-left", "right", etc.
     │     • compute_edge_density()  → Canny edge pixel ratio → busyness of composition
     │  - Returns: PhysicsMetadata (dataclass)
     ▼
[main.py — generate_prompt_from_gemini()]
     │  - Reads temp image file → encodes to base64
     │  - Builds a detailed system prompt injecting the physics stats
     │  - Sends request to Gemini API with _gemini_post() (fallback loop)
     │    → Tries: gemini-2.5-flash-lite → gemini-2.0-flash-lite → gemini-2.5-flash → gemini-2.0-flash
     │    → Handles 429 (rate limit) with a 5-second retry, then moves to next model
     │  - Returns the final text prompt string
     ▼
[FastAPI — /api/reprompt response]
     │  - Returns JSON: { reprompt: "...", stats: { ... } }
     ▼
[User Browser — script.js]
     │  - Displays the generated prompt in the prompt-box
     │  - Dynamically renders physics stat cards in the stats-grid
     │  - User can Copy to clipboard or Download PDF
     │    └─ PDF is generated client-side using jsPDF (no server round-trip)
```

### Storage

RePrompt is **stateless by design**. There is no database. No image is permanently saved on the server. The uploaded image is written to a `tempfile` at the start of a request and deleted in the `finally` block before the response is sent. Results exist only in the browser until the user copies or downloads them.

---

## 2. File-by-File Breakdown

### `main.py` — The Application Core

**Purpose:** The central orchestrator. Wires together the FastAPI web server, the two CV modules, and the Gemini API into one coherent web service.

**Key Mechanics:**
- **`_gemini_post(payload)`** — A resilience wrapper that iterates through a priority-ordered list of Gemini model IDs (`GEMINI_MODELS`). On a `429 Too Many Requests`, it waits 5 seconds and retries once before falling through to the next model. This is the key trick that keeps the free-tier app alive even under rate pressure.
- **`/api/reprompt`** — The main endpoint. Orchestrates the full pipeline: temp file → `preprocess()` → `analyze_physics()` → `generate_prompt_from_gemini()` → clean up temp file.
- **`/api/improve`** — A secondary endpoint (text-only). Takes a basic prompt string and returns an enhanced version. Uses the same Gemini fallback mechanism.
- **`app.mount("/")`** — Serves the `static/` directory as the frontend. FastAPI handles both the API and static file serving from one process.
- **`GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")`** — The API key is read from an environment variable (set on Render), keeping secrets out of source code.

**Dependencies:** `modules/preprocessors.py`, `modules/physics_analyzer.py`, `requests`, `fastapi`, `uvicorn`

---

### `modules/preprocessors.py` — The Image Preprocessor

**Purpose:** Standardizes every incoming image into a consistent, clean, known-size numpy array that the physics analyzer can operate on reliably.

**Key Mechanics:**

| Step | Function | What it does |
|---|---|---|
| 1 | `validate_image()` | Checks extension + confirms OpenCV can decode it |
| 2 | `letterbox_resize()` | Scales to 1024×1024, preserving aspect ratio, black-pads the short axis |
| 3 | `reduce_noise()` | Bilateral filter — smooths flat regions but preserves edges (important: edges are needed for sharpness/shadow detection downstream) |
| 4 | Grayscale + stats | `mean_brightness`, `global_contrast` (std dev of gray channel) |
| 5 | `analyze_color_histogram()` | Computes per-channel RGB mean/std, dominant hue, saturation, and top-3 HSV hue peaks |

**Output:** `PreprocessMetadata` — a dataclass that bundles all stats *plus* carries the live numpy image arrays (`_image_bgr`, `_image_rgb`, `_image_gray`) to the next stage. The underscore prefix marks them as internal (not JSON-serialized).

**Why letterboxing instead of plain resize?** A plain stretch would distort the image, changing the apparent aspect ratio and giving wrong results for light direction (which uses pixel centroid positions). Letterboxing preserves true geometry.

---

### `modules/physics_analyzer.py` — The Physics Engine

**Purpose:** Performs the core "image forensics" — extracting physically measurable properties that describe *how* the image was lit and composed.

**Key Mechanics:**

| Feature | Method | Algorithm |
|---|---|---|
| Brightness | `classify_brightness()` | Mean pixel value of grayscale, thresholded |
| Sharpness / DoF | `estimate_sharpness()` | **Laplacian variance** — high variance = sharp edges = deep focus |
| Shadow Hardness | `estimate_shadow_hardness()` | **Sobel gradient mean** — high gradient transitions = hard shadows from a point source |
| Light Direction | `estimate_light_direction()` | **Moment centroid** of brightest 10% of pixels, normalized to [-1,1] from center |
| Edge Density | `compute_edge_density()` | **Canny edge detector**, ratio of edge pixels to total — measures compositional busyness |
| Contrast Ratio | inline | P95 luminance / P5 luminance — avoids clipping noise at pure black/white |

**Smart Detail:** Before running any analysis, `get_content_region()` slices away the letterbox padding added by the preprocessor. This means the stats reflect only the actual image pixels, not the black borders.

---

### `static/index.html` — The Frontend Layout

**Purpose:** Single-page application shell with three tabs: App, Docs, About.

**Mechanics:** Three `<div class="page-section">` containers. Navigation is handled by `script.js` toggling a `page-section--active` CSS class — no page reloads, no framework. The `jsPDF` library is loaded via CDN in the `<head>` to enable client-side PDF generation.

---

### `static/style.css` — The Design System

**Purpose:** Implements the full Apple-inspired glassmorphism aesthetic via CSS custom properties (variables).

**Key Techniques:**
- **CSS variables** (`--blue`, `--surface`, `--radius`, `--ease`) — all design tokens in one place, easily themeable.
- **`.reveal` / `.reveal-scale`** — elements start at `opacity: 0` / `translateY(20px)` and transition to visible when the `IntersectionObserver` in `script.js` adds the `.visible` class. This is the scroll animation system.
- **Glassmorphism nav** — `backdrop-filter: blur(20px) saturate(180%)` gives the frosted glass effect.
- **`flex-shrink: 0` on `.nav-logo`** — prevents the logo from squishing when navigation links expand.

---

### `static/script.js` — The Frontend Brain

**Purpose:** All interactivity, UI state management, API communication, and animations.

**Key Responsibilities:**
- **Navigation:** Switches between App / Docs / About sections by toggling `page-section--active` on `div`s.
- **`IntersectionObserver`:** Watches `.reveal` and `.reveal-scale` elements. When they enter the viewport, adds `.visible`, triggering the CSS transition.
- **Upload Handling:** Supports click-to-browse, drag-and-drop, and standard file input. Uses `FileReader` to render image previews as data URLs locally (no server round-trip for preview).
- **`processImage()`:** Sends the image to `/api/reprompt` via `FormData`. On success, populates the prompt box and dynamically builds the physics stats card grid via DOM manipulation.
- **Copy Button:** Uses the `navigator.clipboard` API for a clean copy with visual feedback.
- **Download PDF:** Uses `jsPDF` (`window.jspdf`) to build a PDF in memory. Draws the image onto an offscreen `<canvas>` first (converting to JPEG — solves `webp`/`png` incompatibility with some jsPDF versions), then lays out the "Analyzed Prompt:" header and wrapped text. The file is triggered for download client-side.

---

## 3. Design Decisions — The What & Why

| Decision | Rationale |
|---|---|
| **FastAPI over Flask/Django** | FastAPI's async-first design means I/O-bound operations (waiting for Gemini API response) don't block the thread. `await loop.run_in_executor` offloads the synchronous `requests.post` to a thread pool, keeping the event loop free. |
| **No database / stateless design** | This is a stateless analysis tool, not a history-tracking service. Tempfiles + immediate deletion keeps storage at zero and avoids privacy issues with user images. |
| **Hybrid CV + LLM approach** | Pure LLM prompting hallucinates measurements ("the lighting appears soft" when it's actually harsh). Pure CV can't describe artistic style. The hybrid grounds the LLM in real numbers, producing more reproducible prompts. |
| **Multi-model fallback** | Gemini free-tier quotas are per-model. By having 4 fallbacks, the app effectively has 4× the free quota headroom before a real error is returned to the user. |
| **Bilateral filter for denoising** | Unlike Gaussian blur, bilateral preserves edge sharpness. Since the physics engine uses Sobel (edge gradients) and Laplacian (variance across edges), blurring edges with a Gaussian would corrupt the measurements. |
| **Letterbox instead of stretch resize** | Preserves true geometry so the light direction centroid calculation isn't spatially distorted. |
| **Client-side PDF with jsPDF** | No extra server dependency, no extra compute on Render's free tier, and no extra API call. The browser already has the image and the text — generating the PDF there is the obvious choice. |
| **Vanilla HTML/CSS/JS** | Zero framework overhead means ultra-fast first load — no React/Vue bundle to download. For a single-page tool with three static views, a framework would be pure complexity. |

---

## 4. Alternatives & Improvements

### Alternative 1: Full Cloud-Native Serverless (AWS Lambda + S3)

**Architecture:** Replace the Render+FastAPI server with AWS Lambda functions behind API Gateway. Store uploaded images in S3, analysis results in DynamoDB.

| Aspect | Current Setup | AWS Lambda |
|---|---|---|
| **Scaling** | Single Render instance (can bottleneck) | Auto-scales to thousands of requests |
| **Cost** | Free on Render (within limits) | Pay-per-use, potentially free tier, but complex billing |
| **Cold start** | None (persistent server) | Lambda cold starts (~1-2 seconds latency) |
| **OpenCV** | Installed on server | Needs Lambda Layer (adds complexity) |
| **Best for** | Small projects, easy deployment | High-traffic production apps |

**Verdict:** Major overkill for this use case. Current setup is the right call.

---

### Alternative 2: Replace OpenCV Physics with Gemini Vision Alone (Pure LLM)

**Architecture:** Remove both `modules/` entirely. Just send the image to Gemini and ask it to describe everything.

| Aspect | Current Hybrid | Pure LLM |
|---|---|---|
| **Accuracy** | High (measurements are factual) | Moderate (LLM estimates, can hallucinate values) |
| **Reproducibility** | High (same image → same numbers) | Low (temperature/sampling introduces variation) |
| **Speed** | Slightly slower (CV runs first) | Slightly faster (one step) |
| **Dependencies** | Requires OpenCV, numpy | No CV dependencies at all |
| **Prompt specificity** | Grounded in real contrast ratios, exact DoF class | Vague ("soft lighting", "shallow focus" — unquantified) |

**Verdict:** The current hybrid approach is clearly superior for the core use case. The CV layer is what makes RePrompt unique — without it, it's just a wrapper around Gemini.

---

### Alternative 3: Add Persistent History with SQLite

**Architecture:** Add a `history.db` SQLite file. Store each analysis (image hash, prompt result, physics stats, timestamp). Add a "History" tab to the frontend.

| Aspect | Current | With SQLite |
|---|---|---|
| **User experience** | Stateless, no memory | Users can revisit past analyses |
| **Complexity** | Zero | Low (SQLite is file-based, no server needed) |
| **Privacy** | Images never stored | Images stored on disk |
| **Render compatibility** | Full | Works, but disk is ephemeral on free Render tier |

**Verdict:** Viable improvement for a future version, but would need persistent disk storage (e.g., Render Disk add-on or an external object store like Cloudflare R2).

---

> [!TIP]
> The most impactful near-term improvement would be **adding a `/api/history` endpoint with SQLite** to let users save and revisit their analyses. The second most impactful would be **Streaming the Gemini response** via Server-Sent Events, so the prompt appears word-by-word in real time instead of waiting for the full response.
