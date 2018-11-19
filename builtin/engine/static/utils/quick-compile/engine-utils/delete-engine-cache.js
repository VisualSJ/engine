const Del = require('del');
const Globby = require('globby');

// quick-compile 在 gulp 环境中也会使用到。
let isInEditor = typeof Editor !== 'undefined';

module.exports = function(enginePath) {
    let engineModified = false;

    return {
        transform() {
            engineModified = true;
        },

        compileFinished(compiler, done) {
            if (engineModified) {
                let pattern = [enginePath('bin/.cache/*'), '!' + enginePath('bin/.cache/dev')];
                let files = Globby.sync(pattern);
                if (files.length === 0) { return done(); }

                if (isInEditor) {
                    Editor.log(Editor.I18n.t('QUICK_COMPILER.engine_modified_info'));
                } else {
                    console.log('JavaScript Engine changes detected and the build cache was deleted.');
                }

                try {
                    Del.sync(pattern);
                } catch (err) {
                    if (isInEditor) {
                        Editor.error(err);
                    } else {
                        console.error(err);
                    }
                }

                engineModified = false;
            }

            done();
        }
    };
};
