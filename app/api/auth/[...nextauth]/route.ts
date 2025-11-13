import NextAuth from "next-auth";
import AuthOptions from "./AuthOptions";

// Explicit timeout configuration for Vercel
export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const handler = NextAuth(AuthOptions);

export { handler as GET, handler as POST };