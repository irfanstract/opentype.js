import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  transpilePackages: [
    "opentype.js",
  ],

  turbopack: {

    resolveAlias: {

    } ,

  } ,

  experimental: {

    cssChunking: "strict",

  },

};

export default nextConfig;
