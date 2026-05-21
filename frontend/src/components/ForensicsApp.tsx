import { useState, useRef, useEffect } from "react";
import { Upload, Copy, FileDown, RotateCcw, Eye, Activity, Image as ImageIcon, Check, Trash2, Edit, GitBranch, GitCommit, HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { jsPDF } from "jspdf";

interface ExifData {
  make?: string;
  model?: string;
  lens?: string;
  focal_length?: number | string;
  aperture?: number | string;
  iso?: number;
  exposure_time?: string;
}

interface AnalysisStats {
  brightness?: number;
  contrast?: number;
  depth_of_field?: number;
  shadow_hardness?: number;
  edges?: number;
  red_mean?: number;
  green_mean?: number;
  blue_mean?: number;
  aspect_ratio?: number;
  width?: number;
  height?: number;
  exif?: ExifData;
  [key: string]: any;
}

interface AnalysisResponse {
  stats: AnalysisStats;
  prompt: string;
  negative_prompt?: string;
  anatomy?: Array<{ text: string; segment_type: string; tooltip: string }>;
}

interface PromptRevision {
  rev: number;
  prompt: string;
  msg: string;
  timestamp: number;
}

interface HistoryItem {
  id: number;
  img: string;
  prompt: string;
  negative_prompt?: string;
  stats?: AnalysisStats;
  anatomy?: Array<{ text: string; segment_type: string; tooltip: string }>;
  revisions?: PromptRevision[];
}

export default function ForensicsApp({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"raw" | "anatomy">("raw");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyNegativeSuccess, setCopyNegativeSuccess] = useState(false);
  const [activeAnatomyIdx, setActiveAnatomyIdx] = useState<number | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const [revisionCommitMsg, setRevisionCommitMsg] = useState("");
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState("");
  const [diffSelectRevA, setDiffSelectRevA] = useState<number | null>(null);
  const [diffSelectRevB, setDiffSelectRevB] = useState<number | null>(null);

  interface DiffPart {
    type: "added" | "removed" | "normal";
    value: string;
  }

  const diffWords = (oldStr: string, newStr: string): DiffPart[] => {
    const oldWords = oldStr.split(/(\s+)/).filter(x => x.length > 0);
    const newWords = newStr.split(/(\s+)/).filter(x => x.length > 0);
    
    const dp: number[][] = Array(oldWords.length + 1).fill(0).map(() => Array(newWords.length + 1).fill(0));
    
    for (let i = 1; i <= oldWords.length; i++) {
      for (let j = 1; j <= newWords.length; j++) {
        if (oldWords[i - 1] === newWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    const result: DiffPart[] = [];
    let i = oldWords.length;
    let j = newWords.length;
    
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
        result.unshift({ type: "normal", value: oldWords[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({ type: "added", value: newWords[j - 1] });
        j--;
      } else {
        result.unshift({ type: "removed", value: oldWords[i - 1] });
        i--;
      }
    }
    return result;
  };

  const commitRevision = () => {
    if (!activeHistoryId) return;
    if (!editedPromptText.trim()) {
      showToast("Prompt cannot be empty.", "error");
      return;
    }
    const currentItem = history.find(h => h.id === activeHistoryId);
    if (!currentItem) return;

    const revs = currentItem.revisions || [];
    const nextRevNum = revs.length > 0 ? Math.max(...revs.map(r => r.rev)) + 1 : 1;
    const newRev: PromptRevision = {
      rev: nextRevNum,
      prompt: editedPromptText,
      msg: revisionCommitMsg.trim() || `Revision #${nextRevNum}`,
      timestamp: Date.now(),
    };

    const updatedRevisions = [...revs, newRev];
    
    const updatedHistory = history.map(item => {
      if (item.id === activeHistoryId) {
        return {
          ...item,
          prompt: editedPromptText,
          revisions: updatedRevisions
        };
      }
      return item;
    });

    setHistory(updatedHistory);
    localStorage.setItem("reprompt_history", JSON.stringify(updatedHistory));
    
    setAnalysisData(prev => prev ? { ...prev, prompt: editedPromptText } : null);
    setIsEditingPrompt(false);
    setRevisionCommitMsg("");
    showToast(`Saved revision #${nextRevNum}!`, "success");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Load analysis history from local storage
    const saved = localStorage.getItem("reprompt_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (imgBase64: string, responseData: AnalysisResponse) => {
    const id = Date.now();
    const newRevision: PromptRevision = {
      rev: 1,
      prompt: responseData.prompt,
      msg: "Initial Forensic Reverse-Engineering",
      timestamp: id,
    };

    const updated: HistoryItem[] = [
      {
        id,
        img: imgBase64,
        prompt: responseData.prompt,
        negative_prompt: responseData.negative_prompt,
        stats: responseData.stats,
        anatomy: responseData.anatomy,
        revisions: [newRevision],
      },
      ...history,
    ].slice(0, 5); // Keep last 5 entries
    setHistory(updated);
    localStorage.setItem("reprompt_history", JSON.stringify(updated));
    return id;
  };

  const deleteFromHistory = (id: number) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem("reprompt_history", JSON.stringify(updated));
    showToast("Deleted from history", "success");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const compressImage = (selectedFile: File, callback: (compressed: File, dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600;

        if (width > height && width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width *= maxDimension / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], selectedFile.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                callback(compressedFile, canvas.toDataURL("image/jpeg", 0.75));
              }
            },
            "image/jpeg",
            0.75
          );
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(selectedFile);
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      showToast("Please upload an image file", "error");
      return;
    }

    compressImage(selectedFile, (compressed, dataUrl) => {
      setFile(compressed);
      setImage(dataUrl);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const resetAll = () => {
    setImage(null);
    setFile(null);
    setAnalysisData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeImage = async () => {
    if (!file) return;
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/reprompt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Server error occurred");
      }

      const data = await response.json();
      const extractedPrompt = data.reprompt || data.prompt || "";
      
      // Dynamically fetch prompt anatomy from the backend
      let anatomyData: any[] = [];
      try {
        const anatomyResp = await fetch("/api/anatomy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: extractedPrompt }),
        });
        if (anatomyResp.ok) {
          const anatomyResult = await anatomyResp.json();
          if (anatomyResult.segments) {
            anatomyData = anatomyResult.segments.map((seg: any) => ({
              text: seg.text,
              segment_type: seg.category || seg.segment_type || "subject",
              tooltip: seg.tooltip || "Visual component",
            }));
          }
        }
      } catch (e) {
        console.error("Anatomy analysis failed:", e);
      }

      const formattedData: AnalysisResponse = {
        stats: data.stats,
        prompt: extractedPrompt,
        negative_prompt: data.negative_prompt,
        anatomy: anatomyData.length > 0 ? anatomyData : undefined,
      };

      setAnalysisData(formattedData);
      if (image) {
        const id = saveToHistory(image, formattedData);
        setActiveHistoryId(id);
      }
      showToast("Analysis complete!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to analyze image.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!analysisData) return;
    navigator.clipboard.writeText(analysisData.prompt).then(() => {
      setCopySuccess(true);
      showToast("Prompt copied to clipboard!", "success");
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const copyNegativeToClipboard = () => {
    if (!analysisData || !analysisData.negative_prompt) return;
    navigator.clipboard.writeText(analysisData.negative_prompt).then(() => {
      setCopyNegativeSuccess(true);
      showToast("Negative prompt copied to clipboard!", "success");
      setTimeout(() => setCopyNegativeSuccess(false), 2000);
    });
  };

  const downloadPdfReport = () => {
    if (!analysisData || !image || !imgRef.current) return;

    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("RePrompt Forensic Audit Report", 20, 20);

      doc.setDrawColor(220, 220, 220);
      doc.line(20, 25, 190, 25);

      // Add image
      const canvas = document.createElement("canvas");
      canvas.width = imgRef.current.naturalWidth || 800;
      canvas.height = imgRef.current.naturalHeight || 600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(imgRef.current, 0, 0);
        const jpegData = canvas.toDataURL("image/jpeg", 0.95);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const maxWidth = pdfWidth - 40;
        const maxHeight = 80;
        const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const finalWidth = canvas.width * ratio;
        const finalHeight = canvas.height * ratio;
        const xOffset = (pdfWidth - finalWidth) / 2;

        doc.addImage(jpegData, "JPEG", xOffset, 30, finalWidth, finalHeight);

        let currentY = 30 + finalHeight + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Extracted Forensic Parameters:", 20, currentY);

        currentY += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        const getVal = (key1: string, key2?: string) => {
          const val = (analysisData.stats as any)[key1] ?? (key2 ? (analysisData.stats as any)[key2] : undefined);
          return val;
        };

        const brightnessVal = getVal("mean_brightness_global", "mean_brightness");
        const contrastVal = getVal("global_contrast", "contrast_ratio");
        const dofVal = getVal("sharpness_score", "dof_class");
        const shadowVal = getVal("shadow_hardness", "shadow_score");

        const stats = [
          `Brightness: ${typeof brightnessVal === "number" ? brightnessVal.toFixed(2) + "%" : (brightnessVal ?? "N/A")}`,
          `Shadow Hardness: ${typeof shadowVal === "number" ? shadowVal.toFixed(2) : (shadowVal ?? "N/A")}`,
          `Depth of Field: ${typeof dofVal === "number" ? dofVal.toFixed(2) : (dofVal ?? "N/A")}`,
          `Contrast index: ${typeof contrastVal === "number" ? contrastVal.toFixed(2) : (contrastVal ?? "N/A")}`,
        ];

        stats.forEach((stat) => {
          doc.text(stat, 25, currentY);
          currentY += 6;
        });

        currentY += 5;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Optimized RePrompt Prompt blueprint:", 20, currentY);

        currentY += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(analysisData.prompt, pdfWidth - 40);
        doc.text(lines, 20, currentY);
        currentY += (lines.length * 5) + 10;

        if (analysisData.negative_prompt) {
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text("Suggested Negative Prompt:", 20, currentY);
          currentY += 8;
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
          const negLines = doc.splitTextToSize(analysisData.negative_prompt, pdfWidth - 40);
          doc.text(negLines, 20, currentY);
        }

        doc.save("RePrompt_Forensic_Report.pdf");
        showToast("PDF report downloaded!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Could not generate PDF report", "error");
    }
  };

  const getStatLabel = (key: keyof AnalysisStats) => {
    const labels: Record<string, string> = {
      brightness: "Brightness Index",
      contrast: "Contrast Ratio",
      depth_of_field: "Depth of Field",
      shadow_hardness: "Shadow Hardness",
      edges: "Spatial Frequency",
      red_mean: "Red Channel Mean",
      green_mean: "Green Channel Mean",
      blue_mean: "Blue Channel Mean",
      aspect_ratio: "Aspect Ratio",
      width: "Resolution Width",
      height: "Resolution Height",
    };
    return labels[key] || String(key);
  };

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-outfit font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Forensic Prompt Extraction
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Extract physics data, lighting styles, color schemas, and camera angles to reconstruct prompts.
          </p>
        </div>
        {analysisData && (
          <Button variant="outline" className="flex items-center gap-2 text-xs font-semibold h-9" onClick={resetAll}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Analyzer
          </Button>
        )}
      </div>

      {/* Main Split Layout Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Upload Control Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-6 self-start">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Image Source</CardTitle>
              <CardDescription>Drag and drop or search for a local master photograph.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Image / Drag Drop Area */}
              {image ? (
                <div className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 shadow-sm transition-all duration-300">
                  <img
                    ref={imgRef}
                    src={image}
                    alt="Source Audit Master"
                    className="w-full max-h-72 object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-all duration-200">
                    <Button size="sm" variant="secondary" onClick={triggerUpload} className="h-8.5 text-xs gap-1.5 font-semibold">
                      <Upload className="w-3.5 h-3.5" />
                      Replace
                    </Button>
                    {analysisData && (
                      <Button size="sm" variant="destructive" onClick={resetAll} className="h-8.5 text-xs gap-1.5 font-semibold bg-red-600 hover:bg-red-700 text-white border-0">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerUpload}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                      : "border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/5"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="space-y-4 py-4 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                      <Upload className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Click to upload</span>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400"> or drag and drop</span>
                    </div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Supports PNG, JPG, WEBP</span>
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {image && !analysisData && (
                <Button
                  onClick={analyzeImage}
                  disabled={isLoading}
                  className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md font-semibold h-10 gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing Physics & Prompting...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4" />
                      Start Forensic Audit
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Side: Results Terminal / Visualizer */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading && (
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm animate-pulse">
              <CardContent className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-mono font-medium text-zinc-500 dark:text-zinc-400">
                  RUNNING computer-vision AUDITS & GENERATING PROMPT BLUEPRINTS...
                </span>
              </CardContent>
            </Card>
          )}

          {!isLoading && !analysisData && (
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm">
              <CardContent className="py-24 text-center flex flex-col items-center justify-center space-y-3">
                <ImageIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 animate-bounce" />
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-600">
                  Audit results will render here after processing.
                </span>
                <span className="text-xs text-zinc-400/80 dark:text-zinc-600/80 max-w-xs">
                  Upload an image on the left and trigger a forensic scan to extract exact lighting, optics, and styles.
                </span>
              </CardContent>
            </Card>
          )}

          {!isLoading && analysisData && (
            <div className="space-y-6 animate-slide-up">
              {/* Tabs for Prompts */}
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Extracted Prompt Blueprint</CardTitle>
                    <CardDescription>Synthesized natural language representation of the master image.</CardDescription>
                  </div>
                  <div className="flex gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                    <Button
                      size="xs"
                      variant="ghost"
                      className={`h-7 px-3 text-xs font-semibold rounded-md ${
                        activeTab === "raw"
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                      onClick={() => {
                        setActiveTab("raw");
                        setActiveAnatomyIdx(null);
                      }}
                    >
                      Raw View
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className={`h-7 px-3 text-xs font-semibold rounded-md ${
                        activeTab === "anatomy"
                          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                      onClick={() => setActiveTab("anatomy")}
                    >
                      Prompt Anatomy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  {/* Prompt Text Container */}
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 relative">
                    {activeTab === "raw" && (
                      <div className="space-y-4">
                        {isEditingPrompt ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest">
                                Edit Prompt Revision
                              </span>
                            </div>
                            <textarea
                              value={editedPromptText}
                              onChange={(e) => setEditedPromptText(e.target.value)}
                              className="w-full min-h-[100px] p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              placeholder="Positive Prompt"
                            />
                            <div className="space-y-1">
                              <label className="text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest block">
                                Commit Message
                              </label>
                              <input
                                type="text"
                                value={revisionCommitMsg}
                                onChange={(e) => setRevisionCommitMsg(e.target.value)}
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                placeholder="e.g. Tuned cinematic lighting, added film grain"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setIsEditingPrompt(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="xs"
                                onClick={commitRevision}
                                className="bg-indigo-650 hover:bg-indigo-750 text-white animate-fade-in"
                              >
                                <GitCommit className="w-3.5 h-3.5 mr-1" />
                                Save Commit
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Positive Prompt Block */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-widest">
                                  Prompt
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {activeHistoryId && (
                                    <button
                                      onClick={() => {
                                        setEditedPromptText(analysisData.prompt);
                                        setIsEditingPrompt(true);
                                        setRevisionCommitMsg("");
                                      }}
                                      className="p-1 rounded text-zinc-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all"
                                      title="Edit Prompt Revision"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={copyToClipboard}
                                    className="p-1 rounded text-zinc-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-all"
                                    title="Copy Positive Prompt"
                                  >
                                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed break-words whitespace-pre-wrap select-all">
                                {analysisData.prompt}
                              </p>
                            </div>

                            {/* Negative Prompt Block */}
                            {analysisData.negative_prompt && (
                              <div className="space-y-1 pt-3 border-t border-zinc-200/30 dark:border-zinc-800/30">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">
                                    Negative Prompt
                                  </span>
                                  <button
                                    onClick={copyNegativeToClipboard}
                                    className="p-1 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-450 hover:bg-red-500/10 transition-all"
                                    title="Copy Negative Prompt"
                                  >
                                    {copyNegativeSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-words whitespace-pre-wrap select-all">
                                  {analysisData.negative_prompt}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {activeTab === "anatomy" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-1.5 leading-relaxed text-sm select-all">
                          {analysisData.anatomy ? (
                            analysisData.anatomy.map((seg, idx) => (
                              <span
                                key={idx}
                                onClick={() => setActiveAnatomyIdx(activeAnatomyIdx === idx ? null : idx)}
                                className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-help transition-all duration-200 border relative group ${
                                  activeAnatomyIdx === idx 
                                    ? "ring-2 ring-indigo-500/50 scale-[1.02] " 
                                    : "hover:scale-[1.01]"
                                } ${
                                  seg.segment_type === "subject"
                                    ? "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400"
                                    : seg.segment_type === "lighting"
                                    ? "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                                    : seg.segment_type === "camera"
                                    ? "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400"
                                    : seg.segment_type === "style"
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                                    : "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 dark:text-zinc-400"
                                }`}
                              >
                                {seg.text}
                                {/* Hover/Tap Tooltip */}
                                <span className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-xl transition-opacity pointer-events-none z-30 font-sans leading-normal ${
                                  activeAnatomyIdx === idx ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                }`}>
                                  <strong className="block uppercase text-indigo-400 text-[9px] mb-0.5">{seg.segment_type}</strong>
                                  {seg.tooltip}
                                </span>
                              </span>
                            ))
                          ) : (
                            <p className="text-zinc-400 text-xs italic">Prompt Anatomy segment analysis is unavailable.</p>
                          )}
                        </div>

                        {/* Interactive mobile explanation details box */}
                        {activeAnatomyIdx !== null && analysisData.anatomy && analysisData.anatomy[activeAnatomyIdx] && (
                          <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 text-xs animate-slide-up flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  analysisData.anatomy[activeAnatomyIdx].segment_type === "subject" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                                  analysisData.anatomy[activeAnatomyIdx].segment_type === "lighting" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                                  analysisData.anatomy[activeAnatomyIdx].segment_type === "camera" ? "bg-purple-500/15 text-purple-700 dark:text-purple-400" :
                                  analysisData.anatomy[activeAnatomyIdx].segment_type === "style" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                                  "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400"
                                }`}>
                                  {analysisData.anatomy[activeAnatomyIdx].segment_type}
                                </span>
                                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-550 font-mono">
                                  Segment Detail
                                </span>
                              </div>
                              <p className="text-zinc-650 dark:text-zinc-300 leading-relaxed">
                                <strong className="font-semibold text-zinc-850 dark:text-zinc-100">"{analysisData.anatomy[activeAnatomyIdx].text}": </strong>
                                {analysisData.anatomy[activeAnatomyIdx].tooltip}
                              </p>
                            </div>
                            <button
                              onClick={() => setActiveAnatomyIdx(null)}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-350 cursor-pointer p-0.5 hover:bg-indigo-500/10 rounded transition-all"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={copyToClipboard} size="sm" variant="outline" className="text-xs font-semibold gap-1.5 h-9">
                      {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copySuccess ? "Copied" : "Copy Blueprint"}
                    </Button>
                    <Button onClick={downloadPdfReport} size="sm" variant="outline" className="text-xs font-semibold gap-1.5 h-9">
                      <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                      Export Forensic PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Prompt Git Registry Card */}
              {(() => {
                const currentItem = history.find(h => h.id === activeHistoryId);
                const revs = currentItem?.revisions || [];
                return activeHistoryId && revs.length > 0 ? (
                  <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
                    <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-zinc-955 dark:text-zinc-50">
                            <GitBranch className="w-4 h-4 text-indigo-500 animate-pulse" />
                            Prompt Version Control
                          </CardTitle>
                          <CardDescription>Track manual overrides and auto-generated iterations in browser storage.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-6">
                      {/* Revision timeline / list */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest block">
                          Revision Registry
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {revs.map((rev) => {
                            const isActive = analysisData.prompt === rev.prompt;
                            return (
                              <div
                                key={rev.rev}
                                onClick={() => {
                                  setAnalysisData(prev => prev ? { ...prev, prompt: rev.prompt } : null);
                                  setIsEditingPrompt(false);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 text-left relative flex flex-col justify-between ${
                                  isActive
                                    ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-sm"
                                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/5"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-indigo-650 dark:text-indigo-400">
                                      REV #{rev.rev}
                                    </span>
                                    {isActive && (
                                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-500 text-white dark:bg-indigo-600 animate-fade-in">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-200 mt-1.5 line-clamp-1">
                                    {rev.msg}
                                  </p>
                                </div>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-550 font-mono mt-3">
                                  {new Date(rev.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Git Diff Comparison Tool */}
                      {revs.length >= 2 && (
                        <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-widest block">
                                Visual Diff Inspector
                              </span>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 mt-0.5 font-medium">Compare any two revisions word-by-word.</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <select
                                value={diffSelectRevA ?? revs[0]?.rev ?? ""}
                                onChange={(e) => setDiffSelectRevA(Number(e.target.value))}
                                className="p-1.5 rounded bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                              >
                                {revs.map((rev) => (
                                  <option key={rev.rev} value={rev.rev}>
                                    Rev {rev.rev}
                                  </option>
                                ))}
                              </select>
                              <span className="text-xs text-zinc-400 font-medium">vs</span>
                              <select
                                value={diffSelectRevB ?? revs[revs.length - 1]?.rev ?? ""}
                                onChange={(e) => setDiffSelectRevB(Number(e.target.value))}
                                className="p-1.5 rounded bg-zinc-150 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                              >
                                {revs.map((rev) => (
                                  <option key={rev.rev} value={rev.rev}>
                                    Rev {rev.rev}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Render diff words */}
                          {(() => {
                            const revA = revs.find(r => r.rev === (diffSelectRevA ?? revs[0]?.rev));
                            const revB = revs.find(r => r.rev === (diffSelectRevB ?? revs[revs.length - 1]?.rev));
                            if (!revA || !revB) return null;
                            
                            const diffs = diffWords(revA.prompt, revB.prompt);
                            return (
                              <div className="p-3.5 rounded-lg bg-zinc-900 text-zinc-100 dark:bg-zinc-950 font-mono text-xs leading-relaxed border border-zinc-850 dark:border-zinc-900 whitespace-pre-wrap select-text">
                                {diffs.map((part, index) => {
                                  if (part.type === "added") {
                                    return (
                                      <span key={index} className="bg-emerald-500/25 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/20 font-bold mx-0.5 inline-block">
                                        {part.value}
                                      </span>
                                    );
                                  }
                                  if (part.type === "removed") {
                                    return (
                                      <span key={index} className="bg-red-500/25 text-red-300 line-through px-1 py-0.5 rounded border border-red-500/20 font-bold mx-0.5 inline-block">
                                        {part.value}
                                      </span>
                                    );
                                  }
                                  return <span key={index}>{part.value}</span>;
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>

      {!isLoading && analysisData && (
        <div className="space-y-6">
          {/* EXIF Camera Specifications Card */}
          {(() => {
            const exif = analysisData.stats.exif;
            const hasExif = exif && Object.values(exif).some(v => v !== undefined && v !== null && v !== "");
            return (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm animate-slide-up">
                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <CardTitle className="text-base font-semibold">EXIF Camera Specifications</CardTitle>
                  <CardDescription>Optics and camera settings extracted from the image file.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  {hasExif && exif ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {exif.make && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Camera Maker</span>
                          <span className="text-sm font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">{exif.make}</span>
                        </div>
                      )}
                      {exif.model && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Camera Model</span>
                          <span className="text-sm font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">{exif.model}</span>
                        </div>
                      )}
                      {exif.lens && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Lens Model</span>
                          <span className="text-sm font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">{exif.lens}</span>
                        </div>
                      )}
                      {exif.focal_length && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-555 uppercase tracking-wider">Focal Length</span>
                          <span className="text-sm font-mono font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">
                            {typeof exif.focal_length === 'number' 
                              ? `${exif.focal_length}mm` 
                              : String(exif.focal_length).endsWith('mm') 
                                ? exif.focal_length 
                                : `${exif.focal_length}mm`}
                          </span>
                        </div>
                      )}
                      {exif.aperture && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Aperture</span>
                          <span className="text-sm font-mono font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">
                            {String(exif.aperture).startsWith('f/') 
                              ? exif.aperture 
                              : `f/${exif.aperture}`}
                          </span>
                        </div>
                      )}
                      {exif.exposure_time && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Exposure Time</span>
                          <span className="text-sm font-mono font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">
                            {exif.exposure_time}s
                          </span>
                        </div>
                      )}
                      {exif.iso && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">ISO Speed</span>
                          <span className="text-sm font-mono font-bold text-zinc-955 dark:text-zinc-100 mt-1 block">{exif.iso}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-zinc-50/55 dark:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 dark:text-zinc-450 text-xs font-semibold">
                      <HelpCircle className="w-4 h-4 text-zinc-400" />
                      <span>No EXIF Metadata embedded (estimates derived from CV physics)</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Audited Physics Parameters Card */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm animate-slide-up">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <CardTitle className="text-base font-semibold">Audited Physics Parameters</CardTitle>
              <CardDescription>Direct pixel metrics calculated via computer vision.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {Object.entries(analysisData.stats).length > 0 ? (
                  Object.entries(analysisData.stats).map(([key, val]) => {
                    if (val === undefined || val === null) return null;
                    if (key === "exif" || key === "dominant_hues" || typeof val === "object" || Array.isArray(val)) return null;
                    const isPercent = key === "brightness" || key === "mean_brightness_global" || key === "mean_brightness";
                    return (
                      <div key={key} className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30 animate-fade-in">
                        <span className="text-[10px] block font-semibold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">
                          {getStatLabel(key as keyof AnalysisStats)}
                        </span>
                        <span className="text-lg font-mono font-extrabold text-zinc-950 dark:text-zinc-100 mt-1 block">
                          {typeof val === "number" ? (isPercent ? `${val.toFixed(1)}%` : val.toFixed(2)) : String(val)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-6 text-center text-zinc-450 dark:text-zinc-550 text-xs italic">
                    Physics metrics are unavailable for this legacy history record. Run a new scan to view real-time metrics.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Grid (Only if has items) */}
      {history.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800 animate-slide-up">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Local Analysis History</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Quickly retrieve prompts from your recent five forensic scans.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="group relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="w-full h-32 overflow-hidden bg-zinc-100 dark:bg-zinc-900 relative">
                  <img src={item.img} alt="History scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-250">
                    <Button
                      size="xs"
                      variant="secondary"
                      className="h-7 text-[10px] gap-1 font-semibold"
                      onClick={() => {
                        setImage(item.img);
                        setAnalysisData({
                          prompt: item.prompt,
                          negative_prompt: item.negative_prompt,
                          stats: item.stats || {},
                          anatomy: item.anatomy,
                        });
                        setActiveHistoryId(item.id);
                        setIsEditingPrompt(false);
                        showToast("Loaded from history!", "success");
                      }}
                    >
                      <Eye className="w-3 h-3" />
                      Restore
                    </Button>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 line-clamp-3">
                    {item.prompt}
                  </p>
                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {new Date(item.id).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      className="text-zinc-400 hover:text-red-500 p-1 rounded hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors"
                      title="Remove"
                      onClick={() => deleteFromHistory(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
