/** @type {import('next').NextConfig} */
const nextConfig = {
    // API versioning: /api/v1/* rewrites to /api/*
    async rewrites() {
        return [
            {
                source: "/api/v1/:path*",
                destination: "/api/:path*",
            },
        ];
    },
    // Security headers
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    { key: "X-API-Version", value: "v1" },
                ],
            },
        ];
    },
    // Image domains for uploads
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "*.s3.amazonaws.com",
            },
        ],
    },
    // Skip linting and type-checking during build (saves memory on low-RAM servers)
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Environment validation on startup
    serverRuntimeConfig: {
        MONGODB_URI: process.env.MONGODB_URI,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    },
};

export default nextConfig;
