from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import os, tempfile
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

OUTPUT = os.path.expanduser("~/Desktop/RePrompt_Architecture_Analysis.pdf")

# ── Draw crisp pipeline diagram with matplotlib ──
def make_pipeline_image(out_path, dpi=220):
    stages = [
        ('User\nBrowser',     'index.html\nscript.js',      '#4A90D9', '①'),
        ('FastAPI\nBackend',  'main.py',                     '#7B5EA7', '②'),
        ('Preprocessor',      'preprocessors.py',            '#2A9D8F', '③'),
        ('Physics\nEngine',   'physics_analyzer.py',         '#E76F51', '④'),
        ('Gemini\nAPI',       '4-model fallback\nloop',      '#E63946', '⑤'),
        ('User\nInterface',   'jsPDF + DOM\nrendering',      '#2D9A27', '⑥'),
    ]
    arrows = [
        'POST /api/reprompt\nmultipart/form-data',
        'image\npath',
        'Preprocess\nMetadata',
        'Physics\nMetadata\n+ base64 img',
        'JSON\n{reprompt,\nstats}',
    ]

    fig, ax = plt.subplots(figsize=(18, 5.5))
    ax.set_xlim(0, 18)
    ax.set_ylim(0, 5.5)
    ax.axis('off')
    fig.patch.set_facecolor('white')

    box_w, box_h = 2.1, 3.4
    gap = 0.52
    start_x = 0.28
    box_y = (5.5 - box_h) / 2

    for i, (title, sub, color, num) in enumerate(stages):
        x = start_x + i * (box_w + gap)

        # Shadow
        shadow = FancyBboxPatch((x+0.06, box_y-0.06), box_w, box_h,
                                boxstyle='round,pad=0.08',
                                facecolor='#cccccc', edgecolor='none', zorder=1)
        ax.add_patch(shadow)

        # Main box
        box = FancyBboxPatch((x, box_y), box_w, box_h,
                             boxstyle='round,pad=0.08',
                             facecolor=color, edgecolor='white',
                             linewidth=2, zorder=2)
        ax.add_patch(box)

        # Number circle
        ax.add_patch(plt.Circle((x + box_w/2, box_y + box_h - 0.38), 0.28,
                                color='white', alpha=0.35, zorder=3))
        ax.text(x + box_w/2, box_y + box_h - 0.38, num,
                ha='center', va='center', fontsize=14, color='white',
                fontweight='bold', zorder=4)

        # Title
        ax.text(x + box_w/2, box_y + box_h*0.48, title,
                ha='center', va='center', fontsize=12.5, color='white',
                fontweight='bold', zorder=4, linespacing=1.3)

        # Subtitle
        ax.text(x + box_w/2, box_y + 0.36, sub,
                ha='center', va='center', fontsize=8.5, color='white',
                alpha=0.88, zorder=4, linespacing=1.25)

        # Arrow to next
        if i < len(stages) - 1:
            ax_x = x + box_w + 0.04
            ax_mid = ax_x + gap/2
            ay = box_y + box_h / 2

            ax.annotate('', xy=(ax_x + gap - 0.06, ay), xytext=(ax_x, ay),
                        arrowprops=dict(arrowstyle='->', color='#444444',
                                       lw=2.0, mutation_scale=16), zorder=5)

            ax.text(ax_mid, ay + 0.26, arrows[i],
                    ha='center', va='bottom', fontsize=6.8,
                    color='#333333', linespacing=1.2)

    # Stage labels at top
    for i in range(len(stages)):
        x = start_x + i * (box_w + gap)
        ax.text(x + box_w/2, box_y + box_h + 0.22, f'Stage {i+1}',
                ha='center', va='bottom', fontsize=9, color='#555555',
                fontstyle='italic')

    plt.tight_layout(pad=0.2)
    fig.savefig(out_path, dpi=dpi, bbox_inches='tight',
                facecolor='white', edgecolor='none')
    plt.close(fig)

PIPELINE_TMP = tempfile.mktemp(suffix='.png')
make_pipeline_image(PIPELINE_TMP)

# ── Page setup ──
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=1.8*cm, bottomMargin=1.8*cm
)
PW = A4[0] - 3.6*cm  # usable width ~153mm

# ── Styles ──
def S(name, parent='Normal', **kw):
    return ParagraphStyle(name, parent=getSampleStyleSheet()[parent], **kw)

TITLE   = S('TITLE',  fontSize=28, fontName='Helvetica-Bold', alignment=TA_CENTER,
            textColor=colors.HexColor('#0f3460'), spaceAfter=4)
SUB1    = S('SUB1',   fontSize=13, alignment=TA_CENTER,
            textColor=colors.HexColor('#555'), spaceAfter=2)
SUB2    = S('SUB2',   fontSize=10, alignment=TA_CENTER,
            textColor=colors.HexColor('#999'), spaceAfter=16)
H2      = S('H2',     fontSize=15, fontName='Helvetica-Bold',
            textColor=colors.HexColor('#0f3460'), spaceBefore=16, spaceAfter=4)
H3      = S('H3',     fontSize=12, fontName='Helvetica-Bold',
            textColor=colors.HexColor('#16213e'), spaceBefore=10, spaceAfter=3)
BODY    = S('BODY',   fontSize=9.5, leading=15, textColor=colors.HexColor('#333'),
            spaceAfter=7, alignment=TA_JUSTIFY)
CAP     = S('CAP',    fontSize=8.5, textColor=colors.grey, alignment=TA_CENTER,
            spaceBefore=4, spaceAfter=14)
# Cell styles for tables
TC      = S('TC',     fontSize=8.5, leading=12, textColor=colors.HexColor('#222'))
TH      = S('TH',     fontSize=8.5, leading=12, textColor=colors.white,
            fontName='Helvetica-Bold')
TC_MONO = S('TCM',    fontSize=8, leading=11, fontName='Courier',
            textColor=colors.HexColor('#c7254e'))

HR = HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#ccc'),
                spaceBefore=2, spaceAfter=8)

# ── Table builder — ALL cells wrapped in Paragraph for proper word-wrap ──
def tbl(rows, widths):
    """rows: list of lists of strings. First row = header."""
    p_rows = []
    for i, row in enumerate(rows):
        p_row = []
        for cell in row:
            st = TH if i == 0 else TC
            p_row.append(Paragraph(str(cell), st))
        p_rows.append(p_row)

    t = Table(p_rows, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  colors.HexColor('#0f3460')),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.HexColor('#f4f6fb'), colors.white]),
        ('GRID',          (0,0), (-1,-1), 0.3, colors.HexColor('#c8d0e0')),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
        ('RIGHTPADDING',  (0,0), (-1,-1), 6),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    return t

story = []

# ══ COVER — dark banner header ══
_ts = ParagraphStyle('BT', fontSize=34, fontName='Helvetica-Bold',
                     textColor=colors.white, alignment=TA_CENTER, leading=40)
_ss = ParagraphStyle('BS', fontSize=12, fontName='Helvetica',
                     textColor=colors.HexColor('#aec6e8'), alignment=TA_CENTER,
                     leading=16, spaceBefore=4)
_s3 = ParagraphStyle('BS3', fontSize=9.5, fontName='Helvetica',
                     textColor=colors.HexColor('#7fa8cc'), alignment=TA_CENTER,
                     leading=13)
banner = Table(
    [[Paragraph('RePrompt', _ts)],
     [Paragraph('Comprehensive Architecture &amp; Codebase Analysis', _ss)],
     [Paragraph('AI-Powered Image Prompt Reverse-Engineering System', _s3)]],
    colWidths=[PW]
)
banner.setStyle(TableStyle([
    ('BACKGROUND',    (0,0), (-1,-1), colors.HexColor('#0f3460')),
    ('TOPPADDING',    (0,0), (-1,-1), 22),
    ('BOTTOMPADDING', (0,0), (-1,-1), 22),
    ('LEFTPADDING',   (0,0), (-1,-1), 16),
    ('RIGHTPADDING',  (0,0), (-1,-1), 16),
    ('ROUNDEDCORNERS',[6]),
]))
story += [banner, Spacer(1, 0.5*cm)]

# ══ 1. OVERVIEW ══
story += [
    Paragraph('1. Architecture &amp; System Overview', H2), HR,
    Paragraph(
        '<b>What does RePrompt do?</b> RePrompt is an AI-powered image forensics web application '
        'that reverse-engineers the generative prompt behind any AI-created image. '
        'It combines two complementary strategies:', BODY),
    Paragraph(
        '<b>① Computer Vision Physics Analysis (OpenCV)</b> — Extracts objective, '
        'measurable physical properties directly from pixel data: brightness levels, '
        'depth-of-field sharpness, shadow hardness, dominant light direction, contrast ratio, '
        'and edge density. These are real numerical measurements — not AI guesses.', BODY),
    Paragraph(
        '<b>② Vision-Language AI Synthesis (Google Gemini)</b> — Receives the raw image '
        'AND the verified physics measurements as structured context. Gemini synthesises a '
        'richly detailed, reusable generative prompt grounded in the factual measurements.', BODY),
    Paragraph(
        'The result is dramatically more accurate than asking an LLM alone — the OpenCV layer '
        'prevents Gemini from hallucinating physical properties that contradict the pixel data. '
        'For example, without CV grounding, Gemini might say "soft lighting" when the Sobel '
        'gradient score objectively shows hard shadows at 25.5. With grounding, Gemini is '
        'constrained to the truth.', BODY),
    Spacer(1, 0.2*cm),
]

# ══ 2. PIPELINE ══
story += [Paragraph('2. The Pipeline — Execution Path', H2), HR]
story += [
    Paragraph(
        'Every image uploaded travels through <b>six distinct stages</b> before a prompt is '
        'returned. Each stage has a well-defined input contract and output contract, making '
        'the pipeline fully modular and independently testable.', BODY),
]

# Full-width pipeline image — use landscape-proportioned box
if os.path.exists(PIPELINE_TMP):
    img_h = PW * 0.46
    story += [
        Image(PIPELINE_TMP, width=PW, height=img_h),
        Paragraph('Figure 1 — RePrompt Full Execution Pipeline (left → right)', CAP),
    ]

story += [
    Paragraph('Stage-by-Stage Breakdown', H3),
    tbl([
        ['Stage', 'Component', 'What Happens'],
        ['1 — User Browser',
         'index.html + script.js',
         'User drags, drops or clicks to upload an image. FileReader renders a local preview '
         'instantly (no server round-trip for the preview). Image is POSTed to /api/reprompt '
         'as multipart/form-data.'],
        ['2 — FastAPI Backend',
         'main.py',
         'Receives the upload, writes it to a secure OS tempfile. Sequentially calls '
         'preprocess() → analyze_physics() → generate_prompt_from_gemini(). '
         'Deletes tempfile in a finally block — always, even on error.'],
        ['3 — Preprocessor',
         'modules/preprocessors.py',
         'Validates format, letterbox-resizes to 1024×1024 (preserving aspect ratio), '
         'applies bilateral denoise, computes grayscale stats, runs HSV color histogram. '
         'Returns PreprocessMetadata with live numpy arrays attached.'],
        ['4 — Physics Engine',
         'modules/physics_analyzer.py',
         'Strips letterbox padding, then runs 5 CV algorithms: Laplacian variance '
         '(sharpness/DoF), Sobel gradients (shadow hardness), brightness centroid '
         '(light direction), Canny edge ratio (composition density), P95/P5 contrast ratio.'],
        ['5 — Gemini API',
         '_gemini_post() in main.py',
         'Sends base64 image + physics metadata to Gemini. 4-model fallback loop: '
         'gemini-2.5-flash-lite → gemini-2.0-flash-lite → gemini-2.5-flash → '
         'gemini-2.0-flash. On 429 rate-limit, waits 5s and retries before moving on.'],
        ['6 — User Interface',
         'script.js + jsPDF',
         'Renders the generated prompt and physics stat cards dynamically. '
         'Copy-to-clipboard via navigator.clipboard. PDF export via jsPDF — '
         'image drawn to offscreen canvas (JPEG conversion) then laid out with '
         'prompt text into a downloadable A4 PDF.'],
    ], [PW*0.17, PW*0.20, PW*0.63]),
    Spacer(1, 0.4*cm),
]

# ══ 3. FILE-BY-FILE ══
story += [PageBreak(), Paragraph('3. File-by-File Breakdown', H2), HR]

# main.py
story += [
    Paragraph('main.py — Application Core &amp; Orchestrator', H3),
    Paragraph(
        'Central entry point. Wires together FastAPI, both CV modules, and the Gemini API '
        'into one coherent web service. Serves both the REST API and the static frontend '
        'from a single Uvicorn process. The API key is loaded from the environment variable '
        'GEMINI_API_KEY — never hard-coded — making it safe to open-source and easy to '
        'rotate on Render without touching code.', BODY),
    tbl([
        ['Function / Route', 'Role', 'Key Implementation Detail'],
        ['_gemini_post(payload)',
         'Resilient Gemini caller',
         'Iterates GEMINI_MODELS list in order. On 429, waits 5s and retries once before '
         'falling to next model. Returns last response if all 4 models exhausted.'],
        ['generate_prompt_from_gemini()',
         'Gemini vision synthesis',
         'Reads tempfile → base64 encodes → builds structured prompt injecting all physics '
         'stats as verified context → calls _gemini_post() via asyncio.run_in_executor '
         '(keeps async event loop free during the blocking HTTP call).'],
        ['POST /api/reprompt',
         'Main pipeline endpoint',
         'Accepts image upload → tempfile → preprocess() → analyze_physics() → Gemini → '
         'returns JSON {reprompt, stats}. Tempfile deleted in finally block.'],
        ['POST /api/improve',
         'Text prompt enhancer',
         'Takes a basic prompt string, sends to Gemini with enhancement instructions, '
         'returns improved version. Uses same 4-model fallback mechanism.'],
        ['app.mount("/")',
         'Static file serving',
         'Mounts static/ directory as the frontend. One process handles both API and UI — '
         'no separate Nginx or web server needed on Render.'],
    ], [PW*0.22, PW*0.20, PW*0.58]),
    Spacer(1, 0.4*cm),
]

# preprocessors.py
story += [
    Paragraph('modules/preprocessors.py — Image Preprocessor', H3),
    Paragraph(
        'Standardises every incoming image into a consistent, clean 1024×1024 numpy array '
        'with full metadata. Downstream modules depend on this contract — they assume a '
        'fixed-size, denoised image with known padding offsets. If preprocessing fails, '
        'an exception propagates up and the tempfile is still safely deleted.', BODY),
    tbl([
        ['Function', 'Algorithm', 'Why This Specific Approach'],
        ['validate_image()',
         'Extension allowlist + cv2.imread decode test',
         'Fails loudly before wasting compute. Rejects unsupported formats early.'],
        ['letterbox_resize()',
         'Scale longest axis to 1024, black-pad short axis',
         'Preserves true geometry. A plain stretch would distort the image, corrupting '
         'the light-direction centroid calculation which depends on spatial pixel positions.'],
        ['reduce_noise()',
         'cv2.bilateralFilter (d=9, σcolor=75, σspace=75)',
         'Edge-preserving denoise. Unlike Gaussian blur, bilateral keeps edges sharp — '
         'critical because Sobel (shadow) and Laplacian (sharpness) both measure edge '
         'properties and would give false readings on blurred edges.'],
        ['analyze_color_histogram()',
         'HSV histogram, 36 bins (10° each), top-3 peaks',
         'Gives Gemini verified dominant hue data rather than relying on its own visual '
         'colour perception, which can be inconsistent across models.'],
        ['preprocess() (public API)',
         'Orchestrates all above steps, returns PreprocessMetadata',
         'Attaches live numpy arrays (_image_bgr, _image_gray) to the dataclass so '
         'the physics engine receives them without re-reading the file from disk.'],
    ], [PW*0.22, PW*0.26, PW*0.52]),
    Spacer(1, 0.4*cm),
]

# physics_analyzer.py
story += [
    Paragraph('modules/physics_analyzer.py — Physics Engine', H3),
    Paragraph(
        'The intellectual core of RePrompt. Extracts five independently computed physical '
        'measurements using classical computer vision algorithms. Strips letterbox padding '
        'via get_content_region() before any measurement so black borders do not '
        'pollute the statistics.', BODY),
    tbl([
        ['Measurement', 'CV Algorithm Used', 'Output & Thresholds'],
        ['Brightness Class',
         'Mean pixel value of grayscale channel',
         '"high-key" (mean > 170) / "mid-key" / "low-key" (mean < 85)'],
        ['Depth of Field',
         'Laplacian variance — cv2.Laplacian(gray, CV_64F).var()',
         '"deep" (>300) / "moderate" / "shallow" (<80). High variance = many sharp edges = deep focus.'],
        ['Shadow Hardness',
         'Sobel gradient mean magnitude — sqrt(Sx² + Sy²)',
         '"hard" (>12.0) / "soft" / "diffuse" (<5.0). Sharp shadow edges = point light source.'],
        ['Light Direction',
         'Moment centroid of brightest 10% of pixels (cv2.moments)',
         'Compass label: top-left, top-right, left, right, flat, etc. Normalised to [-1,1] from image centre.'],
        ['Edge Density',
         'Canny edge detector pixel count / total pixels',
         '0.0–1.0 ratio. High = busy/detailed composition. Low = minimalist/clean.'],
        ['Contrast Ratio',
         'P95 luminance / (P5 luminance + 1e-5)',
         'Robust ratio avoiding pure-black/white clipping noise. E.g. 25.5 = high drama.'],
    ], [PW*0.20, PW*0.35, PW*0.45]),
    Spacer(1, 0.4*cm),
]

# script.js
story += [
    Paragraph('static/script.js — Frontend Brain', H3),
    Paragraph(
        'All interactivity, API communication, UI state management, scroll animations, '
        'and PDF export logic. Zero framework dependencies — plain ES6 JavaScript. '
        'Uses IntersectionObserver for Apple-style scroll reveals and jsPDF for '
        'client-side PDF generation.', BODY),
    tbl([
        ['Feature', 'Implementation', 'Notable Detail'],
        ['Navigation',
         'Toggle page-section--active CSS class on div panels',
         'No page reloads. Three static sections swap visibility. Upload state preserved across tab switches.'],
        ['Scroll animations',
         'IntersectionObserver (threshold=0.05, rootMargin -20px)',
         'Elements start opacity:0 + translateY(20px). Observer adds .visible triggering CSS transition when element enters viewport.'],
        ['Upload handling',
         'FileReader API + drag-and-drop events',
         'FileReader renders preview locally as data URL before server responds — instant visual feedback regardless of network speed.'],
        ['PDF export',
         'jsPDF + offscreen HTMLCanvasElement',
         'Canvas converts any format (webp, transparent PNG) to JPEG before jsPDF. Scales image to top-half of A4, wraps prompt text with splitTextToSize().'],
        ['Copy button',
         'navigator.clipboard.writeText()',
         'Modern async clipboard API. Visual feedback: green flash + "Copied!" text for 1.8 seconds.'],
        ['Physics stat cards',
         'Dynamic DOM creation in processImage()',
         'Cards created with createElement(), assigned reveal classes, then re-observed by IntersectionObserver for animated entrance.'],
    ], [PW*0.18, PW*0.28, PW*0.54]),
    Spacer(1, 0.3*cm),
]

# ══ 4. DESIGN DECISIONS ══
story += [PageBreak(), Paragraph('4. Design Decisions — The What &amp; The Why', H2), HR]
story += [
    tbl([
        ['Decision', 'Rationale'],
        ['FastAPI over Flask/Django',
         'FastAPI is async-native. The pipeline is I/O-bound (waiting for Gemini HTTP '
         'response). asyncio + run_in_executor offloads the blocking requests.post to a '
         'thread pool, keeping the event loop free to serve concurrent requests.'],
        ['Hybrid CV + LLM (not pure LLM)',
         'Pure LLM prompting hallucinates measurements — Gemini might say "soft lighting" '
         'when Sobel score shows hard=25.5. OpenCV measures real pixel physics first, then '
         'Gemini is constrained by those verified numbers. Grounded generation.'],
        ['Bilateral filter, not Gaussian',
         'Unlike Gaussian blur, bilateral preserves edge sharpness while smoothing flat '
         'areas. Sobel (shadow hardness) and Laplacian (sharpness/DoF) both measure edge '
         'properties — blurring edges would corrupt these measurements.'],
        ['Letterbox resize, not stretch',
         'A plain stretch distorts image geometry. The light direction algorithm uses the '
         'centroid of the brightest 10% of pixels — stretching would shift that centroid, '
         'giving a wrong compass label.'],
        ['4-model Gemini fallback loop',
         'Each Gemini model has its own separate free-tier quota. Trying 4 models gives '
         'effectively 4× the free headroom before a real error is returned to the user.'],
        ['Stateless — no database, no image storage',
         'Analysis tool, not a history service. Tempfiles created and deleted within one '
         'request. Zero storage cost, zero privacy concerns, works on Render\'s free '
         'ephemeral disk without any persistent volume.'],
        ['Client-side PDF (jsPDF)',
         'Browser already has the image (data URL) and the prompt text. Generating the PDF '
         'client-side adds zero server load, zero extra API calls, and works offline after '
         'analysis completes.'],
        ['Vanilla HTML/CSS/JS',
         'For a 3-tab single-page tool, React/Vue adds 200KB+ bundle weight for zero '
         'functional gain. Plain JS with IntersectionObserver gives smooth animations at '
         'near-zero overhead.'],
    ], [PW*0.28, PW*0.72]),
    Spacer(1, 0.4*cm),
]

# ══ 5. ALTERNATIVES ══
story += [PageBreak(), Paragraph('5. Alternatives &amp; Improvements', H2), HR]

story += [
    Paragraph('Alternative 1 — Full Cloud-Native Serverless (AWS Lambda + S3)', H3),
    Paragraph(
        'Replace the Render+FastAPI server with AWS Lambda functions behind API Gateway. '
        'Store images in S3, results in DynamoDB or Aurora Serverless.', BODY),
    tbl([
        ['Aspect', 'Current Setup', 'AWS Lambda'],
        ['Scaling', 'Single Render instance', 'Auto-scales to thousands of concurrent requests automatically'],
        ['Cost', 'Free (within Render limits)', 'Pay-per-use — can be free at low volume but billing is complex'],
        ['Cold start latency', 'None — persistent server', '1–2s Lambda cold starts add perceived latency on first request'],
        ['OpenCV dependency', 'Installed directly on server', 'Needs Lambda Layer packaging — significant extra complexity'],
        ['Verdict', '✓ Right choice for this scale', '✗ Major overkill — adds cost and complexity for no benefit here'],
    ], [PW*0.18, PW*0.35, PW*0.47]),
    Spacer(1, 0.35*cm),

    Paragraph('Alternative 2 — Pure LLM (Remove OpenCV Entirely)', H3),
    Paragraph(
        'Remove both modules/ entirely. Send the image to Gemini and ask it to '
        'estimate everything including the physics properties.', BODY),
    tbl([
        ['Aspect', 'Current Hybrid', 'Pure LLM'],
        ['Accuracy', 'High — measurements are factual pixel math', 'Moderate — LLM estimates can and do hallucinate numbers'],
        ['Reproducibility', 'High — same image always gives same numbers', 'Low — temperature and sampling introduce variation'],
        ['Speed', 'Slightly slower (CV runs before LLM)', 'Slightly faster (one step only)'],
        ['Differentiation', 'Unique — factual physics grounding', 'Indistinguishable from any other Gemini image wrapper'],
        ['Verdict', '✓ The correct approach — keep it', '✗ Loses the entire core value proposition of RePrompt'],
    ], [PW*0.18, PW*0.41, PW*0.41]),
    Spacer(1, 0.35*cm),

    Paragraph('Alternative 3 — Add Persistent History with SQLite', H3),
    Paragraph(
        'Add a history.db SQLite file to store each analysis: image hash, prompt result, '
        'physics stats, timestamp. Add a History tab to the frontend.', BODY),
    tbl([
        ['Aspect', 'Current', 'With SQLite'],
        ['User experience', 'Stateless — no memory between sessions', 'Users can revisit and compare past analyses'],
        ['Implementation complexity', 'Zero', 'Low — SQLite is file-based, no separate server needed'],
        ['Privacy', 'Images never stored on server', 'Image hashes or thumbnails stored on disk'],
        ['Render free tier', 'Full compatibility', 'Render free tier has ephemeral disk — needs Disk add-on ($7/mo) or Cloudflare R2'],
        ['Verdict', 'Fine for v1', '✓ Best near-term UX improvement for returning users'],
    ], [PW*0.18, PW*0.35, PW*0.47]),
    Spacer(1, 0.4*cm),

    Paragraph('Prioritised Future Improvement Roadmap', H3),
    tbl([
        ['Priority', 'Improvement', 'Expected Impact'],
        ['🔴 High',
         'Streaming Gemini response via Server-Sent Events',
         'Prompt appears word-by-word in real time. Eliminates the 5-8s blank wait — the single biggest UX pain point.'],
        ['🔴 High',
         'SQLite analysis history with History tab',
         'Users can save, revisit and compare past analyses. Major retention improvement for power users.'],
        ['🟡 Medium',
         'Response caching by image MD5/SHA256 hash',
         'Same image uploaded twice returns instantly from cache — zero extra Gemini API calls or quota usage.'],
        ['🟡 Medium',
         'Batch upload (3-5 images simultaneously)',
         'Parallel processing with asyncio.gather(). Side-by-side prompt comparison — huge value for prompt engineers.'],
        ['🟢 Low',
         'Export to Notion page or Markdown file',
         'One-click export of the full analysis to a Notion database or .md file for prompt engineering workflows.'],
        ['🟢 Low',
         'Move API key to Render Secret Files',
         'More secure than environment variables for production deployments. Prevents accidental exposure in logs.'],
    ], [PW*0.10, PW*0.36, PW*0.54]),
]

doc.build(story)
print(f"PDF saved to: {OUTPUT}")
