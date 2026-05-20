# RePrompt — AI Vision Forensics & Prompt Engineering Dashboard

RePrompt is an industry-ready, professional image forensics and prompt reverse-engineering workspace. By pairing **Computer Vision (OpenCV)** with **Vision-Language Models (Google Gemini)**, it parses the hidden physical properties of an image and generates highly descriptive, optimization-ready prompt blueprints for Midjourney, DALL-E 3, or Stable Diffusion.

The system features a premium, responsive React-based dashboard supporting dynamic Light and Dark modes.

---

## 🚀 Key Workspaces & Features

### 1. Forensic App Workspace
- **Image Auditing:** Measures objective properties like Laplacian Variance (Sharpness), Sobel Gradients (Shadows), global contrast, light direction, and aspect ratio.
- **Prompt Anatomy:** Parses prompt text into interactive color-coded segments (`subject`, `lighting`, `camera`, `style`, `mood`) with hover tooltips.
- **Suggested Negative Prompts:** Automatically generates high-fidelity negative prompts suggesting tags and styles to avoid.
- **Local History Registry:** Persists forensic reports (including positive prompt, negative prompt, and complete physics metrics) in your browser's local storage.
- **Anatomy & Physics Restoration:** Restores full physics parameter values and interactive prompt anatomy segmentation when loaded back from the local history timeline.
- **PDF Report Generation:** Compiles the scanned image, physics metadata, negative prompt parameters, and prompt blueprint into an instantly downloadable PDF document.

### 2. Practice Sandbox
- **Dual Training Modes:** Supporting *Write Your Own* (write a description from scratch) and *Fix My Prompt* (improve a draft prompt against a target image).
- **Comparative Parameter Checklist:** Matches the user's text against the extracted image metadata to check for missing, partial, or conflicting parameters.

### 3. Daily Match Challenge
- **Gamified Blueprints:** Compete daily to matching target images. Includes streak counters, detailed category evaluation cards, and local scoreboards.

### 4. Learn Academy
- **Interactive prompt engineering syllabus:** 5 progressive modules covering *Fundamentals*, *Subject & Style*, *Light & Shadow*, *Composition & Camera*, and *Model Mastery*.
- **Quiz Engines:** Real-time knowledge checkpoints built into each lesson with immediate validation and explanations.

### 5. Developer Hub & About Page
- **API Playground:** Documentation for direct integration into outer scripts or workflows.
- **Local Launcher Guide:** Quick command snippets for running the server on local configurations.

---

## 🛠️ Technology Stack

- **Backend Architecture:** FastAPI (Python), OpenCV, NumPy
- **Generative AI Fallback Chain:** Google Gemini API (cascading fallback: `gemini-2.5-flash-lite`, `gemini-2.0-flash-lite`, `gemini-2.5-flash`, `gemini-2.0-flash`)
- **Frontend Dashboard:** React, TypeScript, Tailwind CSS v4, Lucide React, jsPDF
- **Layout & Responsiveness:** Flexbox/Grid-driven sliding sidebar navigation drawer with active overlay backdrops for mobile viewport compatibility.

---

## 📦 Project Directory Layout

```text
RePrompt/
├── frontend/               # React + Vite source code
│   ├── src/
│   │   ├── components/     # ForensicApp, LearnCourse, DailyChallenge, Sidebar, etc.
│   │   ├── App.tsx         # Dashboard main shell & toast routing
│   │   └── index.css       # Tailwind v4 class configuration
│   └── vite.config.ts      # Directs production builds to ../static/
├── static/                 # Served by FastAPI (Vite build outputs here)
├── modules/                # Core Python processing engines
│   ├── physics_analyzer.py # Computer vision (OpenCV) filters
│   └── preprocessors.py    # Image normalization methods
├── main.py                 # FastAPI endpoints & fallback router
├── launch.py               # Local server configuration utility (ignored by Git)
└── requirements.txt        # Backend dependencies
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Sneaky-Panda-22/RePrompt.git
cd RePrompt
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
RePrompt provides a launcher script `launch.py` to securely store your credentials without risk of leaking them to git:

Create `launch.py` in the root folder:
```python
import os
import uvicorn

# Inject Gemini API credentials (safely ignored by Git via .gitignore)
os.environ["GEMINI_API_KEY"] = "your_gemini_api_key_here"

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False)
```

Launch the server:
```bash
python launch.py
```
Open [http://localhost:8080](http://localhost:8080) to access the workspace.

### 4. Customizing or Building the Frontend (Optional)
If you make changes to the React files inside the `frontend/` directory, rebuild the project:
```bash
cd frontend
npm install
npm run build
```
Vite compiles and replaces the static assets in the root `/static/` folder automatically.

---

## 🔌 API Endpoints Reference

RePrompt exposes REST endpoints for modular integrations:

| Method | Endpoint | Request Payload | Return Model |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/reprompt` | `multipart/form-data` (file) | `{ reprompt: string, stats: dict }` |
| **POST** | `/api/improve` | `application/json` (`{ text: string }`) | `{ result: string }` |
| **POST** | `/api/anatomy` | `application/json` (`{ prompt: string }`) | `{ segments: list }` |
| **POST** | `/api/evaluate` | `multipart/form-data` (file, prompt) | `{ score: int, matches: list, explanation: string }` |

---

## 🔒 Security & Privacy

- **Stateless Analysis:** Scanned photographs are processed entirely in memory buffers or volatile temp files, and are **immediately discarded** from the server post-response.
- **Client-side Persistence:** All workspace session history and streaking scores are saved locally inside the user's browser context (`localStorage`).
- **Safety First:** The private key loader script `launch.py` is ignored in the root [`.gitignore`](.gitignore) pattern, ensuring your private AI developer tokens are never leaked to public version control.

---

Developed with ❤️ by [Parth Tandon](https://github.com/Sneaky-Panda-22)
