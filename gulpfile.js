'use strict';

const gulp = require('gulp');
const sequence = require('gulp-sequence');
const path = require('path');

const less = require('gulp-less');
 
gulp.task('less', function () {
  return gulp.src('./windows/source/less/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('./windows/style'));
});

const download = require('./gulp-tasks/download');
const copy = require('./gulp-tasks/copy');
const clean = require('./gulp-tasks/clean');

gulp.task('download-bin', download.bin);
gulp.task('copy-bin', copy.bin);
gulp.task('clean-bin', clean.bin);
gulp.task('clean-modules', clean.modules);

gulp.task('update-bin', sequence('clean-modules', 'download-bin', 'copy-bin'));
gulp.task('clean-all', clean.all);

gulp.task('update', sequence('update-bin'));