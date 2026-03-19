/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin turbopack root to this project dir — prevents parent directory
  // resolution issues when running via `npm run dev --prefix`
  turbopack: {
    root: '.',
  },
};

export default nextConfig;
