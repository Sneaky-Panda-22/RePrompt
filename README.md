# RePrompt • AI Vision Forensics & Prompt Engineering Dashboard

RePrompt is an industry-ready, professional image forensics and prompt reverse-engineering workspace. By pairing **Computer Vision (OpenCV)** with **Vision-Language Models (Google Gemini)**, it parses the hidden physical properties of an image and generates highly descriptive, optimization-ready prompt blueprints for Midjourney, DALL-E 3, or Stable Diffusion.

The system features a premium, responsive **Astro-based dashboard** supporting dynamic Light and Dark modes.

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
- **Frontend Dashboard:** **Astro**, TypeScript, Tailwind CSS v4, Shadcn UI, jsPDF
- **Layout & Responsiveness:** Flexbox/Grid-driven sliding sidebar navigation drawer with active overlay backdrops for mobile viewport compatibility.
- **Performance:** Static Site Generation (SSG) with incremental static regeneration, client-side data fetching, image optimization, and caching.

---

## 📦 Project Directory Layout

```text
RePrompt/
├── backend/                   # Python processing engines (FastAPI)
│   ├── modules/              # Computer vision & preprocessing
│   ├── main.py              # API endpoints & fallback router
│   └── requirements.txt     # Backend dependencies
├── astro/                    # Astro-based frontend
│   ├── src/                 # Source code
│   │   ├── components/      # Reusable Astro components
│   │   ├── pages/           # Astro pages (SSG + ISR)
│   │   ├── lib/             # Utilities & client-side logic
│   │   └── ui/              # Shadcn UI components (compiled)
│   ├── public/              # Static assets
│   ├── astro.config.mjs     # Astro configuration
│   └── package.json         # Project dependencies
├── static/                   # Frontend build outputs (for FastAPI serving)
├── launch.py                 # Local server configuration utility (Git ignored)
└── README.md                 # Documentation
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Sneaky-Panda-22/RePrompt.git
cd RePrompt
```

### 2. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies & Build
```bash
cd astro
npm install
npm run build
```

### 4. Run the Development Server
RePrompt provides a launcher script `launch.py` to securely store your credentials without risk of leaking them to git:

Create `launch.py` in the root folder:
```python
import os
import uvicorn

# Inject Gemini API credentials (safely ignored by Git via .gitignore)
os.environ["GEMINI_API_KEY"] = "your_gemini_api_key_here"

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8080, reload=True)
```

Launch the server:
```bash
python launch.py
```

Open [http://localhost:8080](http://localhost:8080) to access the workspace.

### 5. Pushing Updates to GitHub
To commit and push your changes back to the GitHub repository, run:
```bash
# Verify modified and untracked files
git status

# Stage all updates (including built static assets)
git add .

# Commit with a descriptive message
git commit -m "Upgrade RePrompt to Astro-based enterprise dashboard: static generation for SEO, premium workspace architecture, and performance optimization"

# Push changes to your branch/main repository
git push origin main
```

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
