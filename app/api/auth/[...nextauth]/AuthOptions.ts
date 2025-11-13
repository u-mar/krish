import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "@/prisma/client";
import { PrismaClient } from "@prisma/client";
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

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

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

          await prisma.user.update({
            where: { email: normalizedEmail },
            data: {
              failedAttempts,
              lockoutUntil,
            },
          });

          if (lockoutUntil) {
            throw new Error("Too many failed attempts. Try again in 15 minutes.");
          } else {
            throw new Error("Invalid email or password");
          }
        }

        // Reset failed attempts
        await prisma.user.update({
          where: { email: normalizedEmail },
          data: {
            failedAttempts: 0,
            lockoutUntil: null,
          },
        });

        return user;
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
  adapter: PrismaAdapter(new PrismaClient()),
  pages: {
    signIn: "/auth/signIn",
  },
};

export default AuthOptions;