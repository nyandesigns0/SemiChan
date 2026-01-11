const webpack = require("webpack");
const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
    outputFileTracingIncludes: {
      "/api/export-pdf": [
        "./node_modules/@sparticuz/chromium/bin/**",
        "./node_modules/@sparticuz/chromium/lib/**",
      ],
    },
  },
  webpack(config, { isServer }) {
    config.resolve.fallback = config.resolve.fallback ?? {};
    config.resolve.fallback.canvas = false;

    // Ignore .node files (native addons) - they should be loaded at runtime, not bundled
    // This prevents webpack from trying to parse binary .node files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.node$/,
      }),
      // Also ignore the onnxruntime-node bin directory entirely
      new webpack.IgnorePlugin({
        resourceRegExp: /onnxruntime-node\/bin/,
      })
    );

    if (!isServer) {
      // Client-side: completely exclude onnxruntime-node (not available in browser)
      config.resolve.alias = config.resolve.alias ?? {};
      config.resolve.alias["onnxruntime-node"] = false;
    } else {
      // Server-side: externalize onnxruntime-node so it's loaded at runtime
      // This prevents webpack from trying to bundle the native .node files
      const originalExternals = config.externals;
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          // Externalize onnxruntime-node to prevent bundling native binaries
          if (request === "onnxruntime-node" || request?.startsWith("onnxruntime-node/")) {
            return callback(null, `commonjs ${request}`);
          }
          // Also externalize any path that includes .node files
          if (request?.includes(".node")) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
};

module.exports = nextConfig;
