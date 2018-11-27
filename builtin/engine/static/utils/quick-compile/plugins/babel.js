const Babel = require('@babel/core');

module.exports = function() {
    return {
        transform(script) {
            if (script.src.indexOf('.json') !== -1) {
                return;
            }

            let result = Babel.transform(script.source, {
                ast: false,
                highlightCode: false,
                // TODO - disable transform-strict-mode
                sourceMaps: 'inline',
                sourceFileName: `enginesource:///${script.src}`,
                compact: false,
                filename: script.src, // search path for babelrc
                presets: ['@babel/preset-env'],
                plugins: [
                    // make sure that transform-decorators-legacy comes before transform-class-properties.
                    [
                        '@babel/plugin-proposal-decorators',
                        { legacy: true }
                    ],
                    [
                        '@babel/plugin-proposal-class-properties',
                        { loose: true }
                    ],
                    'add-module-exports'
                ]
            });

            script.source = result.code;
        }
    };
};
