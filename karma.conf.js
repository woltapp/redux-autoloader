const webpackConfig = require('./webpack.config.js');

module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'sinon-chai'],

    files: [
      { pattern: 'src/**/*.spec.js', watched: false },
    ],

    exclude: [],

    preprocessors: {
      'src/**/*.spec.js': ['webpack'],
    },

    webpack: {
      module: webpackConfig.module,
    },
    webpackMiddleWare: {
      stats: 'minimal',
    },

    mochaReporter: {
      showDiff: true,
    },

    reporters: ['progress', 'mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: true,
    concurrency: Infinity,
  })
};
