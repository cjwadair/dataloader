'use strict';
require('babel-core/register');

var gulp = require('gulp');
var babelify = require('babelify');
var browserify = require('browserify');
var babel = require('gulp-babel');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var del = require('del');
var mocha = require('gulp-mocha');
import sourcemaps from 'gulp-sourcemaps';


function buildScript(scriptName) {
	let path = './src/' + scriptName;
	let b = browserify(path, {
		// cache: {},
		// packageCache: {},
		standalone: 'dataloaders',
		debug: true
	});
	b = b.transform(babelify, {
		presets: ['es2015']
	});
  return b.bundle()
  	.pipe(source(scriptName))
  	.on('error', function (err) { console.error(err); })
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
		.pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest('dist'))
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
	del('dist/utils/*');
})

gulp.task('default', ['clearDist'], function(){
	copyUtils();
	var scripts = ['dataloaders.js', 'sw-dataloaders.js'];
	buildScripts(scripts);
});



gulp.task('test', function() {
  // return gulp.src(['test/*.js'])
   //  .pipe(mocha({
   //    compilers:babelregister
  	// }));
  	return gulp.src('test/*.test.js', { read: false })
      .pipe(mocha({
      	reporter: 'nyan',
      	compilers:'js:babel-core/register'
  	}));
});
