/*
*Default task requires Chrome LiveReload plugin for livereload development.
*otherwise this can be run just for browserify bundleing.
*/
var gulp = require('gulp'),
    livereload = require('gulp-livereload'),
    source = require('vinyl-source-stream'),
    gutil = require('gulp-util'),
    watchify = require('watchify'),
    browserify = require('gulp-browserify'),
    //react = require('gulp-react'),
    less = require('gulp-less'),
    uglify = require('gulp-uglify'),
    path = require('path');

gulp.task('default',function(){

    var bundle = watchify('./public/map/js/main.js');
    //bundle.transform('reactify');
    bundle.on('update',rebundle)

    function rebundle(){
        return bundle.bundle()
        .on('error',function(e){
            gutil.log('Browserify Error:', e);
        })
        //.pipe(uglify())
        .pipe(source('main.js'))
        .pipe(gulp.dest('./public/js'))
    }
    //live reload of compiled files
    livereload.listen();
    gulp.watch(['views/*','public/js/main.js','public/css/*']).on('change',livereload.changed);

    //build less css changes
    //*gulp.watch('public/map/less/**').on('change', function(){

    return rebundle();
});
