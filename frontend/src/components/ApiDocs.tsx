import { FileCode2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardDescription, CardContent } from "./ui/card";

interface ApiDocsProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

export default function ApiDocs({ showToast }: ApiDocsProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(id);
      showToast("Copied to clipboard!", "success");
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const sampleRepromptResponse = `{
  "reprompt": "A highly detailed portrait of a cyberpunk girl under amber neon lights...",
  "negative_prompt": "blurry, out of focus, low quality, cartoon, high-key lighting, bright sun",
  "stats": {
    "aspect_ratio": 1.77,
    "mean_brightness_global": 42.5,
    "global_contrast": 89.2,
    "dominant_hues": [30, 220],
    "brightness_class": "medium",
    "dof_class": "shallow",
    "shadow_hardness": "soft",
    "light_direction": "upper-left",
    "contrast_ratio": 4.2
  }
}`;

  const sampleImproveResponse = `{
  "result": "A gorgeous oil painting with visible brushstrokes of a classic lighthouse...",
  "negative_prompt": "photo, photorealistic, blurry, smooth textures, digital render"
}`;

  return (
    <div className="space-y-8 animate-fade-in p-1">
      {/* Header Info */}
      <div>
        <h1 className="text-3xl font-outfit font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
          <FileCode2 className="w-8 h-8 text-indigo-600" />
          API Documentation
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Integrate the RePrompt computer vision and vision-language prompting engine directly into your custom workflows.
        </p>
      </div>

      <div className="space-y-6">
        {/* Endpoint 1 */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
                  POST
                </span>
                <code className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  /api/reprompt
                </code>
              </div>
              <span className="text-xs font-semibold text-zinc-400 font-mono">
                MULTIPART / FORM-DATA
              </span>
            </div>
            <CardDescription className="mt-2">
              Upload an image file to reverse-engineer its visual language and extract physics parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Parameters Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Request Payload</h4>
              <div className="border border-zinc-200/50 dark:border-zinc-800/80 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-medium border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-800/80 text-zinc-400">
                      <th className="p-3">FIELD</th>
                      <th className="p-3">TYPE</th>
                      <th className="p-3">REQUIRED</th>
                      <th className="p-3">DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/55">
                    <tr className="text-zinc-900 dark:text-zinc-100">
                      <td className="p-3 font-mono">file</td>
                      <td className="p-3 text-zinc-500">UploadFile</td>
                      <td className="p-3 text-indigo-600 font-bold">YES</td>
                      <td className="p-3 text-zinc-500">The source photograph (PNG, JPG, WEBP, BMP).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Response JSON */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Example Response (200 OK)</h4>
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-6 gap-1 text-[10px] font-semibold text-indigo-600"
                  onClick={() => copyToClipboard(sampleRepromptResponse, "reprompt")}
                >
                  {copiedText === "reprompt" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  Copy JSON
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 text-xs font-mono text-zinc-600 dark:text-zinc-350 border border-zinc-250/50 dark:border-zinc-800/40 overflow-x-auto leading-relaxed">
                {sampleRepromptResponse}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Endpoint 2 */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/20 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-600 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
                  POST
                </span>
                <code className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  /api/improve
                </code>
              </div>
              <span className="text-xs font-semibold text-zinc-400 font-mono">
                APPLICATION / JSON
              </span>
            </div>
            <CardDescription className="mt-2">
              Send a basic descriptive text prompt to receive a professional, detailed, optimized generative prompt.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Parameters Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Request Payload</h4>
              <pre className="p-3 bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-200/50 dark:border-zinc-800/80 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-350">
{`{
  "text": "a cute cat on a table"
}`}
              </pre>
            </div>

            {/* Response JSON */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Example Response (200 OK)</h4>
                <Button
                  size="xs"
                  variant="ghost"
                  className="h-6 gap-1 text-[10px] font-semibold text-indigo-600"
                  onClick={() => copyToClipboard(sampleImproveResponse, "improve")}
                >
                  {copiedText === "improve" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  Copy JSON
                </Button>
              </div>
              <pre className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 text-xs font-mono text-zinc-600 dark:text-zinc-350 border border-zinc-250/50 dark:border-zinc-800/40 overflow-x-auto leading-relaxed">
                {sampleImproveResponse}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
