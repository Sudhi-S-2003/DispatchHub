/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL}/api/v1/:path*`
          : 'http://localhost:4000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
