/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/navigation", destination: "/", permanent: true },
      { source: "/product-design", destination: "/", permanent: true },
      {
        source: "/work/linear-interaction-moments",
        destination: "/work/interaction-prototypes",
        permanent: true
      },
      { source: "/icon-design/quote", destination: "/icon-design", permanent: true },
      { source: "/downloads/figma-icon", destination: "/icon-design", permanent: true },
      {
        source: "/product-design/github-copilot",
        destination: "/work/github-copilot",
        permanent: true
      },
      {
        source: "/product-design/navigation-shortcuts",
        destination: "/work/navigation-shortcuts",
        permanent: true
      },
      {
        source: "/product-design/achievements",
        destination: "/work/achievements",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
