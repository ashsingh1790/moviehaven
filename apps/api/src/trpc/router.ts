import { router } from "./init";
import { authRouter } from "./routers/auth";
import { exportRouter } from "./routers/export";
import { filmsRouter } from "./routers/films";
import { listsRouter } from "./routers/lists";
import { tmdbRouter } from "./routers/tmdb";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  auth: authRouter,
  films: filmsRouter,
  users: usersRouter,
  lists: listsRouter,
  tmdb: tmdbRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
