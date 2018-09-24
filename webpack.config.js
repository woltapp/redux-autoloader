const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  entry: './src/index.js',
  output: {
    publicPath: 'lib/',
    path: path.resolve(__dirname, 'lib'),
    filename: 'redux-autoloader.js',
    sourceMapFilename: 'redux-autoloader.map',
    library: 'redux-autoloader',
    libraryTarget: 'commonjs2',
  },
  externals: {
    react: 'react',
    'react-redux': 'react-redux',
    'redux-saga': 'redux-saga',
    'redux-saga/effects': 'redux-saga/effects',
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'eslint-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
          plugins: ['@babel/transform-runtime'],
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    ...(process.env.ANALYZE_BUNDLE === 'true' ? [new BundleAnalyzerPlugin()] : []),
  ],
};
