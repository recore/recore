var webpack = require('webpack');
var packageInfo = require('./package.json');
var path = require('path');

var baseConfig = {
  entry: './src/index',
  module: {
    loaders: [
      { test: /\.[jt]sx?$/, loader: "babel-loader" },
      // addition - add source-map support
      { enforce: 'pre', test: /\.[jt]sx?$/, loader: 'source-map-loader' },
    ]
  },
  externals: {
    'react': 'var window.React',
    'react-dom': 'var window.ReactDOM',
    'prop-types': 'var window.PropTypes'
  },
  node: {
    process: false,
    fs: 'empty',
    net: 'empty',
    child_process: 'empty',
  },
  devtool: 'none',
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@ali/recore': path.join(__dirname, 'src/index.ts')
    }
  }
};

function merge(config) {
  return Object.assign({}, baseConfig, config);
}

var webpackConfig;

if (process.env.BABEL_ENV === 'commonjs') {
  webpackConfig = merge({
    target: 'node',
    output: {
      libraryTarget: 'commonjs2',
      filename: './lib/recore.js'
    },
    externals: (function () {
      var externals = {
      };
      if (packageInfo.dependencies) {
        Object.keys(packageInfo.dependencies).forEach(function (key) {
          externals[key] = key;
        });
      }
      return externals;
    })(),
    plugins: [
      new webpack.DefinePlugin({
        VERSION: JSON.stringify(packageInfo.version)
      })
    ]
  });
} else if (process.env.NODE_ENV === 'production') {
  webpackConfig = merge({
    output: {
      library: 'Recore',
      libraryTarget: 'umd',
      filename: './umd/recore.min.js'
    },
    plugins: [
      new webpack.DefinePlugin({
        VERSION: JSON.stringify(packageInfo.version),
        process: 'false',
        'process.nextTick': 'false',
        'process.env.NODE_ENV': '"production"',
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        }
      })
    ]
  });
} else {
  webpackConfig = merge({
    devtool: 'source-map',
    output: {
      library: 'Recore',
      libraryTarget: 'umd',
      filename: './umd/recore.js',
      sourceMapFilename: '[file].map',
      devtoolModuleFilenameTemplate: ({resourcePath}) => `webpack:///${path.join('recore', resourcePath)}`,
    },
    watch: process.env.NODE_ENV === 'watch',
    plugins: [
      new webpack.DefinePlugin({
        VERSION: JSON.stringify(packageInfo.version),
        process: 'undefined',
        'process.nextTick': 'false',
        'process.env.NODE_ENV': '"development"',
      })
    ]
  });
}

module.exports = webpackConfig;
