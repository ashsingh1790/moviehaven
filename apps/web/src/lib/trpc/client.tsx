"use client";

import type { AppRouter } from "@movie-haven/api";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();
