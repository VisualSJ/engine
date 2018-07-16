'use stirct';

const gulp = require('gulp');

exports.bin = function () {
    return gulp.src([
        '.temp/bin/**/*',
    ])
    .pipe(gulp.dest(`./node_modules/`));
};