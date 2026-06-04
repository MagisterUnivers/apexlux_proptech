/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
    // Only 3 breakpoints instead of the default 8 — reduces sharp memory spikes on Railway
    deviceSizes: [640, 1080, 1920],
    // Skip AVIF: smaller output but much higher encoder memory; WebP is the right tradeoff here
    formats: ["image/webp"],
    // Cache each processed variant for 30 days so Railway only pays the memory cost once per variant
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

module.exports = nextConfig;
