var gulp = require('gulp');
var babelify = require('babelify');
var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var uglify = require('gulp-uglify');
var del = require('del');

function buildScript(scriptName) {
	var path = 'src/' + scriptName;
	var b = browserify(path, {
		cache: {},
		packageCache: {}
	});
	b.transform(babelify, {
		presets: ['es2015']}
	)
	// .transform({
 //          global: true
 //      }, 'uglifyify');
	b.bundle()
    .on('error', function (err) { console.error(err); })
    .pipe(source(scriptName))
    .pipe(buffer())
    // .pipe(uglify()) // Use any gulp plugins you want now
    .pipe(gulp.dest('dist'));
}

function buildScripts(scripts) {
	for (var s=0; s<scripts.length; s++) {
		var script = scripts[s];
		buildScript(script);
	}
}

gulp.task('copy-utils', function() {
	del('dist/*', {dot: true});
	gulp.src('src/utils/*.js', {
		base: 'src'
	}).pipe(gulp.dest('dist'));
});

gulp.task('default', ['copy-utils'], function(){
	var scripts = ['dataloaders.js', 'sw-dataloaders.js'];
	buildScripts(scripts);
});