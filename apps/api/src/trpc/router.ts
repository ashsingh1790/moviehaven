import { router } from "./init";
import { filmsRouter } from "./routers/films";
import { listsRouter } from "./routers/lists";
import { usersRouter } from "./routers/users";
import { tmdbRouter } from "./routers/tmdb";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  auth: authRouter,
  films: filmsRouter,
  users: usersRouter,
  lists: listsRouter,
  tmdb: tmdbRouter,
});

export type AppRouter = typeof appRouter;
