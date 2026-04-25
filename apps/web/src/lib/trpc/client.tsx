"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@movie-haven/api";

export const trpc = createTRPCReact<AppRouter>();
