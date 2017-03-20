const path = require('path');

module.exports = {
  devtool: process.env !== 'PRODUCTION' ? '#cheap-module-source-map' : false,
  entry: {
    demo: [
      'babel-polyfill',
      './demo/index.js',
    ],
  },
  resolve: {
    alias: {
      'redux-autoloader': './src/index',
    },
  },
  output: {
    filename: '[name].js',
    publicPath: '/',
    path: path.resolve(__dirname, 'demo'),
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
        exclude: /node_modules/,
      },
    ],
  },
};
