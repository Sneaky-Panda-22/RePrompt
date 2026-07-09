# RePrompt • AI Vision Forensics & Prompt Engineering Dashboard

Welcome to RePrompt, the professional tool for reverse-engineering AI-generated images and extracting their prompt formulas. This platform combines advanced computer vision techniques with cutting-edge AI analysis to help you understand exactly how any Midjourney, DALL-E, or Stable Diffusion image was created.

The system features a premium, responsive **Astro-based dashboard** supporting dynamic Light and Dark modes.

---

## Key Workspaces & Features

### 1. Forensic App Workspace
This is where the magic happens. Upload any AI-generated image and get forensic analysis of its underlying physics and prompt structure:

- **Image Auditing:** Measures objective properties like sharpness, shadows, contrast, lighting direction, and aspect ratio through advanced computer vision algorithms
- **Prompt Anatomy:** Breaks down prompt text into interactive color-coded segments (subject, lighting, camera, style, mood) with helpful hover tooltips
- **Suggested Negative Prompts:** Automatically generates high-fidelity negative prompts to help you avoid common pitfalls
- **Local History Registry:** Saves all your forensic reports locally so you can reference them later (in your browser only)
- **Anatomy & Physics Restoration:** Reconstructs complete physics parameter values and interactive prompt anatomy when you return to previous analyses
- **PDF Report Generation:** Compiles the scanned image, physics metadata, negative prompt parameters, and prompt blueprint into an instantly downloadable PDF

### 2. Practice Sandbox
Improve your prompt-writing skills with hands-on practice:

- **Dual Training Modes:** Practice writing prompts from scratch or improving existing ones against target images
- **Comparative Parameter Checklist:** Checks your prompts against extracted image metadata to reveal missing or conflicting elements

### 3. Daily Match Challenge
Test your forensic skills daily:

- **Gamified Blueprints:** Compete to match target images. Track your streak, see detailed evaluation cards, and view local leaderboards
- **Skill Building:** Each match teaches you how different prompt parameters affect visual outcomes

### 4. Learn Academy
Build expertise with structured learning:

- **Interactive prompt engineering syllabus:** 5 progressive modules covering fundamentals, subjects and styles, light and shadow, composition and camera, and model mastery
- **Quiz Engines:** Real-time quizzes after each lesson with instant feedback and explanations

### 5. Developer Hub & About Page
Resources and information for advanced users:

- **API Playground:** Documentation for direct integration into scripts or workflows
- **Local Launcher Guide:** Quick commands for running the server locally

---

## Technology Stack

This enterprise-grade system uses industry-leading technologies:

- **Backend Architecture:** Built with FastAPI (Python) for high-performance processing, plus OpenCV and NumPy for computer vision
- **Generative AI:** Google Gemini API with cascading fallback for reliable AI analysis
- **Frontend Dashboard:** Modern **Astro** framework with TypeScript, Tailwind CSS v4, Shadcn UI, and jsPDF
- **Performance:** Static Site Generation with incremental regeneration, client-side data fetching, image optimization, and intelligent caching

---

## Project Structure

The project is organized into clear sections for easy navigation:

```
RePrompt/
├── backend/                           # Python processing engine (FastAPI)
│   ├── modules/                      # Computer vision & preprocessing tools
│   ├── main.py                       # API endpoints & fallback routing
│   └── requirements.txt              # Backend dependencies
├── astro/                           # Astro-based frontend dashboard
│   ├── src/                        # Source code
│   │   ├── components/             # Reusable Astro components
│   │   ├── pages/                  # Astro pages (SSG + ISR)
│   │   ├── lib/                     # Utilities & client-side logic
│   │   └── ui/                      # Shadcn UI components
│   ├── public/                     # Static assets
│   ├── astro.config.mjs            # Astro configuration
│   └── package.json                # Frontend dependencies
├── static/                           # Pre-built frontend assets (for FastAPI serving)
├── launch.py                         # Local server configuration utility (Git ignored)
└── README.md                         # Project documentation
```

---

## Getting Started

### 1. Clone the Repository

Get started in just a few minutes:

```bash
git clone https://github.com/Sneaky-Panda-22/RePrompt.git
cd RePrompt
```

### 2. Install Backend Dependencies

Set up the Python processing engine:

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies & Build

Install and build the Astro dashboard:

```bash
cd astro
npm install
npm run build
```

### 4. Run the Development Server

For local development with secure credential handling:

Create a `launch.py` file in the root folder:

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

### 5. Version Control Workflow

Keep your changes organized and secure:

```bash
# Check what you've changed
git status

# Track all updates (including built static assets)
git add .

# Commit with a descriptive message
git commit -m "Upgrade RePrompt to Astro-based enterprise dashboard: static generation for SEO, premium workspace architecture, and performance optimization"

# Push changes to GitHub
git push origin main
```

---

## API Endpoints

RePrompt provides clean, well-documented REST endpoints for modular integrations:

| HTTP Method | Endpoint | Request Body | Returns |
|-------------|----------|--------------|---------|
| **POST** | `/api/reprompt` | `multipart/form-data` (file upload) | `{ reprompt: string, stats: dict }` |
| **POST** | `/api/improve` | `application/json` (`{ text: string }`) | `{ result: string }` |
| **POST** | `/api/anatomy` | `application/json` (`{ prompt: string }`) | `{ segments: list }` |
| **POST** | `/api/evaluate` | `multipart/form-data` (file + prompt) | `{ score: int, matches: list, explanation: string }` |

---

## Security & Privacy

Your data is safe with us:

- **Privacy First:** Scanned photographs are processed in memory and immediately discarded after response. Nothing is stored permanently.
- **Client-side Storage:** All your session history and achievements are saved locally in your browser only.
- **Security First:** The credential loader script remains Git-ignored to ensure your API keys are never exposed in version control.

---

## About

RePrompt is developed with care by Parth Tandon. This platform transforms the way professionals analyze and learn from AI-generated imagery through forensic-level prompt engineering.