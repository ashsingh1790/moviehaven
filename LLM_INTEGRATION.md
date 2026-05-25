# LLM Integration Guide for Movie Haven

**Purpose:** Detailed implementation guide for integrating LLMs (Claude, OpenAI, Google) into the recommendation engine (Phase 4).

**Target Audience:** Agents implementing Phase 4 recommendation system.

---

## Table of Contents

1. [Overview](#overview)
2. [LLM Provider Comparison](#llm-provider-comparison)
3. [Implementation Examples](#implementation-examples)
4. [Cost Optimization](#cost-optimization)
5. [Error Handling & Fallbacks](#error-handling--fallbacks)
6. [Performance & Monitoring](#performance--monitoring)
7. [Testing LLM Outputs](#testing-llm-outputs)

---

## Overview

### What We're Building

**Phase 4 Recommendation System:**
1. **ML Backend** — Compute recommendation scores for movies (collaborative + content-based filtering)
2. **LLM Enhancement** — Generate natural language explanations for why each movie is recommended
3. **Display** — Show recommendation + explanation to user on homepage

### LLM's Role

The LLM does **ONE job**: Take a recommendation and explain it in plain English.

**Input:**
```typescript
{
  movieTitle: "Oppenheimer",
  userGenres: ["Sci-Fi", "Drama", "History"],
  userAvgRating: 8.2,
  mlScore: 0.92, // From recommendation engine
  similarMoviesUserLoved: ["Interstellar", "The Imitation Game"]
}
```

**Output:**
```
"We think you'll love this because you rated 8+ other sci-fi dramas, 
and this film combines your love of thought-provoking stories with 
compelling historical narratives."
```

---

## LLM Provider Comparison

### Claude (Anthropic) ✅ RECOMMENDED

**Strengths:**
- ✅ Best explanation quality (more natural, less marketing-speak)
- ✅ **Prompt caching** — Cache user context, save ~90% on repeated calls
- ✅ Fastest response time (2-5s)
- ✅ Official Node.js SDK with full features
- ✅ Streaming support for real-time explanations
- ✅ Better handling of nuanced movie preferences

**Pricing:**
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens
- **Prompt caching:** 90% discount on cached input tokens (after 1024 tokens cached)

**Cost Example (1000 users, 10 recommendations each):**
- Without caching: ~$45/month
- With caching: ~$4.50/month ← **Much cheaper!**

**Best For:** Movie Haven (natural explanations, cost-effective with caching)

---

### OpenAI (GPT-4 / GPT-4 Mini)

**Strengths:**
- ✅ Very fast (~1-2s)
- ✅ Good explanation quality
- ✅ Widely used, lots of examples

**Weaknesses:**
- ❌ No prompt caching (no cost optimization)
- ❌ More expensive without caching ($0.03 / 1K input tokens)
- ❌ Tends toward marketing language in explanations
- ❌ Streaming slower than Claude

**Pricing:**
- GPT-4: $15 / 1M input, $30 / 1M output (expensive)
- GPT-4 Mini: $0.15 / 1M input, $0.60 / 1M output (cheaper, lower quality)

**Cost Example (1000 users, 10 recommendations each):**
- GPT-4 Mini: ~$1.80/month (cheaper, but lower quality)
- GPT-4: ~$15/month (better quality, expensive)

---

### Google Gemini

**Strengths:**
- ✅ Very cheap ($0.075 / 1M input tokens)
- ✅ Fast
- ✅ Good for creative writing

**Weaknesses:**
- ❌ Lower quality explanations (sometimes generic)
- ❌ Caching support is newer, less mature
- ❌ SDK less polished than Anthropic/OpenAI
- ❌ Rate limits lower

**Pricing:**
- $0.075 / 1M input, $0.30 / 1M output

**Cost Example (1000 users, 10 recommendations each):**
- ~$0.90/month (cheapest, but quality varies)

---

## Recommendation: **Use Claude with Prompt Caching**

| Metric | Claude | OpenAI | Gemini |
|--------|--------|--------|--------|
| **Quality** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost** | ⭐⭐⭐⭐⭐ (with caching) | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Node.js Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Caching** | ✅ Yes | ❌ No | ✅ Newer |

**Verdict:** Claude with prompt caching gives best ROI for Movie Haven.

---

## Implementation Examples

### Setup: Install Dependencies

```bash
npm install @anthropic-ai/sdk dotenv
```

**Environment variables** (`.env`):
```
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=claude  # or openai, gemini
OPENAI_API_KEY=sk-...  # if using OpenAI
GOOGLE_API_KEY=...  # if using Gemini
```

---

### Example 1: Basic LLM Call (No Caching)

```typescript
// apps/api/src/lib/llm.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RecommendationInput {
  movieTitle: string;
  movieYear: number;
  userGenres: string[];
  userAvgRating: number;
  similarMoviesUserLoved: string[];
}

/**
 * Generate a natural language explanation for why a movie is recommended.
 * Without caching — suitable for one-off explanations.
 */
export async function generateRecommendationExplanation(
  input: RecommendationInput
): Promise<string> {
  const prompt = `
User Profile:
- Favorite genres: ${input.userGenres.join(", ")}
- Average movie rating: ${input.userAvgRating}/10
- Recently loved: ${input.similarMoviesUserLoved.join(", ")}

Recommended Movie:
- Title: ${input.movieTitle} (${input.movieYear})

Task: Explain in 1-2 sentences why this user would love this movie.
Be specific about genres/themes, not generic.

Example good explanation: "We think you'll love this because you rated 8+ other sci-fi films highly, and this combines your love of mind-bending plots with great character development."

Example bad explanation: "This is a great movie you'll enjoy."
`;

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  if (message.content[0].type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  return message.content[0].text;
}
```

**Usage in tRPC:**
```typescript
// apps/api/src/trpc/routers/recommendations.ts

export const recommendationsRouter = router({
  getWithExplanations: protectedProcedure.query(async ({ ctx }) => {
    // 1. Get ML recommendations from your recommendation engine
    const mlRecommendations = await ctx.db.query.recommendations.findMany({
      where: eq(recommendations.userId, ctx.userId),
      limit: 10,
      orderBy: desc(recommendations.score),
    });

    // 2. Generate explanations for top 5 (don't overload user)
    const withExplanations = await Promise.all(
      mlRecommendations.slice(0, 5).map(async (rec) => {
        const movie = await ctx.db.query.films.findFirst({
          where: eq(films.id, rec.filmId),
        });

        const userGenres = await ctx.db
          .selectDistinct({ genre: films.genres })
          .from(films)
          .where(
            inArray(
              films.id,
              ctx.db
                .select({ filmId: ratings.filmId })
                .from(ratings)
                .where(eq(ratings.userId, ctx.userId))
            )
          );

        const explanation = await generateRecommendationExplanation({
          movieTitle: movie!.title,
          movieYear: movie!.releaseYear || 0,
          userGenres: userGenres.map((g) => g.genre),
          userAvgRating: 7.5, // Calculate from actual ratings
          similarMoviesUserLoved: ["Interstellar", "The Imitation Game"],
        });

        return {
          ...rec,
          movie,
          explanation,
        };
      })
    );

    return withExplanations;
  }),
});
```

---

### Example 2: Prompt Caching (Cost-Effective) ⭐

**This is the recommended approach for Movie Haven.**

```typescript
// apps/api/src/lib/llm-cached.ts

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CachedRecommendationInput {
  movieTitle: string;
  movieYear: number;
  userProfile: {
    id: string;
    genres: string[];
    avgRating: number;
    favoriteDecades: number[];
    topActors: string[];
    topDirectors: string[];
  };
}

/**
 * Generate explanations WITH prompt caching.
 * 
 * How it works:
 * 1. First call: User profile is sent + cached (costs full tokens)
 * 2. Next calls: User profile is cached (costs 10% of tokens for cached part)
 * 3. After 5 minutes without use: Cache expires, costs full again
 * 
 * Savings: For 10 recommendations, you save ~80% on input tokens!
 */
export async function generateExplanationsWithCaching(
  inputs: CachedRecommendationInput[]
): Promise<string[]> {
  if (inputs.length === 0) return [];

  // Build system prompt with caching
  const systemPrompt = [
    {
      type: "text" as const,
      text: "You are a movie recommendation expert. Explain in 1-2 sentences why a user would love a movie. Be specific about genres, themes, and the user's past preferences. Avoid generic language.",
    },
    {
      type: "text" as const,
      text: `User Profile:
- ID: ${inputs[0].userProfile.id}
- Favorite genres: ${inputs[0].userProfile.genres.join(", ")}
- Average rating: ${inputs[0].userProfile.avgRating}/10
- Favorite decades: ${inputs[0].userProfile.favoriteDecades.join(", ")}
- Favorite actors: ${inputs[0].userProfile.topActors.join(", ")}
- Favorite directors: ${inputs[0].userProfile.topDirectors.join(", ")}

This user context is cached for cost savings.`,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  // Generate explanation for each movie (reuses cached user profile)
  const explanations = await Promise.all(
    inputs.map((input) =>
      client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 150,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Movie: "${input.movieTitle}" (${input.movieYear})`,
          },
        ],
      })
    )
  );

  return explanations.map((msg) => {
    if (msg.content[0].type !== "text") {
      throw new Error("Unexpected response type");
    }
    return msg.content[0].text;
  });
}
```

**Cost Breakdown (with caching):**

```
First call (5 recommendations):
- User context: 1000 tokens (input, cached)
- Movie 1 query: 50 tokens (input)
- Total input: 1050 tokens
- Cost: 1050 * $3 / 1M = $0.003

Second batch (5 more recommendations, same user):
- User context: 100 tokens (cached, 10% cost)
- Movie queries: 250 tokens
- Total input: 350 tokens
- Cost: 350 * $3 / 1M = $0.001

Savings: 70% cheaper! 🎉
```

---

### Example 3: Streaming Responses (Real-Time Explanations)

```typescript
// Stream explanation back to client in real-time
// Useful for premium users who want to see explanation appear

export async function* streamRecommendationExplanation(
  input: RecommendationInput
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Explain why ${input.movieTitle} is recommended...`,
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text; // Send each token as it arrives
    }
  }
}

// Usage in tRPC (streaming):
export const recommendationsRouter = router({
  streamExplanation: publicProcedure
    .input(z.object({ movieTitle: z.string() }))
    .query(async function* ({ input }) {
      for await (const chunk of streamRecommendationExplanation({
        movieTitle: input.movieTitle,
        // ... other fields
      })) {
        yield chunk;
      }
    }),
});
```

---

### Example 4: Multi-Provider Support (Test All 3)

```typescript
// apps/api/src/lib/llm-multi.ts

type LLMProvider = "claude" | "openai" | "gemini";

export async function generateExplanation(
  input: RecommendationInput,
  provider: LLMProvider = "claude"
): Promise<string> {
  switch (provider) {
    case "claude":
      return generateClaudeExplanation(input);
    case "openai":
      return generateOpenAIExplanation(input);
    case "gemini":
      return generateGeminiExplanation(input);
  }
}

// Claude implementation (already shown above)
async function generateClaudeExplanation(
  input: RecommendationInput
): Promise<string> {
  // ... uses claude client
}

// OpenAI implementation
async function generateOpenAIExplanation(
  input: RecommendationInput
): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const message = await openai.chat.completions.create({
    model: "gpt-4-mini", // or gpt-4 for higher quality
    max_tokens: 150,
    messages: [
      {
        role: "system",
        content:
          "You are a movie recommendation expert. Explain in 1-2 sentences why a user would love this movie.",
      },
      {
        role: "user",
        content: `User loves: ${input.userGenres.join(", ")}. Recommend: ${input.movieTitle}`,
      },
    ],
  });

  return message.choices[0].message.content || "";
}

// Google Gemini implementation
async function generateGeminiExplanation(
  input: RecommendationInput
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `User loves: ${input.userGenres.join(", ")}. Explain why they'd love: ${input.movieTitle}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

---

## Cost Optimization

### Strategy 1: Cache User Profiles

```typescript
// Cache user profile for 5 minutes
// Next 5 calls: use cached context (90% cost reduction)

const userContext = `User Profile:
- ID: ${userId}
- Genres: [cached]
- Ratings: [cached]
...`;

// First call to Claude: Full cost
// Calls 2-5: Only 10% cost for this context
```

### Strategy 2: Batch Explanations

```typescript
// Generate 5-10 explanations in one go
// Reuse the same system prompt (cached)
// Cost: ~$0.01 per user per day

const explanations = await generateExplanationsWithCaching(
  topRecommendations.map((rec) => ({
    movieTitle: rec.title,
    userProfile: userProfile, // Reused, cached
  }))
);
```

### Strategy 3: Lazy Load Explanations

```typescript
// Don't generate all explanations upfront
// Generate on-demand when user clicks "Why this movie?"
// Save cost for users who don't click

// Endpoint: GET /recommendations/:movieId/explanation
// Only called when user is curious
```

### Strategy 4: Use Cheaper Model for High-Volume

```typescript
// Phase 4: Use Sonnet (cheaper, good quality)
// Future: Upgrade to Opus for power users (premium)

const model = userTier === "premium" 
  ? "claude-3-opus-20250219"  // Best quality
  : "claude-3-5-sonnet-20241022"; // Good quality, cheaper
```

---

## Error Handling & Fallbacks

```typescript
// apps/api/src/lib/llm-safe.ts

export async function generateExplanationSafe(
  input: RecommendationInput
): Promise<string> {
  try {
    return await generateRecommendationExplanation(input);
  } catch (error) {
    // Log error for monitoring
    console.error("LLM call failed:", error);

    // Fallback 1: Return generic explanation
    if (error instanceof Error && error.message.includes("rate_limit")) {
      return `We recommend "${input.movieTitle}" based on your taste in ${input.userGenres[0]} films.`;
    }

    // Fallback 2: Return explanation from cached template
    if (error instanceof Error && error.message.includes("timeout")) {
      return `"${input.movieTitle}" matches your interest in ${input.userGenres.join(" and ")}.`;
    }

    // Fallback 3: No explanation at all (show just the movie)
    console.error("Could not generate explanation:", error);
    return ""; // Show movie without explanation
  }
}
```

**Retry Logic:**
```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export async function generateExplanationWithRetry(
  input: RecommendationInput,
  retries = 0
): Promise<string> {
  try {
    return await generateRecommendationExplanation(input);
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return generateExplanationWithRetry(input, retries + 1);
    }
    return generateExplanationSafe(input); // Fallback
  }
}
```

---

## Performance & Monitoring

### Monitor LLM Costs

```typescript
// apps/api/src/lib/llm-metrics.ts

interface LLMMetrics {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
}

export function calculateMetrics(response: Anthropic.Message): LLMMetrics {
  const usage = response.usage;
  const inputCost =
    (usage.input_tokens * 3) / 1_000_000;
  const cacheReadCost =
    ((usage.cache_read_input_tokens || 0) * 0.3) / 1_000_000; // 90% discount
  const outputCost =
    (usage.output_tokens * 15) / 1_000_000;

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    totalCost: inputCost + cacheReadCost + outputCost,
  };
}

// Log metrics for monitoring
export async function generateWithMetrics(
  input: RecommendationInput
): Promise<{ explanation: string; metrics: LLMMetrics }> {
  const response = await client.messages.create({
    // ... message creation
  });

  const metrics = calculateMetrics(response);

  // Send to monitoring service (Sentry, DataDog, etc.)
  console.log("LLM metrics:", {
    tokens: metrics.inputTokens + metrics.outputTokens,
    cost: metrics.totalCost,
    cacheHit: metrics.cacheReadTokens > 0,
  });

  return {
    explanation: response.content[0].type === "text" ? response.content[0].text : "",
    metrics,
  };
}
```

### Latency Targets

```typescript
// apps/api/src/middleware/llm-timeout.ts

const LLM_TIMEOUT_MS = 5000; // 5 seconds
const ACCEPTABLE_LATENCY_MS = 2000; // Log if slower

async function generateWithTimeout(
  input: RecommendationInput
): Promise<string> {
  const start = Date.now();

  try {
    const result = await Promise.race([
      generateRecommendationExplanation(input),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("LLM timeout")),
          LLM_TIMEOUT_MS
        )
      ),
    ]);

    const latency = Date.now() - start;
    if (latency > ACCEPTABLE_LATENCY_MS) {
      console.warn(`Slow LLM response: ${latency}ms`);
    }

    return result;
  } catch (error) {
    return ""; // Fallback to no explanation
  }
}
```

---

## Testing LLM Outputs

### Unit Test (Mock LLM Responses)

```typescript
// apps/api/src/trpc/routers/__tests__/recommendations.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";

describe("LLM Explanations", () => {
  beforeEach(() => {
    // Mock Anthropic client
    vi.mock("@anthropic-ai/sdk", () => ({
      default: vi.fn(() => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: "text",
                text: "We think you'll love this sci-fi classic.",
              },
            ],
          }),
        },
      })),
    }));
  });

  it("should generate explanation with user context", async () => {
    const result = await generateRecommendationExplanation({
      movieTitle: "Interstellar",
      movieYear: 2014,
      userGenres: ["Sci-Fi", "Drama"],
      userAvgRating: 8.5,
      similarMoviesUserLoved: ["The Martian"],
    });

    expect(result).toContain("sci-fi");
    expect(result.length).toBeLessThan(200);
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(client.messages.create).mockRejectedValueOnce(
      new Error("API error")
    );

    const result = await generateExplanationSafe({
      /* ... */
    });

    expect(result).toBeDefined(); // Fallback returned
  });
});
```

### Quality Test (Human Review)

```typescript
// Manually evaluate LLM outputs for Phase 4

// ✅ GOOD explanation:
// "We think you'll love this because you rated 8+ other sci-fi films 
//  highly, and this combines mind-bending plots with great character 
//  development—both your favorites."

// ❌ BAD explanation:
// "This is a great movie that you will enjoy."
// "This movie is recommended for fans of movies."

// Quality checklist:
// [ ] Mentions specific genres/themes user loves
// [ ] References user's past ratings or favorite movies
// [ ] Explains WHY (not just THAT)
// [ ] Avoids generic marketing language
// [ ] Under 2 sentences
// [ ] No spelling/grammar errors
```

---

## Implementation Checklist for Phase 4

- [ ] Choose LLM provider (Claude recommended)
- [ ] Set up API key in `.env`
- [ ] Implement basic explanation generation (Example 1)
- [ ] Add prompt caching for cost savings (Example 2)
- [ ] Set up error handling & fallbacks
- [ ] Implement cost monitoring & metrics
- [ ] Add latency monitoring
- [ ] Test with real user data
- [ ] Evaluate explanation quality (manual review)
- [ ] Optimize prompts for better output
- [ ] Deploy to production
- [ ] Monitor costs weekly

---

## FAQ

**Q: What if LLM API is down?**
A: Fallback to no explanation or generic message (see Error Handling section).

**Q: How many tokens does one explanation use?**
A: ~100-200 tokens (input + output). With caching: ~20-50 tokens per additional recommendation.

**Q: Can I switch providers later?**
A: Yes! Use the multi-provider example (Example 4) to abstract the provider.

**Q: Should I cache all user data?**
A: Yes, especially user profile. It's usually the largest part (~1000 tokens).

**Q: What's the latency of LLM responses?**
A: Claude: 2-5s, OpenAI: 1-3s, Gemini: 1-4s. Plan for ~5s worst-case.

**Q: Can I use LLM for other features?**
A: Yes! You could use it for:
- Analyzing user reviews (sentiment)
- Generating watchlist descriptions
- Summarizing movie plots
- Personalized homepage copy

---

**Last Updated:** May 25, 2026  
**Next:** Implement in Phase 4 (Week 8-10)
