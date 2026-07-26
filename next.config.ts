import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  // Expose the package.json version to the app (single source of truth for the
  // visible "MarginOS vX.Y.Z" label). Inlined at build time for server & client.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
