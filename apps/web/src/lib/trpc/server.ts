import type { AppRouter } from "@movie-haven/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const serverTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/trpc`,
      transformer: SuperJSON,
    }),
  ],
});
