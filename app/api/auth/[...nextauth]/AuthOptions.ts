import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/prisma/client";
import { z } from "zod";

export const AuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith@example.com" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials) return null;

        try {
          // Input validation
          const schema = z.object({
            email: z.string().email(),
            password: z.string().min(8),
          });

          const parsed = schema.safeParse(credentials);
          if (!parsed.success) {
            throw new Error("Invalid input");
          }

          const { email, password } = parsed.data;

          // Convert email to lowercase for case-insensitive comparison
          const normalizedEmail = email.toLowerCase();

          // Fetch user with timeout protection (20 seconds for MongoDB cold starts)
          const user = await Promise.race([
            prisma.user.findUnique({
              where: { email: normalizedEmail },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                password: true,
                failedAttempts: true,
                lockoutUntil: true,
              },
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Database timeout")), 20000)
            ),
          ]) as any;

          if (!user) {
            throw new Error("Invalid email or password");
          }

          const currentTime = new Date();

          // Lockout mechanism
          if (user.lockoutUntil && currentTime < user.lockoutUntil) {
            throw new Error(
              `Account locked. Try again after ${user.lockoutUntil.toLocaleTimeString()}`
            );
          }

          const isValidPassword = await bcrypt.compare(password, user.password);

          if (!isValidPassword) {
            const failedAttempts = user.failedAttempts + 1;
            const lockoutUntil =
              failedAttempts >= 5
                ? new Date(currentTime.getTime() + 15 * 60 * 1000)
                : null;

            // Update failed attempts (non-blocking to prevent delays)
            prisma.user.update({
              where: { email: normalizedEmail },
              data: {
                failedAttempts,
                lockoutUntil,
              },
            }).catch(() => {
              // Silently fail - don't block login
            });

            if (lockoutUntil) {
              throw new Error("Too many failed attempts. Try again in 15 minutes.");
            } else {
              throw new Error("Invalid email or password");
            }
          }

          // Reset failed attempts (non-blocking to prevent delays)
          prisma.user.update({
            where: { email: normalizedEmail },
            data: {
              failedAttempts: 0,
              lockoutUntil: null,
            },
          }).catch(() => {
            // Silently fail - don't block login
          });

          // Return user without password
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword;
        } catch (error: any) {
          // Handle database connection errors
          if (error.message === "Database timeout" || error.code === 'P1001' || error.message?.includes('timeout')) {
            throw new Error("Connection timeout. Please try again.");
          }
          // Re-throw authentication errors
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.user = user;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user = token.user!;
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 2 * 60 * 60,
  },
  // Removed PrismaAdapter - not needed for JWT strategy and creates duplicate connections
  // Using JWT strategy means we don't need database sessions
  pages: {
    signIn: "/auth/signIn",
  },
};

export default AuthOptions;