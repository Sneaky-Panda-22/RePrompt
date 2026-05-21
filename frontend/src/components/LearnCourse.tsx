import { useState, useEffect } from "react";
import { BookOpen, Award, ArrowLeft, CheckCircle2, Circle, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

interface LearnCourseProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

interface QuizData {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  quiz?: QuizData;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export default function LearnCourse({ showToast }: LearnCourseProps) {
  const COURSE_DATA: Record<string, Module> = {
    m1: {
      id: "m1",
      title: "The Fundamentals",
      lessons: [
        {
          id: "m1l1",
          title: "What is Prompt Engineering?",
          content: `<p className="mb-4">Prompt engineering is the art of writing text instructions that guide AI image generators — like <strong>Midjourney</strong>, <strong>Stable Diffusion</strong>, and <strong>DALL·E</strong> — to produce exactly the image you envision.</p>
          <p className="mb-4">Think of it as giving a brief to a world-class artist. The more specific and structured your brief, the closer the result matches your vision.</p>
          <p>A prompt is <strong>not</strong> just a description. It's a <em>blueprint</em> with six core components: Subject, Lighting, Composition, Style, Mood, and Technical Details. You'll master each one in this course.</p>`,
          quiz: {
            q: "What is a prompt best compared to?",
            options: ["A search query", "A blueprint for an artist", "A filename", "A hashtag"],
            answer: 1,
            explanation: "A prompt is like a detailed brief to an artist — the more specific, the better the output.",
          },
        },
        {
          id: "m1l2",
          title: "Why Most Prompts Fail",
          content: `<p className="mb-4 font-normal">The #1 reason prompts fail: <strong>vagueness</strong>. "A beautiful sunset" gives the AI almost nothing to work with — it has to guess everything else.</p>
          <p className="mb-4 font-normal">The #2 reason: <strong>missing lighting info</strong>. Lighting is the single most impactful element in any image, yet most beginners never mention it.</p>
          <p>The #3 reason: <strong>contradictions</strong>. Saying "bright sunny day with dark moody shadows" confuses the AI into a mediocre compromise.</p>`,
          quiz: {
            q: "What is the most commonly missing element in beginner prompts?",
            options: ["Subject description", "Color palette", "Lighting information", "Image resolution"],
            answer: 2,
            explanation: "Lighting is the #1 most impactful element, yet beginners almost never specify it.",
          },
        },
        {
          id: "m1l3",
          title: "The RePrompt Method",
          content: `<p className="mb-4">RePrompt uses a unique approach: instead of guessing what makes a good prompt, it <strong>measures the physics</strong> of real images using computer vision.</p>
          <p className="mb-4">When you upload an image, RePrompt extracts objective data — brightness levels, shadow hardness, depth of field, light direction — and uses these measurements to generate a prompt grounded in reality.</p>
          <p>This means you can study any image and learn exactly what prompt elements would recreate it. <strong>Upload an image → see the physics → learn the vocabulary.</strong></p>`,
          quiz: {
            q: "What makes RePrompt different from other prompt tools?",
            options: ["It uses a bigger AI model", "It measures image physics with computer vision", "It has more templates", "It works offline"],
            answer: 1,
            explanation: "RePrompt uses OpenCV to measure actual physics (brightness, shadows, DoF) before generating prompts.",
          },
        },
      ],
    },
    m2: {
      id: "m2",
      title: "Subject & Style",
      lessons: [
        {
          id: "m2l1",
          title: "Describing Subjects with Precision",
          content: `<p className="mb-4">The subject is the main focus of your image. The key rule: <strong>specificity beats brevity</strong>.</p>
          <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-red-500 font-bold block mb-1">❌ Weak</span>a woman in a city</div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Strong</span>a young woman with short silver hair, wearing a leather jacket, standing at a rain-soaked Tokyo intersection at night</div>
          <p>Notice how the strong version specifies: <strong>age</strong>, <strong>hair</strong>, <strong>clothing</strong>, <strong>location details</strong>, and <strong>time of day</strong>. Each detail reduces ambiguity.</p>`,
          quiz: {
            q: "Which prompt would produce a more specific result?",
            options: ['"a cat on a table"', '"a fluffy orange tabby kitten sitting on a weathered oak kitchen table"', '"a cute cat, high quality"', '"cat, 4K, masterpiece"'],
            answer: 1,
            explanation: "Specific physical details (breed, color, furniture material) give the AI concrete visual targets.",
          },
        },
        {
          id: "m2l2",
          title: "Choosing Art Styles & Mediums",
          content: `<p className="mb-4">The style defines the visual language of your image. Reference specific <strong>art movements</strong>, <strong>mediums</strong>, or <strong>artists</strong>.</p>
          <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-red-500 font-bold block mb-1">❌ Weak</span>painting style</div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Strong</span>oil painting with visible impasto brushstrokes, in the style of John Singer Sargent, rich warm color palette</div>
          <p>You can also combine styles for unique results: <em>"watercolor meets cyberpunk, with the color palette of Studio Ghibli"</em></p>`,
          quiz: {
            q: "How should you reference art styles in prompts?",
            options: ['Just say "artistic"', "Name specific artists, mediums, and techniques", "Use only one style keyword", 'Always say "masterpiece"'],
            answer: 1,
            explanation: "Naming specific artists, mediums (oil, watercolor), and techniques (impasto) gives the AI concrete visual references.",
          },
        },
        {
          id: "m2l3",
          title: "Mood & Atmosphere",
          content: `<p className="mb-4">Mood goes beyond description — it conveys <strong>emotion</strong>. Use evocative, layered language.</p>
          <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-red-500 font-bold block mb-1">❌ Weak</span>sad feeling</div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Strong</span>melancholic and contemplative atmosphere, quiet solitude, nostalgic warmth with an undercurrent of longing</div>
          <p>Tip: combine <strong>an emotion + a physical sensation + a story implication</strong> for the most evocative moods.</p>`,
          quiz: {
            q: "What makes a strong mood description?",
            options: ['A single emotion word like "sad"', "Multiple emotions + physical sensation + story", "Using all caps for emphasis", 'Adding "4K" at the end'],
            answer: 1,
            explanation: "Layering emotion, physical sensation, and narrative implication creates the richest atmosphere.",
          },
        },
      ],
    },
    m3: {
      id: "m3",
      title: "Light & Shadow",
      lessons: [
        {
          id: "m3l1",
          title: "Light Direction & Quality",
          content: `<p className="mb-4">Lighting is the <strong>single most important</strong> factor in photography and AI-generated images. Two key properties:</p>
          <p className="mb-4"><strong>Direction:</strong> Where is the light coming from? Top-left, behind the subject (backlighting), directly above, from below (horror lighting)?</p>
          <p className="mb-4"><strong>Quality:</strong> Is the light <em>hard</em> (sharp shadows, like direct sun) or <em>soft</em> (diffuse shadows, like overcast sky)?</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Example</span>golden hour backlighting with soft rim light from upper-left, warm color temperature, volumetric god rays filtering through trees</div>`,
          quiz: {
            q: "What two properties define a light source?",
            options: ["Color and size", "Direction and quality", "Brightness and contrast", "Speed and wavelength"],
            answer: 1,
            explanation: "Direction (where the light comes from) and quality (hard vs soft) are the two fundamental lighting properties.",
          },
        },
        {
          id: "m3l2",
          title: "Shadow Types in Prompts",
          content: `<p className="mb-4"><strong>Hard shadows</strong> = strong, direct light source (sun, spotlight). Creates dramatic, high-contrast images.</p>
          <p className="mb-4"><strong>Soft/diffuse shadows</strong> = scattered light (overcast, softbox). Creates gentle, flattering images.</p>
          <p className="mb-4">In RePrompt, the physics analyzer measures <strong>shadow hardness</strong> using Sobel edge detection on shadow boundaries. This tells you exactly what type of lighting created the image.</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-emerald-500 font-bold block mb-1">✅ Hard Shadows</span>harsh directional spotlight from upper-left, deep crisp shadows, high contrast ratio, film noir lighting</div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Soft Shadows</span>diffuse overcast lighting, gentle gradient shadows, low contrast, soft and airy atmosphere</div>`,
          quiz: {
            q: "Hard shadows indicate what kind of light source?",
            options: ["Distant and diffuse", "Close and weak", "Strong and direct", "Colorful and warm"],
            answer: 2,
            explanation: "Hard shadows are created by strong, direct light sources like direct sunlight or spotlights.",
          },
        },
        {
          id: "m3l3",
          title: "Color Temperature & Time of Day",
          content: `<p className="mb-4">Color temperature dramatically affects mood:</p>
          <p className="mb-4"><strong>Warm (golden/amber):</strong> sunrise, sunset, candlelight, nostalgia<br><strong>Neutral (white):</strong> midday, studio, clinical<br><strong>Cool (blue):</strong> twilight, moonlight, melancholy, futuristic</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-emerald-500 font-bold block mb-1">✅ Golden Hour</span>warm golden hour light at 2800K, long shadows stretching across the scene, amber highlights on skin</div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Blue Hour</span>cool twilight atmosphere at 7500K, deep blue sky with magenta horizon line, city lights beginning to glow</div>`,
          quiz: {
            q: "What color temperature creates a nostalgic, warm feeling?",
            options: ["10000K (very blue)", "5500K (neutral white)", "2800K (warm amber)", "1000K (deep red)"],
            answer: 2,
            explanation: "2800K produces warm amber tones associated with golden hour, candlelight, and nostalgia.",
          },
        },
      ],
    },
    m4: {
      id: "m4",
      title: "Composition & Camera",
      lessons: [
        {
          id: "m4l1",
          title: "Camera Angles & Framing",
          content: `<p className="mb-4">Camera angle completely changes the viewer's relationship to the subject:</p>
          <p className="mb-4"><strong>Low angle (looking up):</strong> Power, dominance, heroism<br><strong>Eye level:</strong> Neutral, relatable, documentary<br><strong>High angle (looking down):</strong> Vulnerability, smallness, overview<br><strong>Dutch angle (tilted):</strong> Tension, unease, dynamic energy</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Example</span>extreme low angle shot looking up at a towering skyscraper, dramatic perspective lines converging overhead, wide-angle lens distortion</div>`,
          quiz: {
            q: "A low camera angle makes the subject feel:",
            options: ["Vulnerable and small", "Powerful and dominant", "Neutral and ordinary", "Anxious and tense"],
            answer: 1,
            explanation: "Low angles look up at the subject, making them appear powerful, dominant, and heroic.",
          },
        },
        {
          id: "m4l2",
          title: "Depth of Field",
          content: `<p className="mb-4"><strong>Shallow depth of field</strong> (blurry background) isolates the subject and creates intimacy. Common in portraits.</p>
          <p className="mb-4"><strong>Deep depth of field</strong> (everything sharp) shows context and environment. Common in landscapes.</p>
          <p className="mb-4">In prompts, simulate this with lens specifications:</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-emerald-500 font-bold block mb-1">✅ Shallow DoF</span>85mm f/1.4 lens, creamy bokeh background, subject tack-sharp with buttery out-of-focus highlights</div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Deep DoF</span>24mm f/11 lens, everything in sharp focus from foreground flowers to distant mountains, landscape photography</div>`,
          quiz: {
            q: "An f/1.4 aperture creates:",
            options: ["Everything in sharp focus", "Shallow depth of field with blurry background", "Black and white images", "Fish-eye distortion"],
            answer: 1,
            explanation: "Low f-numbers (f/1.4) create shallow depth of field with beautiful background blur (bokeh).",
          },
        },
        {
          id: "m4l3",
          title: "Compositional Rules",
          content: `<p className="mb-4">Guide the viewer's eye with proven composition techniques:</p>
          <p className="mb-4"><strong>Rule of Thirds:</strong> Place subjects at intersection points of a 3×3 grid<br><strong>Leading Lines:</strong> Roads, rivers, fences that guide the eye<br><strong>Negative Space:</strong> Empty areas that give the subject room to breathe<br><strong>Symmetry:</strong> Centered compositions for power and formality</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Example</span>subject placed at right-third intersection, leading lines from a cobblestone path drawing the eye, generous negative space on the left, atmospheric depth</div>`,
          quiz: {
            q: 'What does "negative space" mean in composition?',
            options: ["Dark areas of the image", "Empty areas that give the subject room", "Upside-down composition", "Removing parts of the image"],
            answer: 1,
            explanation: "Negative space is empty/unoccupied area that lets the subject breathe and draws attention to it.",
          },
        },
      ],
    },
    m5: {
      id: "m5",
      title: "Model Mastery",
      lessons: [
        {
          id: "m5l1",
          title: "Midjourney Secrets",
          content: `<p className="mb-4">Midjourney responds best to <strong>flowing, natural prose</strong> rather than comma-separated tags.</p>
          <p className="mb-4">Key parameters:<br><code>--ar 16:9</code> → cinematic aspect ratio<br><code>--v 6</code> → model version (latest)<br><code>--s 250</code> → stylization (higher = more artistic)<br><code>--c 15</code> → chaos (higher = more varied)<br><code>::</code> → multi-prompt weighting</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ Midjourney-optimized</span>A lone astronaut standing on the edge of a crimson desert under twin suns, their visor reflecting an alien skyline, painted in the style of Moebius with warm cinematic lighting --ar 16:9 --v 6 --s 200</div>`,
          quiz: {
            q: "What does --s 250 do in Midjourney?",
            options: ["Sets image size to 250px", "Increases artistic stylization", "Sets the seed number", "Adds 250 variations"],
            answer: 1,
            explanation: "--s controls stylization. Higher values (0-1000) make the image more artistic and less literal.",
          },
        },
        {
          id: "m5l2",
          title: "Stable Diffusion Mastery",
          content: `<p className="mb-4 font-normal">Stable Diffusion works best with <strong>comma-separated tags</strong> and <strong>weighted emphasis</strong>.</p>
          <p className="mb-4 font-normal">Key techniques:<br><code>(word:1.4)</code> → increase emphasis<br><code>[word]</code> → decrease emphasis<br>Negative prompts are <strong>critical</strong> — always specify what to avoid</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-3"><span className="text-emerald-500 font-bold block mb-1">✅ SD-optimized</span>masterpiece, best quality, (1girl:1.3), silver hair, leather jacket, (rain-soaked tokyo intersection:1.2), night, neon reflections, cinematic lighting, shallow depth of field</div>
          <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-red-500 font-bold block mb-1">Negative prompt</span>worst quality, low quality, blurry, deformed, extra fingers, bad anatomy, watermark, text</div>`,
          quiz: {
            q: "In Stable Diffusion, (word:1.4) means:",
            options: ["The word appears 1.4 times", "The word gets 40% more emphasis", "The word is 1.4 pixels big", "The word is in version 1.4"],
            answer: 1,
            explanation: "(word:1.4) increases the attention weight by 40%, making that concept more prominent in the output.",
          },
        },
        {
          id: "m5l3",
          title: "DALL·E 3 Optimization",
          content: `<p className="mb-4">DALL·E 3 is unique because it <strong>rewrites your prompt internally</strong>. This means you need to be extremely explicit about what you want.</p>
          <p className="mb-4">Tips:<br>• Use full natural language sentences, not tags<br>• Specify exact spatial positions ("on the left side," "in the background")<br>• DALL·E handles <strong>text in images</strong> better than other models<br>• Longer, more detailed prompts yield better results</p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg text-xs font-mono mb-4"><span className="text-emerald-500 font-bold block mb-1">✅ DALL·E-optimized</span>A photorealistic image of a cozy coffee shop interior. On the left side, a woman with curly brown hair sits reading a book. Through the large window behind her, a rainy city street is visible. The lighting is warm and ambient, coming from Edison bulbs overhead. The sign on the wall reads "Good Morning" in elegant script.</div>`,
          quiz: {
            q: "Why should DALL·E prompts be extra explicit?",
            options: ["It has a small vocabulary", "It rewrites your prompt internally", "It only works in English", "It requires JSON format"],
            answer: 1,
            explanation: "DALL·E 3 rewrites your prompt before processing, so being explicit prevents it from changing your intent.",
          },
        },
      ],
    },
  };

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [courseProgress, setCourseProgress] = useState<Record<string, boolean>>({});
  const [openLessons, setOpenLessons] = useState<Record<string, boolean>>({});
  const [quizSelection, setQuizSelection] = useState<Record<string, number>>({});
  const [quizGraded, setQuizGraded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load progress from local storage
    const saved = localStorage.getItem("course_progress");
    if (saved) {
      try {
        setCourseProgress(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse progress", e);
      }
    }
  }, []);

  const getModuleLessonCount = (mod: Module) => {
    const total = mod.lessons.length;
    const completed = mod.lessons.filter((l) => courseProgress[l.id]).length;
    return { total, completed };
  };

  const getTotalCourseStats = () => {
    let total = 0;
    let completed = 0;
    Object.values(COURSE_DATA).forEach((mod) => {
      mod.lessons.forEach((l) => {
        total++;
        if (courseProgress[l.id]) completed++;
      });
    });
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  };

  const toggleLessonAccordion = (lessonId: string) => {
    setOpenLessons((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  const handleSelectQuizOption = (lessonId: string, idx: number) => {
    if (quizGraded[lessonId]) return;
    setQuizSelection((prev) => ({
      ...prev,
      [lessonId]: idx,
    }));
  };

  const gradeQuiz = (lessonId: string) => {
    if (quizSelection[lessonId] === undefined) {
      showToast("Please select an answer first!", "error");
      return;
    }
    setQuizGraded((prev) => ({
      ...prev,
      [lessonId]: true,
    }));
  };

  const markLessonComplete = (lessonId: string) => {
    const updated = {
      ...courseProgress,
      [lessonId]: true,
    };
    setCourseProgress(updated);
    localStorage.setItem("course_progress", JSON.stringify(updated));
    showToast("Lesson completed successfully!", "success");
  };

  const activeModule = activeModuleId ? COURSE_DATA[activeModuleId] : null;
  const courseStats = getTotalCourseStats();

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-outfit font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
            <BookOpen className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
            Learn Academy
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Master professional prompt engineering through structured modules, interactive lessons, and quick quizzes.
          </p>
        </div>

        {/* Global Progress Circle widget */}
        <div className="flex items-center gap-3.5 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/30 self-start md:self-auto flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600/10 border-t-indigo-600 flex items-center justify-center font-bold text-xs text-zinc-900 dark:text-white">
            {courseStats.percent}%
          </div>
          <div>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 block tracking-tight">
              Academy Progress
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {courseStats.completed}/{courseStats.total} LESSONS
            </span>
          </div>
        </div>
      </div>

      {/* Academy Home Dashboard Modules View */}
      {!activeModule && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
          {Object.values(COURSE_DATA).map((mod) => {
            const { total, completed } = getModuleLessonCount(mod);
            const pct = Math.round((completed / total) * 100);
            return (
              <Card
                key={mod.id}
                onClick={() => {
                  setActiveModuleId(mod.id);
                  // Auto open first lesson
                  if (mod.lessons.length > 0) {
                    setOpenLessons({ [mod.lessons[0].id]: true });
                  }
                }}
                className="group border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/[0.02] cursor-pointer transition-all duration-350 flex flex-col justify-between"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-zinc-400 mb-2">
                    <span className="uppercase tracking-wider">Module {mod.id.replace("m", "")}</span>
                    <span className="font-mono">{completed}/{total} LESSONS</span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                    {mod.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Line */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-zinc-400">
                    <span>Click to begin module</span>
                    <Award className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drill-down Module Lesson List View */}
      {activeModule && (
        <div className="space-y-6 animate-slide-up">
          {/* Back Action Header */}
          <button
            onClick={() => setActiveModuleId(null)}
            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Academy Modules
          </button>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              {activeModule.title}
            </h2>

            {/* Lessons Accordion List */}
            {activeModule.lessons.map((lesson, idx) => {
              const isOpen = !!openLessons[lesson.id];
              const isCompleted = !!courseProgress[lesson.id];
              const hasQuiz = !!lesson.quiz;
              const isGraded = !!quizGraded[lesson.id];
              const selectedIdx = quizSelection[lesson.id];
              const isCorrect = selectedIdx === lesson.quiz?.answer;

              return (
                <Card
                  key={lesson.id}
                  className={`border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-sm overflow-hidden transition-all duration-200 ${
                    isOpen ? "ring-1 ring-indigo-500/20" : ""
                  }`}
                >
                  {/* Header Trigger */}
                  <div
                    onClick={() => toggleLessonAccordion(lesson.id)}
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {idx + 1}
                      </span>
                      <span className={`text-sm font-semibold transition-colors duration-200 ${
                        isOpen ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-900 dark:text-zinc-100"
                      }`}>
                        {lesson.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                      )}
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  {isOpen && (
                    <CardContent className="pt-2 pb-6 px-6 border-t border-zinc-100 dark:border-zinc-800/80 space-y-6">
                      {/* Rich Content Text */}
                      <div
                        dangerouslySetInnerHTML={{ __html: lesson.content }}
                        className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-white [&_em]:text-indigo-600 dark:[&_em]:text-indigo-400 [&_code]:font-mono [&_code]:bg-zinc-100 dark:[&_code]:bg-zinc-900 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
                      />

                      {/* Quiz Module Box */}
                      {hasQuiz && lesson.quiz && (
                        <div className="p-5 rounded-xl border border-zinc-200/50 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                            <HelpCircle className="w-4 h-4 text-indigo-500" />
                            <span>🧠 QUICK COMPREHENSION CHECK</span>
                          </div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {lesson.quiz.q}
                          </p>

                          {/* Options buttons list */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {lesson.quiz.options.map((opt, oIdx) => {
                              const isSelected = selectedIdx === oIdx;
                              let btnClass = "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950";
                              if (isGraded) {
                                if (oIdx === lesson.quiz?.answer) {
                                  btnClass = "border-emerald-500/50 bg-emerald-500/[0.04] text-emerald-700 dark:text-emerald-400";
                                } else if (isSelected) {
                                  btnClass = "border-red-500/50 bg-red-500/[0.04] text-red-700 dark:text-red-400";
                                } else {
                                  btnClass = "opacity-50 border-zinc-200 dark:border-zinc-800 bg-zinc-50";
                                }
                              } else if (isSelected) {
                                btnClass = "border-indigo-600 bg-indigo-600/5 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400";
                              }

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => handleSelectQuizOption(lesson.id, oIdx)}
                                  disabled={isGraded}
                                  className={`p-3 text-left rounded-lg text-xs font-medium border transition-all duration-150 ${btnClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>

                          {/* Grade Action Button / Explanations feedback */}
                          {!isGraded ? (
                            <Button
                              onClick={() => lesson.quiz && gradeQuiz(lesson.id)}
                              className="bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold h-8"
                            >
                              Check Answer
                            </Button>
                          ) : (
                            <div className={`p-4 rounded-lg border text-xs leading-relaxed ${
                              isCorrect
                                ? "bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                : "bg-red-500/[0.02] border-red-500/20 text-red-700 dark:text-red-400"
                            }`}>
                              <strong className="block text-[10px] uppercase tracking-wider mb-1 font-bold">
                                {isCorrect ? "✅ That is correct!" : "❌ Not quite right."}
                              </strong>
                              {lesson.quiz.explanation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mark Complete Trigger Button */}
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-805 flex justify-end">
                        <Button
                          onClick={() => markLessonComplete(lesson.id)}
                          disabled={isCompleted}
                          className={`text-xs font-semibold h-9 ${
                            isCompleted
                              ? "bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                        >
                          {isCompleted ? "✅ Completed" : "Mark as Complete"}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
