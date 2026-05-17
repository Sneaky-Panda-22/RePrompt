import { useState, useRef, useEffect } from "react";
import { Upload, Copy, FileDown, RotateCcw, Eye, Activity, Image as ImageIcon, Check, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { jsPDF } from "jspdf";

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
}

interface AnalysisResponse {
  stats: AnalysisStats;
  prompt: string;
  anatomy?: Array<{ text: string; segment_type: string; tooltip: string }>;
}

interface HistoryItem {
  id: number;
  img: string;
  prompt: string;
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

  const saveToHistory = (imgBase64: string, promptText: string) => {
    const updated = [
      { id: Date.now(), img: imgBase64, prompt: promptText },
      ...history,
    ].slice(0, 5); // Keep last 5 entries
    setHistory(updated);
    localStorage.setItem("reprompt_history", JSON.stringify(updated));
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
        anatomy: anatomyData.length > 0 ? anatomyData : undefined,
      };

      setAnalysisData(formattedData);
      if (image) {
        saveToHistory(image, formattedData.prompt);
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

        const stats = [
          `Brightness: ${analysisData.stats.brightness?.toFixed(2) ?? "N/A"}%`,
          `Shadow Hardness: ${analysisData.stats.shadow_hardness?.toFixed(2) ?? "N/A"}`,
          `Depth of Field index: ${analysisData.stats.depth_of_field?.toFixed(2) ?? "N/A"}`,
          `Contrast index: ${analysisData.stats.contrast?.toFixed(2) ?? "N/A"}`,
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
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Image Source</CardTitle>
              <CardDescription>Drag and drop or search for a local master photograph.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Drag Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={image ? undefined : triggerUpload}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  image
                    ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 cursor-default"
                    : isDragging
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

                {image ? (
                  <div className="w-full relative group">
                    <img
                      ref={imgRef}
                      src={image}
                      alt="Source Audit Master"
                      className="w-full max-h-64 object-contain rounded-lg shadow-sm border border-zinc-200/50 dark:border-zinc-800/50"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-all duration-200">
                      <Button size="sm" variant="secondary" onClick={triggerUpload} className="h-8 text-xs gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        Replace Image
                      </Button>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>

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
                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Extracted Prompt Blueprint</CardTitle>
                    <CardDescription>Synthesized natural language representation of the master image.</CardDescription>
                  </div>
                  <div className="flex gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                    <Button
                      size="xs"
                      variant={activeTab === "raw" ? "default" : "ghost"}
                      className={`h-7 px-3 text-xs font-semibold rounded-md ${
                        activeTab === "raw" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-850 dark:text-white" : ""
                      }`}
                      onClick={() => setActiveTab("raw")}
                    >
                      Raw View
                    </Button>
                    <Button
                      size="xs"
                      variant={activeTab === "anatomy" ? "default" : "ghost"}
                      className={`h-7 px-3 text-xs font-semibold rounded-md ${
                        activeTab === "anatomy" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-850 dark:text-white" : ""
                      }`}
                      onClick={() => setActiveTab("anatomy")}
                    >
                      Prompt Anatomy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  {/* Prompt Text Container */}
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
                    {activeTab === "raw" ? (
                      <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed break-words whitespace-pre-wrap select-all">
                        {analysisData.prompt}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1 leading-relaxed text-sm select-all">
                        {analysisData.anatomy ? (
                          analysisData.anatomy.map((seg, idx) => (
                            <span
                              key={idx}
                              className={`px-1.5 py-0.5 rounded text-xs font-medium cursor-help transition-all duration-200 border relative group ${
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
                              {/* Hover Tooltip */}
                              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-zinc-900 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 font-sans leading-normal">
                                <strong className="block uppercase text-indigo-400 text-[9px] mb-0.5">{seg.segment_type}</strong>
                                {seg.tooltip}
                              </span>
                            </span>
                          ))
                        ) : (
                          <p className="text-zinc-400 text-xs italic">Prompt Anatomy segment analysis is unavailable.</p>
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

              {/* Statistics Grid */}
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <CardTitle className="text-base font-semibold">Audited Physics Parameters</CardTitle>
                  <CardDescription>Direct pixel metrics calculated via computer vision.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(analysisData.stats).map(([key, val]) => {
                      if (val === undefined || val === null) return null;
                      const isPercent = key === "brightness";
                      return (
                        <div key={key} className="p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                          <span className="text-[10px] block font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {getStatLabel(key as keyof AnalysisStats)}
                          </span>
                          <span className="text-lg font-mono font-extrabold text-zinc-950 dark:text-zinc-100 mt-1 block">
                            {typeof val === "number" ? (isPercent ? `${val.toFixed(1)}%` : val.toFixed(2)) : String(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

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
                        setAnalysisData({ prompt: item.prompt, stats: {} });
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
