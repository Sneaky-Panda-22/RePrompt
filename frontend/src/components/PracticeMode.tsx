import { useState, useRef } from "react";
import { Upload, HelpCircle, Activity, Sparkles, Check, Copy, Layers } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface PracticeModeProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

interface BreakdownItem {
  element: string;
  detail: string;
  status: "covered" | "missing" | "partial" | "wrong";
}

interface EvaluationResponse {
  score: number;
  feedback: string;
  ideal_prompt: string;
  ideal_negative_prompt?: string;
  breakdown: BreakdownItem[];
}

export default function PracticeMode({ showToast }: PracticeModeProps) {
  const [activeTab, setActiveTab] = useState<"write" | "diff">("write");

  // State for tab "Write Your Own"
  const [writeImage, setWriteImage] = useState<string | null>(null);
  const [writeFile, setWriteFile] = useState<File | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [isWriteLoading, setIsWriteLoading] = useState(false);
  const [writeResult, setWriteResult] = useState<EvaluationResponse | null>(null);

  // State for tab "Fix My Prompt"
  const [diffImage, setDiffImage] = useState<string | null>(null);
  const [diffFile, setDiffFile] = useState<File | null>(null);
  const [diffPrompt, setDiffPrompt] = useState("");
  const [isDiffLoading, setIsDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<EvaluationResponse | null>(null);

  const [copySuccess, setCopySuccess] = useState(false);

  const writeInputRef = useRef<HTMLInputElement>(null);
  const diffInputRef = useRef<HTMLInputElement>(null);

  const processWriteFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file", "error");
      return;
    }
    setWriteFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setWriteImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const processDiffFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file", "error");
      return;
    }
    setDiffFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setDiffImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleWriteSubmit = async () => {
    if (!writeFile) {
      showToast("Please upload a target image", "error");
      return;
    }
    if (!userPrompt.trim()) {
      showToast("Please write your prompt first", "error");
      return;
    }

    setIsWriteLoading(true);
    setWriteResult(null);

    const formData = new FormData();
    formData.append("file", writeFile);
    formData.append("user_prompt", userPrompt);

    try {
      const resp = await fetch("/api/evaluate", { method: "POST", body: formData });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || "Evaluation failed");
      const data = (await resp.json()) as EvaluationResponse;
      setWriteResult(data);
      showToast(`Prompt scored: ${data.score}/10!`, "success");
    } catch (e: any) {
      showToast(e.message || "Evaluation failed", "error");
    } finally {
      setIsWriteLoading(false);
    }
  };

  const handleDiffSubmit = async () => {
    if (!diffFile) {
      showToast("Please upload the target image", "error");
      return;
    }
    if (!diffPrompt.trim()) {
      showToast("Please paste your prompt to improve", "error");
      return;
    }

    setIsDiffLoading(true);
    setDiffResult(null);

    const formData = new FormData();
    formData.append("file", diffFile);
    formData.append("user_prompt", diffPrompt);

    try {
      const resp = await fetch("/api/evaluate", { method: "POST", body: formData });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).detail || "Analysis failed");
      const data = (await resp.json()) as EvaluationResponse;
      setDiffResult(data);
      showToast(`Improvement blueprint ready! Score: ${data.score}/10`, "success");
    } catch (e: any) {
      showToast(e.message || "Evaluation failed", "error");
    } finally {
      setIsDiffLoading(false);
    }
  };

  const copyImprovedPrompt = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      showToast("Improved prompt copied!", "success");
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const renderBreakdownList = (items: BreakdownItem[]) => {
    const icons = {
      covered: { label: "COVERED", style: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400" },
      missing: { label: "MISSING", style: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400" },
      partial: { label: "PARTIAL", style: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400" },
      wrong: { label: "CONTRADICTS", style: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400" },
    };

    return (
      <div className="space-y-3">
        {items.map((item, idx) => {
          const cfg = icons[item.status] || { label: "•", style: "bg-zinc-100 text-zinc-700 border-zinc-200" };
          return (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50 block sm:inline mr-2">
                  {item.element}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</span>
              </div>
              <span className={`text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border self-start sm:self-center ${cfg.style}`}>
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Prompt Practice Sandbox
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Test and refine your prompting skills by matching against actual photographs.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
          <Button
            size="sm"
            variant={activeTab === "write" ? "default" : "ghost"}
            className={`h-8 px-4 text-xs font-semibold rounded-md ${
              activeTab === "write" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white" : ""
            }`}
            onClick={() => setActiveTab("write")}
          >
            Write Your Own
          </Button>
          <Button
            size="sm"
            variant={activeTab === "diff" ? "default" : "ghost"}
            className={`h-8 px-4 text-xs font-semibold rounded-md ${
              activeTab === "diff" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white" : ""
            }`}
            onClick={() => setActiveTab("diff")}
          >
            Fix My Prompt
          </Button>
        </div>
      </div>

      {/* VIEW: WRITE YOUR OWN */}
      {activeTab === "write" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Upload & Write Input */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
              <CardContent className="pt-6 space-y-5">
                {/* Upload Zone */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                    Target Photograph
                  </label>
                  <div
                    onClick={() => writeInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300 ${
                      writeImage
                        ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 cursor-default"
                        : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/5"
                    }`}
                  >
                    <input
                      type="file"
                      ref={writeInputRef}
                      onChange={(e) => e.target.files?.[0] && processWriteFile(e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />

                    {writeImage ? (
                      <div className="w-full relative group">
                        <img src={writeImage} alt="Target Photograph" className="w-full max-h-48 object-contain rounded-lg" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-all duration-200">
                          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
                            <Upload className="w-3 h-3" />
                            Replace Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-3 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-indigo-600">Select target photograph</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Textarea Input */}
                {writeImage && (
                  <div className="space-y-2 animate-slide-up">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Write your matching prompt
                    </label>
                    <Textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g. A gorgeous close-up portrait of a woman with red hair under warm golden lighting, 85mm lens..."
                      className="min-h-36 resize-y text-sm font-sans"
                    />
                    <Button
                      onClick={handleWriteSubmit}
                      disabled={isWriteLoading}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-sm font-semibold h-10 gap-2 mt-4"
                    >
                      {isWriteLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Evaluating Prompt accuracy...
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4" />
                          Grade My Prompt
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Score Grading View */}
          <div className="lg:col-span-7">
            {isWriteLoading && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm animate-pulse">
                <CardContent className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-mono font-medium text-zinc-500">
                    CALCULATING ALIGNMENT VECTORS & COMPILING FEEDBACK...
                  </span>
                </CardContent>
              </Card>
            )}

            {!isWriteLoading && !writeResult && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm h-full">
                <CardContent className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                  <HelpCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 animate-bounce" />
                  <span className="text-sm font-semibold text-zinc-400">
                    Your prompt score and analysis will render here.
                  </span>
                </CardContent>
              </Card>
            )}

            {!isWriteLoading && writeResult && (
              <div className="space-y-6 animate-slide-up">
                {/* Score Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <CardTitle className="text-base font-semibold">Evaluation Results</CardTitle>
                      <CardDescription>Physics-alignment index score based on extracted metadata.</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-3xl font-outfit font-extrabold text-zinc-950 dark:text-white">
                        {writeResult.score}
                      </span>
                      <span className="text-sm text-zinc-400 font-medium">/ 10</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    {/* General Feedback */}
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/30">
                      <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        General Feedback
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                        {writeResult.feedback}
                      </p>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2">
                      <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                        Detail Parameter Alignment
                      </span>
                      {renderBreakdownList(writeResult.breakdown)}
                    </div>

                    {/* Ideal Blueprint Prompt */}
                    <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                          Optimized Ideal Blueprint Prompt
                        </span>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-6 gap-1 text-[10px] font-semibold text-indigo-600"
                          onClick={() => copyImprovedPrompt(writeResult.ideal_prompt)}
                        >
                          {copySuccess ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </Button>
                      </div>
                      <p className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg text-xs font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/30">
                        {writeResult.ideal_prompt}
                      </p>
                    </div>

                    {writeResult.ideal_negative_prompt && (
                      <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] block font-semibold text-red-500/70 dark:text-red-400/80 uppercase tracking-wider">
                            Suggested Negative Prompt
                          </span>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => {
                              navigator.clipboard.writeText(writeResult.ideal_negative_prompt || "");
                              showToast("Negative prompt copied!", "success");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </Button>
                        </div>
                        <p className="p-3 bg-red-500/5 dark:bg-red-950/10 rounded-lg text-xs font-mono text-zinc-500 dark:text-zinc-400 border border-red-500/10 dark:border-red-500/20">
                          {writeResult.ideal_negative_prompt}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: FIX MY PROMPT */}
      {activeTab === "diff" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Upload & Input Paste */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
              <CardContent className="pt-6 space-y-5">
                {/* Upload Zone */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
                    Target Photograph
                  </label>
                  <div
                    onClick={() => diffInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-300 ${
                      diffImage
                        ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 cursor-default"
                        : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/5"
                    }`}
                  >
                    <input
                      type="file"
                      ref={diffInputRef}
                      onChange={(e) => e.target.files?.[0] && processDiffFile(e.target.files[0])}
                      accept="image/*"
                      className="hidden"
                    />

                    {diffImage ? (
                      <div className="w-full relative group">
                        <img src={diffImage} alt="Target Photograph" className="w-full max-h-48 object-contain rounded-lg" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-all duration-200">
                          <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
                            <Upload className="w-3 h-3" />
                            Replace Image
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-3 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-indigo-600">Select target photograph</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Paste Area */}
                {diffImage && (
                  <div className="space-y-2 animate-slide-up">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Paste your original draft prompt
                    </label>
                    <Textarea
                      value={diffPrompt}
                      onChange={(e) => setDiffPrompt(e.target.value)}
                      placeholder="e.g. a woman, beautiful lighting..."
                      className="min-h-36 resize-y text-sm font-sans"
                    />
                    <Button
                      onClick={handleDiffSubmit}
                      disabled={isDiffLoading}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-sm font-semibold h-10 gap-2 mt-4"
                    >
                      {isDiffLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Analyzing Improvements...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Audit & Fix My Prompt
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Diff View Results */}
          <div className="lg:col-span-7">
            {isDiffLoading && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm animate-pulse">
                <CardContent className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-mono font-medium text-zinc-500">
                    MAPPING COMPOSITIONAL GAP VECTORS & BUILDING HIGHER FIDELITY REPROMPTS...
                  </span>
                </CardContent>
              </Card>
            )}

            {!isDiffLoading && !diffResult && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm h-full">
                <CardContent className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                  <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-700 animate-bounce" />
                  <span className="text-sm font-semibold text-zinc-400">
                    Prompt improvement and comparison breakdown will render here.
                  </span>
                </CardContent>
              </Card>
            )}

            {!isDiffLoading && diffResult && (
              <div className="space-y-6 animate-slide-up">
                {/* Diff Result Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm">
                  <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-row justify-between items-center">
                    <div>
                      <CardTitle className="text-base font-semibold">Compositional Refinement</CardTitle>
                      <CardDescription>Side-by-side prompt diff audit based on target image physics.</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-3xl font-outfit font-extrabold text-zinc-950 dark:text-white">
                        {diffResult.score}
                      </span>
                      <span className="text-sm text-zinc-400 font-medium">/ 10</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-6">
                    {/* General Audit Feedback */}
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/30">
                      <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Optimization Audit Review
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                        {diffResult.feedback}
                      </p>
                    </div>

                    {/* Side by side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original Draft */}
                      <div className="p-4 rounded-lg bg-red-500/[0.02] border border-red-500/10 dark:border-red-950/20">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-2">
                          Your original draft prompt
                        </span>
                        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-relaxed break-words whitespace-pre-wrap">
                          {diffPrompt}
                        </p>
                      </div>

                      {/* Improved Blueprint */}
                      <div className="p-4 rounded-lg bg-emerald-500/[0.02] border border-emerald-500/15 dark:border-emerald-950/20 relative group">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                            Refined Industry Blueprint
                          </span>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 gap-1 text-[9px] font-semibold text-emerald-600 hover:text-emerald-700 p-1"
                            onClick={() => copyImprovedPrompt(diffResult.ideal_prompt)}
                          >
                            {copySuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                          {diffResult.ideal_prompt}
                        </p>
                      </div>
                    </div>

                    {diffResult.ideal_negative_prompt && (
                      <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] block font-semibold text-red-500/70 dark:text-red-400/80 uppercase tracking-wider">
                            Suggested Negative Prompt
                          </span>
                          <Button
                            size="xs"
                            variant="ghost"
                            className="h-6 gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => {
                              navigator.clipboard.writeText(diffResult.ideal_negative_prompt || "");
                              showToast("Negative prompt copied!", "success");
                            }}
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </Button>
                        </div>
                        <p className="p-3 bg-red-500/5 dark:bg-red-950/10 rounded-lg text-xs font-mono text-zinc-500 dark:text-zinc-400 border border-red-500/10 dark:border-red-500/20">
                          {diffResult.ideal_negative_prompt}
                        </p>
                      </div>
                    )}

                    {/* Param Alignment List */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                        Compositional Parameters Audit
                      </span>
                      {renderBreakdownList(diffResult.breakdown)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
