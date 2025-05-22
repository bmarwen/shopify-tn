import { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "your-store-bucket.s3.amazonaws.com",
      "your-store-bucket.s3.eu-west-3.amazonaws.com",
      "localhost",
      "placehold.co",
      "placekitten.com",
      "via.placeholder.com",
      "paraeljynene.store.tn",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
