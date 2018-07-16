'use stirct';

const gulp = require('gulp');
const clean = require('gulp-clean');

exports.modules = function () {
    return gulp
        .src([
            './node_modules/@base',
            './node_modules/@editor',
        ])
        .pipe(clean());
};

exports.bin = function () {
    return gulp
        .src('.temp/bin')
        .pipe(clean());
};

exports.all = function () {
    return gulp
        .src('.temp')
        .pipe(clean());
};