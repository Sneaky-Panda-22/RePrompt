import { useState } from "react";
import { Check, Copy, RefreshCw, AlertCircle, FileImage, Image as ImageIcon } from "lucide-react";
import { Button } from "./ui/button";
import { computeImageStats, computeCVSimilarity } from "../lib/image-stats";

interface SimilarityLabProps {
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface CVMetrics {
  color_match: number;
  brightness_match: number;
  contrast_match: number;
  edge_match: number;
  physical_similarity_score: number;
}

interface SimilarityResult {
  similarity_score: number;
  critique: string;
  adjustments: {
    add: string[];
    remove: string[];
  };
  cv_metrics: CVMetrics;
}

export default function SimilarityLab({ showToast }: SimilarityLabProps) {
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState<string>("");
  const [generatedFile, setGeneratedFile] = useState<File | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<string>("");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimilarityResult | null>(null);

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTargetFile(file);
      setTargetPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleGeneratedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGeneratedFile(file);
      setGeneratedPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const runEvaluation = async () => {
    if (!targetFile || !generatedFile) {
      showToast("Please upload both Target and Generated images.", "error");
      return;
    }

    setLoading(true);

    try {
      const [targetResult, genResult] = await Promise.all([
        computeImageStats(targetFile),
        computeImageStats(generatedFile),
      ]);
      const cvMetrics = computeCVSimilarity(targetResult.stats, genResult.stats);

      const resp = await fetch("/api/evaluate-similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: targetResult.base64,
          generated: genResult.base64,
          cv_metrics: cvMetrics,
          mime_type: targetResult.mimeType,
        }),
      });

      if (!resp.ok) {
        throw new Error(await resp.text());
      }

      const data = await resp.json();
      setResult(data);
      showToast("Similarity audit completed successfully!", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "Failed to compare images.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    showToast("Copied to clipboard!", "success");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 stroke-emerald-500";
    if (score >= 60) return "text-amber-500 stroke-amber-500";
    return "text-red-500 stroke-red-500";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-zinc-900 dark:text-white tracking-tight">
            Similarity Lab
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Evaluate how closely your generated image aligns with your target photograph using computer vision metrics and visual feedback alignment loops.
          </p>
        </div>
      </div>

      {/* Upload Columns Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Image Dropzone */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">1</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-mono">Target Reference</h2>
          </div>
          
          {targetPreview ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 group">
              <img src={targetPreview} alt="Target" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                <label className="cursor-pointer bg-white text-zinc-900 px-4 py-2 rounded-xl text-xs font-bold font-outfit shadow-lg hover:scale-105 transition-transform">
                  Change Image
                  <input type="file" onChange={handleTargetChange} accept="image/*" className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/20 cursor-pointer group transition-all duration-200">
              <div className="flex flex-col items-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:scale-110 transition-transform duration-200 shadow-md">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-4 font-outfit">Upload Target Photo</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1">PNG, JPG, WEBP, or BMP</span>
              </div>
              <input type="file" onChange={handleTargetChange} accept="image/*" className="hidden" />
            </label>
          )}
        </div>

        {/* Generated Image Dropzone */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">2</span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 font-mono">Generated Output</h2>
          </div>

          {generatedPreview ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 group">
              <img src={generatedPreview} alt="Generated" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                <label className="cursor-pointer bg-white text-zinc-900 px-4 py-2 rounded-xl text-xs font-bold font-outfit shadow-lg hover:scale-105 transition-transform">
                  Change Image
                  <input type="file" onChange={handleGeneratedChange} accept="image/*" className="hidden" />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/20 cursor-pointer group transition-all duration-200">
              <div className="flex flex-col items-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:scale-110 transition-transform duration-200 shadow-md">
                  <FileImage className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-4 font-outfit">Upload Generated Render</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1">PNG, JPG, WEBP, or BMP</span>
              </div>
              <input type="file" onChange={handleGeneratedChange} accept="image/*" className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Audit Action Button */}
      <div className="flex justify-center">
        <Button
          onClick={runEvaluation}
          disabled={loading || !targetFile || !generatedFile}
          className="px-8 h-12 rounded-xl text-sm font-bold font-outfit shadow-lg transition-transform duration-200 hover:scale-[1.02] flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Comparing Visual Layouts...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Audit Image Alignment
            </>
          )}
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 bg-white dark:bg-zinc-900/30 backdrop-blur-sm animate-pulse space-y-6">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl col-span-2" />
          </div>
        </div>
      )}

      {/* Results View */}
      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-in-bottom">
          {/* Radial Metric Gauges */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-mono mb-6">Alignment Score</h3>
            
            {/* Score circle */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" className="stroke-zinc-100 dark:stroke-zinc-800 fill-none" strokeWidth="10" />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  className={`fill-none transition-all duration-1000 ${getScoreColor(result.similarity_score)}`}
                  strokeWidth="10"
                  strokeDasharray={402}
                  strokeDashoffset={402 - (402 * result.similarity_score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold font-outfit text-zinc-900 dark:text-white leading-none">{result.similarity_score}%</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 font-semibold uppercase tracking-wider">MATCHED</span>
              </div>
            </div>

            {/* Individual sliders */}
            <div className="w-full space-y-3.5 mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">
              {[
                { label: "Colors & Hue", val: result.cv_metrics.color_match },
                { label: "Luminance/Brightness", val: result.cv_metrics.brightness_match },
                { label: "Contrast Ratio", val: result.cv_metrics.contrast_match },
                { label: "Optic Details & Sharpness", val: result.cv_metrics.edge_match },
              ].map((m) => (
                <div key={m.label} className="space-y-1 text-left">
                  <div className="flex justify-between text-[11px] font-mono font-medium">
                    <span className="text-zinc-500">{m.label}</span>
                    <span className="text-zinc-900 dark:text-zinc-200 font-bold">{m.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-1000"
                      style={{ width: `${m.val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed critique */}
          <div className="lg:col-span-2 space-y-6">
            {/* Critique Card */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-mono mb-4">Forensic Critique</h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 font-sans">
                {result.critique}
              </p>
            </div>

            {/* Actionable recommendations card */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Keywords to add */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">Add to Prompt</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.adjustments.add.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => handleCopy(kw)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <span>{kw}</span>
                      <Copy className="w-3 h-3 text-emerald-600/60 dark:text-emerald-400/50" />
                    </button>
                  ))}
                  {result.adjustments.add.length === 0 && (
                    <span className="text-xs font-mono text-zinc-400">No prompt terms to add.</span>
                  )}
                </div>
              </div>

              {/* Keywords to remove */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 font-mono">Remove / Adjust</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.adjustments.remove.map((kw) => (
                    <button
                      key={kw}
                      onClick={() => handleCopy(kw)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-500/20 hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <span>{kw}</span>
                      <Copy className="w-3 h-3 text-red-600/60 dark:text-red-400/50" />
                    </button>
                  ))}
                  {result.adjustments.remove.length === 0 && (
                    <span className="text-xs font-mono text-zinc-400">No adjustments recommended.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
