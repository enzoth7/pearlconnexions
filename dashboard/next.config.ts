import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/workbook/settings", destination: "/workbook/team", permanent: false },
      { source: "/settings", destination: "/workbook/team", permanent: false },
      ...["actions", "archive", "calendar", "reviews"].map(section => ({
        source: "/" + section + "/:path*",
        destination: "/workbook/" + section + "/:path*",
        permanent: false,
      })),
    ];
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};

export default nextConfig;
