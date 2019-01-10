const Babel = require('@babel/core');
const path = require('path');

module.exports = function() {
    return {
        transform(script, compiler) {
            if (script.src.indexOf('.json') !== -1) {
                return;
            }

            const root = compiler.root;
            const relativePath = path.relative(root, script.src);

            let result = Babel.transform(script.source, {
                ast: false,
                highlightCode: false,
                // TODO - disable transform-strict-mode
                sourceMaps: 'inline',
                sourceFileName: `enginesource:///${relativePath}`,
                compact: false,
                filename: script.src, // search path for babelrc
                presets: [
                    require('@babel/preset-env'),
                    require('@babel/preset-typescript'),
                ],
                plugins: [
                    // make sure that transform-decorators-legacy comes before transform-class-properties.
                    [
                        require('@babel/plugin-proposal-decorators'),
                        { legacy: true },
                    ],
                    [
                        require('@babel/plugin-proposal-class-properties'),
                        { loose: true },
                    ],
                    [
                        require('babel-plugin-add-module-exports'),
                    ],
                ],
            });

            script.source = result.code;
        },
    };
};
