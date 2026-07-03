const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"];

const DAILY_CHALLENGES = [
  { id: "dc-01", image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb", category: "Landscape", difficulty: 2 },
  { id: "dc-02", image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", category: "Portrait", difficulty: 1 },
  { id: "dc-03", image_url: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308", category: "Architecture", difficulty: 3 },
  { id: "dc-04", image_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05", category: "Nature", difficulty: 2 },
  { id: "dc-05", image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e", category: "Forest", difficulty: 1 },
  { id: "dc-06", image_url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e", category: "Sunset", difficulty: 2 },
  { id: "dc-07", image_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470", category: "Travel", difficulty: 3 },
  { id: "dc-08", image_url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e", category: "Aerial", difficulty: 2 },
  { id: "dc-09", image_url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff", category: "Mountains", difficulty: 2 },
  { id: "dc-10", image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d", category: "Urban", difficulty: 3 },
  { id: "dc-11", image_url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b", category: "Ocean", difficulty: 1 },
  { id: "dc-12", image_url: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde", category: "Street", difficulty: 2 },
  { id: "dc-13", image_url: "https://images.unsplash.com/photo-1518173946687-a36f968f7cce", category: "Abstract", difficulty: 3 },
  { id: "dc-14", image_url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d", category: "Minimalist", difficulty: 1 },
];

async function geminiPost(payload: object, apiKey: string): Promise<{ text: string; model: string }> {
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      if (resp.status === 429) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      if (!resp.ok) {
        const err = await resp.text();
        console.error(`Gemini ${model} error:`, err);
        continue;
      }
      const data = await resp.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return { text, model };
    } catch (e) {
      console.error(`Gemini ${model} failed:`, e);
      continue;
    }
  }
  return { text: "", model: "none" };
}

function makePayload(systemPrompt: string, parts: any[], generationConfig: any) {
  return {
    contents: [{ parts: [{ text: systemPrompt }, ...parts] }],
    generationConfig,
  };
}

function stripMarkdown(text: string): string {
  return text.replace(/```(?:json)?\s*/g, "").trim();
}

function parseDailyDate(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function mimeFromExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "png";
  const map: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", bmp: "image/bmp" };
  return map[ext] || "image/png";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  const method = request.method;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 500, headers: { "content-type": "application/json" } });
  }

  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "Content-Type" } });
  }

  try {
    if (method === "POST" && path === "/api/reprompt") {
      const body = await request.json() as any;
      const imageBase64 = body.image;
      const stats = body.stats || {};
      const mimeType = body.mime_type || "image/png";

      const sysPrompt = `You are an elite AI image prompt engineer. Your specialty is reconstructing the exact prompt used to generate an image, optimized for Midjourney v6 or Stable Diffusion XL.

Below are verified physical measurements extracted from this image:
- Brightness: ${stats.brightness_class || "mid-key"} (mean: ${stats.mean_brightness || "N/A"})
- Depth of Field: ${stats.dof_class || "moderate"} (sharpness score: ${stats.sharpness_score || "N/A"})
- Shadow Hardness: ${stats.shadow_hardness || "soft"} (score: ${stats.shadow_score || "N/A"})
- Light Direction: ${stats.light_direction || "flat"}
- Contrast Ratio: ${stats.contrast_ratio || "N/A"}
- Edge Density: ${stats.edge_density || "N/A"}
- Dominant Hues: ${stats.dominant_hues || "N/A"}

Use these measurements as VERIFIED constraints for your prompt reconstruction. Output with these markers:
---POSITIVE PROMPT---
[your detailed prompt]
---NEGATIVE PROMPT---
[negative prompt]`;

      const { text } = await geminiPost(
        makePayload(sysPrompt, [{ inline_data: { mime_type: mimeType, data: imageBase64 } }], { temperature: 0.15, topP: 0.85, maxOutputTokens: 1500 }),
        apiKey
      );

      const posMatch = text.match(/---POSITIVE PROMPT---\s*([\s\S]*?)(?:---NEGATIVE PROMPT---|$)/);
      const negMatch = text.match(/---NEGATIVE PROMPT---\s*([\s\S]*)/);
      const reprompt = posMatch ? posMatch[1].trim() : text.trim();
      const negative_prompt = negMatch ? negMatch[1].trim() : "";

      return new Response(JSON.stringify({ reprompt, negative_prompt, stats }), { status: 200, headers });
    }

    if (method === "POST" && path === "/api/anatomy") {
      const { prompt } = await request.json() as any;
      if (!prompt) return new Response(JSON.stringify({ segments: [{ text: "No prompt provided", category: "subject", tooltip: "N/A" }] }), { status: 200, headers });

      const sysPrompt = `Parse the following image generation prompt into categorized segments. Return ONLY a JSON array (no markdown, no backticks): [{"text":"...","category":"subject|lighting|composition|style|mood|technical","tooltip":"..."}]`;
      const { text } = await geminiPost(
        makePayload(sysPrompt, [{ text: prompt }], { temperature: 0.1, topP: 0.8, maxOutputTokens: 1500 }),
        apiKey
      );

      try {
        const segments = JSON.parse(stripMarkdown(text));
        return new Response(JSON.stringify({ segments }), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify({ segments: [{ text: prompt, category: "subject", tooltip: "Full prompt" }] }), { status: 200, headers });
      }
    }

    if (method === "POST" && path === "/api/improve") {
      const { text: inputText } = await request.json() as any;
      if (!inputText) return new Response(JSON.stringify({ result: "", negative_prompt: "" }), { status: 200, headers });

      const sysPrompt = `You are an expert AI prompt engineer. Rewrite the following basic prompt into a richly detailed descriptive prompt optimized for Midjourney and Stable Diffusion. Also generate a negative prompt.

Output with these markers:
---POSITIVE PROMPT---
[enhanced prompt]
---NEGATIVE PROMPT---
[negative prompt]`;

      const { text } = await geminiPost(
        makePayload(sysPrompt, [{ text: inputText }], { temperature: 0.5, topP: 0.9, maxOutputTokens: 800 }),
        apiKey
      );

      const posMatch = text.match(/---POSITIVE PROMPT---\s*([\s\S]*?)(?:---NEGATIVE PROMPT---|$)/);
      const negMatch = text.match(/---NEGATIVE PROMPT---\s*([\s\S]*)/);
      return new Response(JSON.stringify({ result: posMatch ? posMatch[1].trim() : text.trim(), negative_prompt: negMatch ? negMatch[1].trim() : "" }), { status: 200, headers });
    }

    if (method === "POST" && path === "/api/evaluate") {
      const body = await request.json() as any;
      const imageBase64 = body.image;
      const userPrompt = body.user_prompt || "";
      const stats = body.stats || {};
      const mimeType = body.mime_type || "image/png";

      const sysPrompt = `You are an expert prompt engineering instructor scoring a student's attempt.

Reference image stats (verified measurements): brightness=${stats.brightness_class || "mid-key"}, DoF=${stats.dof_class || "moderate"}, shadows=${stats.shadow_hardness || "soft"}, light=${stats.light_direction || "flat"}, contrast=${stats.contrast_ratio || "N/A"}.

Student's prompt attempt: "${userPrompt}"

Score it 1-10. Return ONLY valid JSON (no markdown, no backticks):
{"score": <1-10>, "feedback": "...", "ideal_prompt": "...", "ideal_negative_prompt": "...", "breakdown": [{"element": "...", "detail": "...", "status": "covered|missing|partial|wrong"}]}`;

      const { text } = await geminiPost(
        makePayload(sysPrompt, [{ inline_data: { mime_type: mimeType, data: imageBase64 } }], { temperature: 0.15, topP: 0.85, maxOutputTokens: 2000 }),
        apiKey
      );

      try {
        const data = JSON.parse(stripMarkdown(text));
        return new Response(JSON.stringify({ ...data, stats }), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify({ score: 5, feedback: "Could not parse evaluation", ideal_prompt: "", ideal_negative_prompt: "", breakdown: [], stats }), { status: 200, headers });
      }
    }

    if (method === "POST" && path === "/api/evaluate-similarity") {
      const body = await request.json() as any;
      const targetBase64 = body.target;
      const generatedBase64 = body.generated;
      const cvMetrics = body.cv_metrics || {};
      const mimeType = body.mime_type || "image/png";

      const sysPrompt = `You are an expert prompt alignment audit AI comparing a target image with a generated output.

CV similarity metrics (computed client-side):
- Histogram Correlation: ${cvMetrics.histogram_correlation || "N/A"}
- Brightness Similarity: ${cvMetrics.brightness_similarity || "N/A"}
- Contrast Similarity: ${cvMetrics.contrast_similarity || "N/A"}
- Edge Similarity: ${cvMetrics.edge_similarity || "N/A"}
- Aggregate Physical Score: ${cvMetrics.aggregate_score || "N/A"}%

Return ONLY valid JSON (no markdown, no backticks):
{"similarity_score": <0-100>, "critique": "...", "adjustments": {"add": [...], "remove": [...]}}`;

      const { text } = await geminiPost(
        makePayload(sysPrompt, [
          { inline_data: { mime_type: mimeType, data: targetBase64 } },
          { inline_data: { mime_type: mimeType, data: generatedBase64 } },
        ], { temperature: 0.15, topP: 0.85, maxOutputTokens: 1000 }),
        apiKey
      );

      try {
        const data = JSON.parse(stripMarkdown(text));
        return new Response(JSON.stringify({ ...data, cv_metrics: cvMetrics }), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify({ similarity_score: 50, critique: "Could not analyze similarity", adjustments: { add: [], remove: [] }, cv_metrics: cvMetrics }), { status: 200, headers });
      }
    }

    if (method === "POST" && path === "/api/reprompt/batch") {
      const body = await request.json() as any;
      const items = body.items || [];

      const results = await Promise.all(items.map(async (item: any) => {
        try {
          const stats = item.stats || {};
          const mimeType = item.mime_type || "image/png";
          const sysPrompt = `You are an elite AI image prompt engineer. Reconstruct the exact prompt used to generate this image.

Physical measurements: brightness=${stats.brightness_class || "mid-key"}, DoF=${stats.dof_class || "moderate"}, shadows=${stats.shadow_hardness || "soft"}, light=${stats.light_direction || "flat"}, contrast=${stats.contrast_ratio || "N/A"}.

Output with markers:
---POSITIVE PROMPT---
[prompt]
---NEGATIVE PROMPT---
[negative prompt]`;

          const { text } = await geminiPost(
            makePayload(sysPrompt, [{ inline_data: { mime_type: mimeType, data: item.image } }], { temperature: 0.15, topP: 0.85, maxOutputTokens: 1500 }),
            apiKey
          );

          const posMatch = text.match(/---POSITIVE PROMPT---\s*([\s\S]*?)(?:---NEGATIVE PROMPT---|$)/);
          const negMatch = text.match(/---NEGATIVE PROMPT---\s*([\s\S]*)/);
          return {
            filename: item.filename || "unknown",
            reprompt: posMatch ? posMatch[1].trim() : text.trim(),
            negative_prompt: negMatch ? negMatch[1].trim() : "",
            stats,
            success: true,
          };
        } catch (e: any) {
          return { filename: item.filename || "unknown", error: e.message, success: false };
        }
      }));

      return new Response(JSON.stringify({ results }), { status: 200, headers });
    }

    if (method === "GET" && path === "/api/daily-challenge") {
      const day = parseDailyDate();
      const challenge = DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
      const today = new Date().toISOString().split("T")[0];
      return new Response(JSON.stringify({ id: `${today}-${challenge.id}`, image_url: challenge.image_url, category: challenge.category, difficulty: challenge.difficulty }), { status: 200, headers });
    }

    if (method === "POST" && path === "/api/daily-evaluate") {
      const { challenge_id, user_prompt } = await request.json() as any;
      const day = parseDailyDate();
      const challenge = DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];

      const imageResp = await fetch(challenge.image_url + "?w=1024");
      const imageBuffer = await imageResp.arrayBuffer();
      const base64 = arrayBufferToBase64(imageBuffer);

      const sysPrompt = `You are an expert prompt engineering instructor. The student is describing this daily challenge image.

Category: ${challenge.category}
Difficulty: ${challenge.difficulty}/3

Student's prompt: "${user_prompt}"

Score it 1-10. Return ONLY valid JSON (no markdown):
{"score": <1-10>, "feedback": "...", "ideal_prompt": "...", "ideal_negative_prompt": "...", "breakdown": [{"element": "...", "detail": "...", "status": "covered|missing|partial|wrong"}]}`;

      const { text } = await geminiPost(
        makePayload(sysPrompt, [{ inline_data: { mime_type: "image/jpeg", data: base64 } }], { temperature: 0.15, topP: 0.85, maxOutputTokens: 2000 }),
        apiKey
      );

      try {
        const data = JSON.parse(stripMarkdown(text));
        return new Response(JSON.stringify(data), { status: 200, headers });
      } catch {
        return new Response(JSON.stringify({ score: 5, feedback: "Evaluation failed", ideal_prompt: "", ideal_negative_prompt: "", breakdown: [] }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers });
  }
}
