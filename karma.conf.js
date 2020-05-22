module.exports = function(config) {

    config.set({

        frameworks: ['mocha'],

        files: [
            'spec/service.spec.js',
            'spec/browser-server.spec.js'
        ],

        preprocessors: {
            'spec/service.spec.js': ['webpack', 'sourcemap'],
            'spec/browser-server.spec.js': ['webpack', 'sourcemap']
        },

        webpack: {
            mode: 'development',
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        loader: 'babel-loader'
                    }
                ]
            }
        },

        reporters: ['spec', 'coverage'],

        coverageReporter: {
            dir: './coverage',
            reporters: [
                {type: 'lcov', subdir: '.'},
                {type: 'text-summary'}
            ]
        },

        browsers: ['ChromeHeadless']

    });

};
