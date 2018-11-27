'use strict';

const path = require('path');
const gulp = require('gulp');
const less = require('gulp-less');

let lessDirnames = [
    '../builtin/assets',
    '../builtin/console',
    '../builtin/hierarchy',
    '../builtin/inspector',
    '../builtin/preferences',
    '../builtin/scene',
    '../builtin/build',
];

const watchCss = 'watch:css';
gulp.task(watchCss, () => {
    lessDirnames.map((dir) => {
        let watchPath = path.join(__dirname, dir, 'static/style/*.less');
        // 源文件
        let sourcePath = path.join(__dirname, dir, 'static/style/index.less');
        // 目标文件
        let distPath = path.join(__dirname, dir, 'dist');
        gulp.watch(watchPath, (e) => {
            // 输出当前变动的路径
            console.log(e.path);
            gulp.src(sourcePath)
                .pipe(less())
                .pipe(gulp.dest(distPath));
        });
    });
});

gulp.start(watchCss);
