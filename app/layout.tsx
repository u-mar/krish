import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from '@/components/ui/sonner';
import ReactQueryClientProvider from './_components/Providers/ReactQueryClientProvider';
import NextAuthProvider from "./_components/Providers/NextAuthProvider";
import { COMPANY_NAME } from "@/lib/config";

// Load Geist Sans and Geist Mono fonts locally
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap", // Improve font loading behavior
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${COMPANY_NAME}`,
  description: `Inventory management system for ${COMPANY_NAME}`,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: `${COMPANY_NAME}`,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#9d57ff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <NextAuthProvider>
        <ReactQueryClientProvider>
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            {/* Toaster component for notifications */}
            <Toaster richColors className='!z-[33333]' />
            {children}
          </body>
        </ReactQueryClientProvider>
      </NextAuthProvider>
    </html>
  );
}
