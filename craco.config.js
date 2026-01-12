const webpack = require('webpack');
const purgecss = require('@fullhuman/postcss-purgecss');

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
    postcss: {
      mode: 'extends',
      loaderOptions: (options, { env }) => {
        if (env === 'production') {
          options.postcssOptions.plugins.push(
            purgecss({
              content: [
                './src/**/*.js',
                './src/**/*.jsx',
                './public/index.html'
              ],
              defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
              safelist: {
                standard: [
                  /^html$/,
                  /^body$/,
                  /^root$/,
                  /^App$/,
                  // Keep all dynamically generated classes
                  /^(is|has|js|no|can)-/,
                  // Animation classes
                  /^animate/,
                  /^fade/,
                  // State classes
                  /^active/,
                  /^loading/,
                  /^visible/,
                  /^hidden/,
                  // Component state classes
                  /^bento-/,
                  /^cell-/,
                  /^card-/,
                  /^modal-/,
                  /^menu-/,
                  /^nav-/,
                  /^hero-/,
                  /^section-/,
                ],
                deep: [/^theme-/, /^dark-mode/, /^light-mode/],
                greedy: [/data-/, /aria-/]
              }
            })
          );
        }
        return options;
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