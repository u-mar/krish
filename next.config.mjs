import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable PWA in development mode
  register: true,
  skipWaiting: true,
  sw: "sw.js",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // This will disable ESLint during the build process
  },
};

export default withPWA(nextConfig);