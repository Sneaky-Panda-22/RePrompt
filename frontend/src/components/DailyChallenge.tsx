import { useState, useEffect } from "react";
import { Calendar, Check, Copy, Flame, HelpCircle, Trophy } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";

interface DailyChallengeProps {
  showToast: (msg: string, type: "success" | "error") => void;
}

interface ChallengeData {
  id: string;
  image_url: string;
  category: string;
  difficulty: number;
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
  breakdown: BreakdownItem[];
}

interface PastChallengeItem {
  id: string;
  image_url: string;
  category: string;
  score: number;
  feedback?: string;
  ideal_prompt?: string;
  breakdown?: BreakdownItem[];
}

export default function DailyChallenge({ showToast }: DailyChallengeProps) {
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [streakCount, setStreakCount] = useState(0);
  const [pastChallenges, setPastChallenges] = useState<PastChallengeItem[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    // Load daily challenge metadata
    loadDailyChallenge();
    // Load streak from local storage
    const streak = JSON.parse(localStorage.getItem("daily_streak") || '{"count":0,"lastDate":""}');
    setStreakCount(streak.count || 0);
  }, []);

  const loadDailyChallenge = async () => {
    try {
      const resp = await fetch("/api/daily-challenge");
      if (!resp.ok) throw new Error("Failed to load daily challenge");
      const data = (await resp.json()) as ChallengeData;
      setChallenge(data);

      // Check if already submitted today
      const past = JSON.parse(localStorage.getItem("daily_past") || "[]") as PastChallengeItem[];
      setPastChallenges(past);

      const todayResult = past.find((c) => c.id === data.id);
      if (todayResult) {
        setAlreadySubmitted(true);
        setResult({
          score: todayResult.score,
          feedback: todayResult.feedback || "Already submitted today!",
          ideal_prompt: todayResult.ideal_prompt || "",
          breakdown: todayResult.breakdown || [],
        });
      }
    } catch (e) {
      console.error(e);
      showToast("Could not retrieve daily challenge data", "error");
    }
  };

  const handleEvaluateSubmit = async () => {
    if (!challenge) return;
    if (!userPrompt.trim()) {
      showToast("Please write a prompt first", "error");
      return;
    }

    setIsLoading(true);

    try {
      const resp = await fetch("/api/daily-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challenge.id, user_prompt: userPrompt }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Scoring process failed");
      }

      const data = (await resp.json()) as EvaluationResponse;
      setResult(data);
      setAlreadySubmitted(true);

      // Save to past challenges
      let past = JSON.parse(localStorage.getItem("daily_past") || "[]") as PastChallengeItem[];
      const exists = past.find((item) => item.id === challenge.id);
      if (!exists) {
        past = [
          {
            id: challenge.id,
            image_url: challenge.image_url,
            category: challenge.category,
            score: data.score,
            feedback: data.feedback,
            ideal_prompt: data.ideal_prompt,
            breakdown: data.breakdown,
          },
          ...past,
        ].slice(0, 14); // Keep last 14 entries
        localStorage.setItem("daily_past", JSON.stringify(past));
        setPastChallenges(past);
      }

      // Update streaks
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      let streak = JSON.parse(localStorage.getItem("daily_streak") || '{"count":0,"lastDate":""}');

      if (streak.lastDate === yesterday) {
        streak.count += 1;
      } else if (streak.lastDate !== today) {
        streak.count = 1;
      }
      streak.lastDate = today;
      localStorage.setItem("daily_streak", JSON.stringify(streak));
      setStreakCount(streak.count);

      showToast(`Daily challenge completed! Scored: ${data.score}/10`, "success");
    } catch (e: any) {
      showToast(e.message || "Failed to process evaluation", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyPromptText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      showToast("Ideal prompt copied!", "success");
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-outfit font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Daily Matching Challenge
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
            Study the daily photograph, analyze its composition, and write a matching prompt.
          </p>
        </div>

        {/* Streak Indicator Widget */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 self-start md:self-auto flex-shrink-0">
          <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
          <div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block tracking-tight -mb-0.5">
              {streakCount} Day Streak
            </span>
            <span className="text-[9px] text-amber-600 dark:text-amber-500 font-mono">
              DAILY ACTIVE AUDIT
            </span>
          </div>
        </div>
      </div>

      {challenge ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Daily Image Photograph */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 overflow-hidden shadow-sm">
              <CardContent className="pt-6 space-y-5">
                {/* Visual Header Metrics */}
                <div className="flex justify-between items-center text-xs font-semibold text-zinc-400">
                  <div className="flex gap-1.5 items-center">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>DAILY BLUEPRINT</span>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-[10px]">
                    ID: {challenge.id}
                  </span>
                </div>

                {/* Challenge Target Image */}
                <div className="relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50">
                  <img
                    src={challenge.image_url}
                    alt="Daily Target photograph"
                    className="w-full max-h-64 object-contain mx-auto"
                  />
                </div>

                {/* Tags Info */}
                <div className="flex gap-3">
                  <div className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                    <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                      Subject Type
                    </span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 block capitalize">
                      {challenge.category}
                    </span>
                  </div>
                  <div className="flex-1 p-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/50 dark:border-zinc-800/30">
                    <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                      Optics Complexity
                    </span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-0.5 block tracking-wide">
                      {"⭐".repeat(challenge.difficulty)}
                    </span>
                  </div>
                </div>

                {/* Prompt Writing area (if not submitted) */}
                {!alreadySubmitted && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                      Write your prompt description
                    </label>
                    <Textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="Audit compositional elements (Subject, Lighting, Camera, Style) and input here..."
                      className="min-h-32 resize-y text-sm font-sans"
                    />
                    <Button
                      onClick={handleEvaluateSubmit}
                      disabled={isLoading}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-sm font-semibold h-10 gap-2 mt-4"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Evaluating prompt blueprint...
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4" />
                          Submit to Daily Contest
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Score Panel / Evaluations */}
          <div className="lg:col-span-7">
            {isLoading && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm animate-pulse h-full">
                <CardContent className="py-24 flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-mono font-medium text-zinc-500">
                    RUNNING COMPUTATIONAL ACCURACY SCORE AND VECTOR CALCULATION...
                  </span>
                </CardContent>
              </Card>
            )}

            {!isLoading && !result && (
              <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm h-full">
                <CardContent className="py-28 text-center flex flex-col items-center justify-center space-y-3">
                  <HelpCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 animate-bounce" />
                  <span className="text-sm font-semibold text-zinc-400">
                    Submit your daily prompt to receive detailed grading parameters.
                  </span>
                </CardContent>
              </Card>
            )}

            {!isLoading && result && (
              <div className="space-y-6 animate-slide-up">
                {/* Result Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <CardTitle className="text-base font-semibold">Challenge Results</CardTitle>
                      <CardDescription>Performance accuracy of your prompt against the master photograph.</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-3xl font-outfit font-extrabold text-zinc-950 dark:text-white">
                        {result.score}
                      </span>
                      <span className="text-sm text-zinc-400 font-medium">/ 10</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 space-y-5">
                    {/* General Review */}
                    <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/30">
                      <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Evaluation Review
                      </span>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                        {result.feedback}
                      </p>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2">
                      <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                        Extracted Breakdown Match
                      </span>
                      {renderBreakdownList(result.breakdown)}
                    </div>

                    {/* Ideal Blueprint Prompt */}
                    <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] block font-semibold text-zinc-400 uppercase tracking-wider">
                          Contest Winning Ideal Blueprint Prompt
                        </span>
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-6 gap-1 text-[10px] font-semibold text-indigo-600"
                          onClick={() => copyPromptText(result.ideal_prompt)}
                        >
                          {copySuccess ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          Copy
                        </Button>
                      </div>
                      <p className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg text-xs font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-800/30">
                        {result.ideal_prompt}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 shadow-sm animate-pulse">
          <CardContent className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-sm font-mono text-zinc-500">RETRIEVING LATEST DAILY TARGET MODEL...</span>
          </CardContent>
        </Card>
      )}

      {/* Past Daily Challenges grid */}
      {pastChallenges.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-zinc-200 dark:border-zinc-800 animate-slide-up">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Past Challenges Submissions</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Audit your last two weeks of daily prompt submissions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {pastChallenges.map((c, idx) => (
              <div
                key={idx}
                className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-950/20 shadow-sm flex flex-col"
              >
                <div className="w-full h-28 bg-zinc-100 dark:bg-zinc-900">
                  <img src={c.image_url} alt={c.category} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 block capitalize">
                      {c.category}
                    </span>
                    <span className="text-[8px] text-zinc-400 font-mono mt-0.5 block">{c.id}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-zinc-200 dark:border-zinc-800">
                    {c.score}/10 {c.score >= 8 ? "🏆" : "✅"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
