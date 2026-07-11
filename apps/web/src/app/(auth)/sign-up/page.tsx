"use client";

import { useAuth } from "@/contexts/auth-context";
import { Check, Eye, EyeOff, Film, Loader2, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function SignUpPage() {
  // useSearchParams() requires a Suspense boundary during prerendering.
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generatingName, setGeneratingName] = useState(false);

  const debouncedUsername = useDebounce(username, 400);

  // Real-time username check
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(
      `${apiBase}/trpc/auth.checkUsername?input=${encodeURIComponent(JSON.stringify({ "0": { username: debouncedUsername } }))}`,
    )
      .then(r => r.json())
      .then(data => {
        const available = data?.[0]?.result?.data?.json?.available;
        setUsernameStatus(available ? "available" : "taken");
      })
      .catch(() => setUsernameStatus("idle"));
  }, [debouncedUsername]);

  // Suggestions when typing
  useEffect(() => {
    if (!debouncedUsername) {
      setSuggestions([]);
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(
      `${apiBase}/trpc/auth.suggestUsernames?input=${encodeURIComponent(JSON.stringify({ "0": { input: debouncedUsername } }))}`,
    )
      .then(r => r.json())
      .then(data => {
        const s = data?.[0]?.result?.data?.json?.suggestions;
        if (Array.isArray(s)) setSuggestions(s);
      })
      .catch(() => {});
  }, [debouncedUsername]);

  async function generateUsername() {
    setGeneratingName(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(
        `${apiBase}/trpc/auth.generateUsername?input=${encodeURIComponent(JSON.stringify({ "0": {} }))}`,
      );
      const data = await res.json();
      const generated = data?.[0]?.result?.data?.json?.username;
      if (generated) setUsername(generated);
    } catch {}
    setGeneratingName(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username: username || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }

      setUser(data.user);
      const next = searchParams.get("next") ?? "/films";
      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Film className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground">Join Movie Haven — it's free</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground transition-colors"
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-input px-3 py-2 pr-10 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground transition-colors"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score
                          ? passwordStrength.score <= 1
                            ? "bg-red-500"
                            : passwordStrength.score <= 2
                              ? "bg-amber-500"
                              : passwordStrength.score <= 3
                                ? "bg-yellow-400"
                                : "bg-green-500"
                          : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="username">
                Username <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <button
                type="button"
                onClick={generateUsername}
                disabled={generatingName}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${generatingName ? "animate-spin" : ""}`} />
                Generate
              </button>
            </div>
            <div className="relative">
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                className={`w-full rounded-md border bg-input px-3 py-2 pr-8 text-sm outline-none placeholder:text-muted-foreground transition-colors ${
                  usernameStatus === "available"
                    ? "border-green-500/60 focus:border-green-500"
                    : usernameStatus === "taken"
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-border focus:border-primary/60"
                }`}
                placeholder="CrimsonAuteur"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                {usernameStatus === "taken" && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>

            {/* Status message */}
            {usernameStatus === "taken" && <p className="text-xs text-red-500">Username taken</p>}
            {usernameStatus === "available" && (
              <p className="text-xs text-green-500">Username available</p>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && username && usernameStatus !== "available" && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUsername(s)}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary hover:bg-primary/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || usernameStatus === "taken"}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] ?? "" };
}
