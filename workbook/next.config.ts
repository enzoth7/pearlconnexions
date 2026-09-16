import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/logo.jpg", destination: "/Logo.jpg" },
      { source: "/logo.png", destination: "/LogoTransp.png" },
      { source: "/LogoTransp.png", destination: "/LogoTransp.png" },
      { source: "/manifesto.png", destination: "/Manifesto.png" },
    ];
  },
};

export default nextConfig;

