const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    publicPath: 'lib/',
    path: path.resolve(__dirname, 'lib'),
    filename: 'redux-autoloader.js',
    sourceMapFilename: 'redux-autoloader.map',
    library: 'redux-autoloader',
    libraryTarget: 'commonjs'
  },
  externals: {
    'react': 'react',
    'react-redux': 'react-redux',
    'redux-saga': 'redux-saga',
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
          plugins: ['transform-runtime'],
        },
        exclude: /node_modules/,
      },
    ],
  },
};
