import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    // A build id used by the service worker to version its cache — anytime
    // this changes, the SW drops its old cache instead of serving stale HTML.
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ?? new Date().toISOString(),
  },
};

export default nextConfig;
