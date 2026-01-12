const webpack = require('webpack');

module.exports = {
  reactScriptsVersion: "react-scripts",
  style: {
    css: {
      loaderOptions: () => {
        return {
          url: false,
        };
      },
    },
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Enable tree shaking and better code splitting
      if (env === 'production') {
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          usedExports: true,
          sideEffects: true,
          splitChunks: {
            chunks: 'all',
            maxInitialRequests: 25,
            minSize: 20000,
            cacheGroups: {
              // Core React bundle
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/,
                name: 'react-vendor',
                chunks: 'all',
                priority: 40,
              },
              // Charts library (large, defer loading)
              recharts: {
                test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
                name: 'charts',
                chunks: 'async',
                priority: 30,
              },
              // Other vendors
              vendors: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
              },
              // Common code shared between chunks
              common: {
                minChunks: 2,
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        };

        // Minimize JS more aggressively
        webpackConfig.optimization.minimize = true;
      }

      return webpackConfig;
    },
  },
};