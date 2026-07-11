import { getSession } from "@/lib/auth";
import { serverTrpc } from "@/lib/trpc/server";
import { ChevronRight, Film, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

// TMDb genre ID → label (most common genres)
const GENRE_LABELS: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const GRADIENTS = [
  "from-violet-900 to-purple-700",
  "from-blue-900 to-indigo-700",
  "from-emerald-900 to-green-700",
  "from-rose-900 to-red-700",
  "from-amber-900 to-yellow-700",
  "from-cyan-900 to-teal-700",
  "from-slate-900 to-zinc-700",
  "from-orange-900 to-amber-700",
  "from-pink-900 to-rose-700",
  "from-indigo-900 to-blue-700",
];

async function PopularMoviesSection() {
  let movies: Awaited<ReturnType<typeof serverTrpc.tmdb.popularMovies.query>>;
  try {
    movies = await serverTrpc.tmdb.popularMovies.query({ limit: 10 });
  } catch {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Could not load popular films right now.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
      {movies.map((film, i) => {
        const genre = film.genreIds[0] ? (GENRE_LABELS[film.genreIds[0]] ?? null) : null;
        const gradient = GRADIENTS[i % GRADIENTS.length] ?? "from-violet-900 to-purple-700";
        return (
          <Link
            key={film.tmdbId}
            href="/films"
            className="group snap-start shrink-0 w-[140px] sm:w-[160px] focus:outline-none"
          >
            {/* Poster */}
            <div
              className={`relative aspect-[2/3] rounded-lg overflow-hidden border border-white/10 group-hover:border-primary/40 transition-all group-hover:scale-[1.02] bg-gradient-to-b ${gradient}`}
            >
              {film.posterUrl && (
                <Image
                  src={film.posterUrl}
                  alt={film.title}
                  fill
                  sizes="(max-width: 640px) 140px, 160px"
                  className="object-cover"
                />
              )}

              {/* Rank badge */}
              <div className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white backdrop-blur-sm z-10">
                {i + 1}
              </div>

              {/* Genre tag */}
              {genre && (
                <div className="absolute bottom-2 left-2 right-2 z-10">
                  <span className="inline-block rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
                    {genre}
                  </span>
                </div>
              )}
            </div>

            {/* Info below poster */}
            <div className="mt-2 space-y-0.5 px-0.5">
              <p className="text-sm font-medium leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {film.title}
              </p>
              <p className="text-xs text-muted-foreground">
                ★ {film.tmdbScore.toFixed(1)} · {film.releaseYear}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const POPULAR_MOVIES_SKELETON_IDS = Array.from({ length: 10 }, () => crypto.randomUUID());

function PopularMoviesSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {POPULAR_MOVIES_SKELETON_IDS.map(id => (
        <div key={id} className="shrink-0 w-[140px] sm:w-[160px]">
          <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
          <div className="mt-2 space-y-1.5 px-0.5">
            <div className="h-3 rounded bg-muted animate-pulse" />
            <div className="h-3 rounded bg-muted animate-pulse w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const session = await getSession();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-semibold">
            <Film className="h-5 w-5 text-primary" />
            <span className="text-primary">Movie Haven</span>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <Link
                href="/films"
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Browse films
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-14">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[500px] w-[700px] rounded-full bg-primary/5 blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              IMDb done right
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Discover films <span className="text-primary">the way you</span>
              <br />
              think about them
            </h1>

            <p className="mx-auto max-w-xl text-base text-muted-foreground leading-relaxed">
              Filter by country of origin. Sort by multiple fields at once. Rate and track every
              film you've seen.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/films"
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <Play className="h-4 w-4" />
                Browse all films
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!session && (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-7 py-3 text-sm font-semibold hover:bg-accent hover:border-primary/30 transition-all"
                >
                  Create free account
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Popular movies section */}
        <section className="pb-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Popular in Cinemas</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Trending this week · Powered by TMDb
                </p>
              </div>
              <Link
                href="/films"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Browse all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <Suspense fallback={<PopularMoviesSkeleton />}>
              <PopularMoviesSection />
            </Suspense>
          </div>
        </section>

        {/* CTA strip */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-6 py-20 text-center space-y-5">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to find your next film?</h2>
            <p className="text-muted-foreground text-sm">
              Filter by country · Sort by multiple fields · Rate every film you watch
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/films"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" />
                Start browsing
              </Link>
              {!session && (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center rounded-lg border border-border bg-secondary px-7 py-3 text-sm font-semibold hover:bg-accent transition-colors"
                >
                  Create free account
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-primary" />
            <span>Movie Haven</span>
          </div>
          <span>Not affiliated with IMDb.</span>
        </div>
      </footer>
    </div>
  );
}
