'use strict';

var gulp = require('gulp');
var babelify = require('babelify');
var browserify = require('browserify');
var babel = require('gulp-babel');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var del = require('del');
import sourcemaps from 'gulp-sourcemaps';

function buildScript(scriptName) {
	let path = './src/' + scriptName;
	let b = browserify(path, {
		cache: {},
		packageCache: {},
		standalone: 'dataloaders',
		debug: true
	});
	b = b.transform(babelify, {
		presets: ['es2015']
	});
	// .plugin('bundle-collapser/plugin');

 
    return b.bundle()
    	.pipe(source(scriptName))
    	.on('error', function (err) { console.error(err); })
  	// return gulp.src(path)
      .pipe(buffer())
      .pipe(sourcemaps.init({loadMaps: true}))
      // .pipe(babel({
      //   presets: ['es2015']
      // }))
      .pipe(uglify())
  		.pipe(sourcemaps.write('./maps'))
      .pipe(gulp.dest('dist'))
  // }
  // return bundle();
}

function buildScripts(scripts) {
	for (var s=0; s<scripts.length; s++) {
		var script = scripts[s];
		buildScript(script);
	}
}

function copyUtils() {
	gulp.src('src/utils/*.js', {
		base: 'src'
	}).pipe(gulp.dest('dist'));
}

gulp.task('clearDist', function(){
	del('dist', {dot: true});
})

gulp.task('default', ['clearDist'], function(){
	copyUtils();
	var scripts = ['dataloaders.js', 'sw-dataloaders.js'];
	buildScripts(scripts);
});