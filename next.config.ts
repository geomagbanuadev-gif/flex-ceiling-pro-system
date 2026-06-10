import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The PDF routes read these images from disk at runtime. On serverless hosts
  // (Vercel) functions don't include public/ by default, so bundle them in.
  // Harmless on a full Node server (Render etc.).
  outputFileTracingIncludes: {
    "/quotes/**": ["./public/logo-full.png", "./public/stamp.png", "./public/logo-mark.png"],
    "/share/**": ["./public/logo-full.png", "./public/stamp.png", "./public/logo-mark.png"],
  },
};

export default nextConfig;
