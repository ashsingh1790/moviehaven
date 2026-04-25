import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@movie-haven/ui";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AuthProvider, type AuthUser } from "@/contexts/auth-context";
import { getSession } from "@/lib/auth";
import { serverTrpc } from "@/lib/trpc/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Movie Haven",
    template: "%s | Movie Haven",
  },
  description:
    "Discover, rate, and track films with country-of-origin filtering and multi-sort — the IMDb alternative built for power users.",
};

async function resolveInitialUser(): Promise<AuthUser | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const user = await serverTrpc.auth.me.query();
    return user;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await resolveInitialUser();

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <NuqsAdapter>
          <AuthProvider initialUser={initialUser}>
            <TRPCProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </TRPCProvider>
          </AuthProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
