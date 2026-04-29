# RePrompt — AI Vision Forensics & Prompt Engineering

RePrompt is a professional-grade image forensic tool designed to reverse-engineer AI-generated images. By combining **Computer Vision (OpenCV)** with **Vision-Language Models (Google Gemini)**, it extracts the hidden physical DNA of an image and synthesizes it into a highly detailed, reusable prompt for Midjourney, DALL-E, or Stable Diffusion.

## Key Features

- **Forensic Analysis:** Uses OpenCV to measure real-world physics: mean brightness, contrast ratios, shadow hardness, light direction, and depth-of-field variance.
- **Hybrid Intelligence:** Grounds Gemini 2.0/2.5 Flash in factual pixel data to prevent AI hallucinations and ensure maximum prompt accuracy.
- **Adaptive Interface:** Premium Apple-inspired glassmorphism design with a persistent **Dark Mode** toggle.
- **Temporary History:** A dedicated "Temporary History" page that saves your last 5 generations locally in your browser so you never lose a good prompt.
- **Client-Side Optimization:** Automatically compresses and optimizes images before upload to ensure lightning-fast processing even on slow connections.
- **PDF Export:** One-click forensic reports containing your prompt and all extracted physics metadata.
- **Creative UI:** Features a custom futuristic CSS loader, glassmorphic toast notifications, and smooth scroll animations.

---

## Tech Stack

- **Backend:** FastAPI (Python)
- **Forensics:** OpenCV, NumPy
- **Intelligence:** Google Gemini 2.0/2.5 Flash API
- **Frontend:** Vanilla HTML5, CSS3 (Custom Variables), JavaScript (ES6+)
- **Animations:** Intersection Observer API & CSS Keyframes

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Sneaky-Panda-22/RePrompt.git
cd RePrompt
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up your API Key
RePrompt uses environment variables to keep your secrets safe. **Do not hardcode your API key.**

**On macOS/Linux:**
```bash
export GEMINI_API_KEY="your_actual_api_key_here"
```

**On Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_actual_api_key_here
```

### 4. Run the application
```bash
python main.py
```
Open `http://localhost:8080` in your browser.

---

## Architecture & Pipeline

RePrompt follows a rigorous three-stage analysis pipeline:

1.  **Preprocessing:** Standardizes the image, performs noise reduction via Bilateral Filtering, and analyzes HSV color distributions.
2.  **Physics Extraction:** Measures objective properties like Laplacian Variance (Sharpness) and Sobel Gradients (Shadows).
3.  **Prompt Synthesis:** Injects these measurements into a high-level system prompt for Gemini, which returns the final reverse-engineered text.

---

## Privacy & Security

RePrompt is **stateless by design**. Images are processed in a secure temporary buffer and are **immediately deleted** from the server after analysis. No user images are ever stored permanently on the server. History is stored locally in *your* browser's `localStorage`.

---

Developed with ❤️ by [Parth Tandon](https://github.com/Sneaky-Panda-22)
"# RePrompt" 
