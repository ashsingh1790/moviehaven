import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { users } from "@movie-haven/db";
import { publicProcedure, protectedProcedure, router } from "../init";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signToken } from "../../lib/jwt";
import { generateUsername, suggestUsernames } from "../../lib/username-generator";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username too long")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores");

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email"),
        password: passwordSchema,
        username: usernameSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.email.toLowerCase().trim();

      // Check email uniqueness
      const existingEmail = await ctx.db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
        columns: { id: true },
      });
      if (existingEmail) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      // Check username uniqueness
      if (input.username) {
        const existingUsername = await ctx.db.query.users.findFirst({
          where: eq(users.username, input.username),
          columns: { id: true },
        });
        if (existingUsername) {
          throw new TRPCError({ code: "CONFLICT", message: "Username already taken" });
        }
      }

      const passwordHash = await hashPassword(input.password);

      const [user] = await ctx.db
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          username: input.username ?? null,
        })
        .returning({
          id: users.id,
          email: users.email,
          username: users.username,
          createdAt: users.createdAt,
        });

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const token = await signToken({ userId: user.id, email: user.email });

      return { user, token };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedEmail = input.email.toLowerCase().trim();

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });

      // Constant-time failure — always compare even when user not found
      const dummyHash = "$2a$12$dummy.hash.to.prevent.timing.attacks.padding";
      const passwordOk = user
        ? await verifyPassword(input.password, user.passwordHash)
        : await verifyPassword(input.password, dummyHash).then(() => false);

      if (!user || !passwordOk) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const token = await signToken({ userId: user.id, email: user.email });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        token,
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
      columns: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return user;
  }),

  checkUsername: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.username, input.username),
        columns: { id: true },
      });
      return { available: !existing };
    }),

  generateUsername: publicProcedure.query(() => {
    return { username: generateUsername() };
  }),

  suggestUsernames: publicProcedure
    .input(z.object({ input: z.string() }))
    .query(({ input }) => {
      return { suggestions: suggestUsernames(input.input) };
    }),
});
