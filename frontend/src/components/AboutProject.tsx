import { Info, HelpCircle, Cpu, ShieldCheck, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";

interface AboutProjectProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function AboutProject({ showToast }: AboutProjectProps) {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(id);
      showToast("Command copied!", "success");
      setTimeout(() => setCopiedStep(null), 2000);
    });
  };

  const stackItems = [
    {
      title: "FastAPI",
      desc: "High-performance async Python backend orchestration, serving API pipelines.",
      icon: "⚡",
    },
    {
      title: "OpenCV",
      desc: "Computer vision engine calculating real-time brightness, shadows, contrast, and depth-of-field metrics.",
      icon: "👁",
    },
    {
      title: "Gemini Models",
      desc: "Google's powerful vision-language model family transforming pixel physics into highly accurate text blueprints.",
      icon: "🧠",
    },
    {
      title: "React & Tailwind CSS v4",
      desc: "Clean, professional, responsive split-pane SaaS dashboard utilizing shadcn/ui headless components.",
      icon: "🎨",
    },
  ];

  const installSteps = [
    {
      id: "clone",
      cmd: "git clone https://github.com/Sneaky-Panda-22/RePrompt.git",
      desc: "Clone the open source repository.",
    },
    {
      id: "pip",
      cmd: "pip install -r requirements.txt",
      desc: "Install backend computer vision and FastAPI server dependencies.",
    },
    {
      id: "env",
      cmd: 'export GEMINI_API_KEY="your_api_key"',
      desc: "Configure your secure Google AI credentials.",
    },
    {
      id: "run",
      cmd: "uvicorn main:app --host 0.0.0.0 --port 8080",
      desc: "Launch the local development workspace.",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Header Info */}
      <div>
        <h1 className="text-3xl font-outfit font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
          <Info className="w-8 h-8 text-indigo-600" />
          About RePrompt
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Learn about the engineering and core principles behind our forensic image-prompt extraction framework.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Why & Tech Stack */}
        <div className="lg:col-span-7 space-y-6">
          {/* Why RePrompt */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                Why RePrompt?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-600 dark:text-zinc-350 leading-relaxed font-normal">
              <p>
                Generative AI models produce stunning visual outcomes, but the prompts behind them are frequently lost, vague, or impossible to replicate. RePrompt bridges this gap.
              </p>
              <p>
                By combining **computer vision physics audits** with **vision-language models**, RePrompt doesn't just guess elements. It systematically calculates *how* the photograph was lit, focused, and composed, translating these physical measurements into high-fidelity generative prompts.
              </p>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-500" />
                Technology Stack
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stackItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/5 flex items-start gap-3.5"
                >
                  <span className="text-xl bg-white dark:bg-zinc-950 w-9 h-9 rounded-lg border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shadow-sm">
                    {item.icon}
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Local Development Guides */}
        <div className="lg:col-span-5">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-sm h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                Local Development
              </CardTitle>
              <CardDescription>Get up and running locally in under two minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {installSteps.map((step, idx) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-zinc-400">
                    <span className="font-mono uppercase">Step {idx + 1}: {step.desc}</span>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="h-6 gap-1 text-[9px] font-semibold text-indigo-600 p-1"
                      onClick={() => copyToClipboard(step.cmd, step.id)}
                    >
                      {copiedStep === step.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </Button>
                  </div>
                  <pre className="p-3 bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-200/55 dark:border-zinc-850 rounded-lg text-xs font-mono text-zinc-650 dark:text-zinc-400 overflow-x-auto leading-relaxed select-all">
                    <code>{step.cmd}</code>
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
