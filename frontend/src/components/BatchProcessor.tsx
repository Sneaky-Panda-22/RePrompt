import { useState } from "react";
import { Upload, FileImage, Download, RefreshCw, X, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";

interface BatchProcessorProps {
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

export default function BatchProcessor({ showToast }: BatchProcessorProps) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      addFilesToQueue(Array.from(selectedFiles));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems = files
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        name: f.name,
        size: formatSize(f.size),
        status: "pending" as const,
      }));

    if (newItems.length === 0) {
      showToast("Only image files are supported.", "error");
      return;
    }

    setQueue((prev) => [...prev, ...newItems]);
    setZipBlob(null); // Reset zip
  };

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    setQueue([]);
    setZipBlob(null);
  };

  const processBatch = async () => {
    if (queue.length === 0) return;

    setProcessing(true);
    setZipBlob(null);

    // Update statuses to processing
    setQueue((prev) =>
      prev.map((item) => ({ ...item, status: "processing" }))
    );

    const formData = new FormData();
    queue.forEach((item) => {
      formData.append("files", item.file);
    });

    try {
      const resp = await fetch("/api/reprompt/batch", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(await resp.text());
      }

      const blob = await resp.blob();
      setZipBlob(blob);

      // Set all to success
      setQueue((prev) =>
        prev.map((item) => ({ ...item, status: "success" }))
      );
      showToast("Batch processed successfully!", "success");
    } catch (e: any) {
      console.error(e);
      setQueue((prev) =>
        prev.map((item) => ({
          ...item,
          status: "error",
          error: "Failed to compile prompt parameters.",
        }))
      );
      showToast(e.message || "Failed to process batch.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const downloadDataset = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reprompt_dataset_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Dataset zip downloaded successfully!", "success");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-outfit text-zinc-900 dark:text-white tracking-tight">
            Batch Mode
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Process folders of target images concurrently to build organized, reverse-engineered datasets exported into CSV metadata lists and individual JSON templates.
          </p>
        </div>

        {queue.length > 0 && !processing && (
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              onClick={clearQueue}
              className="border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-outfit text-xs"
            >
              Clear Queue
            </Button>
            {zipBlob ? (
              <Button
                onClick={downloadDataset}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-outfit text-xs flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Download Zip Bundle
              </Button>
            ) : (
              <Button
                onClick={processBatch}
                className="font-outfit text-xs flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Process {queue.length} Images
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Main Workspace split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Dropzone */}
        <div className="lg:col-span-1 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none h-fit space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-mono">Bulk Uploader</h3>
          
          <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/20 cursor-pointer group transition-all duration-200 rounded-xl">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:scale-110 transition-transform duration-200 shadow-md">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-4 block font-outfit">Select Image Group</span>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">PNG, JPG, WEBP (Up to 20 files)</span>
            </div>
            <input type="file" onChange={handleFileChange} accept="image/*" multiple className="hidden" />
          </label>

          {zipBlob && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold font-outfit">Dataset compiled successfully!</span>
              </div>
              <Button
                onClick={downloadDataset}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-outfit flex items-center justify-center gap-1.5 h-9 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                Download Zip Bundle
              </Button>
            </div>
          )}
        </div>

        {/* Processing Queue table */}
        <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 bg-white dark:bg-zinc-900/50 backdrop-blur-md shadow-lg shadow-zinc-100/5 dark:shadow-none min-h-[300px] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 font-mono mb-4">Queue Registry</h3>

          {queue.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <FileImage className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono font-medium">No items currently queued in registry.</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 flex-shrink-0 bg-zinc-100 dark:bg-zinc-900">
                      <img
                        src={URL.createObjectURL(item.file)}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate pr-4 font-outfit">{item.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono font-medium mt-0.5">{item.size}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {item.status === "pending" && (
                      <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800">
                        Queued
                      </span>
                    )}
                    {item.status === "processing" && (
                      <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        Scanning
                      </span>
                    )}
                    {item.status === "success" && (
                      <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Completed
                      </span>
                    )}
                    {item.status === "error" && (
                      <span
                        title={item.error}
                        className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Failed
                      </span>
                    )}

                    {!processing && (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {queue.length > 0 && !processing && !zipBlob && (
            <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-4 flex justify-end">
              <Button
                onClick={processBatch}
                className="font-outfit text-xs flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Process Batch Queue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
