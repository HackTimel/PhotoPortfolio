import gulp from 'gulp';
import imageResize from 'gulp-image-resize';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import uglify from 'gulp-uglify';
import rename from 'gulp-rename';
import filter from 'gulp-filter';
import path from 'path';
import del from 'del';

const sass = gulpSass(dartSass);
const cssSourceGlob = './assets/sass/**/*.scss';
const cssOutputDir = './assets/css';
const generatedCssFiles = [
    `${cssOutputDir}/custom.min.css`,
    `${cssOutputDir}/main.min.css`,
    `${cssOutputDir}/noscript.min.css`
];

// --- GESTION DES IMAGES ---

// 1. Nettoyage ciblé (uniquement les dossiers de destination)
gulp.task('delete', function () {
    return del(['images/fulls/*', 'images/thumbs/*']);
});

// 2. Génération des grandes images (1024px)
gulp.task('resize-fulls', function () {
    return gulp.src('images/*.{jpg,jpeg,png,gif,webp}', { allowEmpty: true })
        .pipe(imageResize({
            width: 1024,
            imageMagick: true
        }).on('error', function(err) {
            console.error('🚨 ERREUR ImageMagick (Fulls) :', err.message);
            this.emit('end'); // Empêche gulp de crasher complètement
        }))
        .pipe(gulp.dest('images/fulls'));
});

// 3. Génération des miniatures (512px)
gulp.task('resize-thumbs', function () {
    return gulp.src('images/*.{jpg,jpeg,png,gif,webp}', { allowEmpty: true })
        .pipe(imageResize({
            width: 512,
            imageMagick: true
        }).on('error', function(err) {
            console.error('🚨 ERREUR ImageMagick (Thumbs) :', err.message);
            this.emit('end');
        }))
        .pipe(gulp.dest('images/thumbs'));
});

// 4. On groupe les redimensionnements en SÉRIE (très important pour ImageMagick)
gulp.task('resize-images', gulp.series('resize-fulls', 'resize-thumbs'));

// 5. La tâche finale pour les images (Nettoie PUIS redimensionne)
gulp.task('resize', gulp.series('delete', 'resize-images'));


// --- GESTION DU CSS / SCSS ---

// clear previously generated css
gulp.task('clean-css', function () {
    return del(generatedCssFiles);
});

// compile scss to css
gulp.task('sass', gulp.series('clean-css', function compileSass() {
    return gulp.src(cssSourceGlob)
        .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(rename(function (path) {
            path.basename += '.min';
        }))
        .pipe(gulp.dest(cssOutputDir));
}));

// watch changes in scss files and run sass task
gulp.task('sass:watch', function () {
    gulp.watch('./assets/sass/**/*.scss', gulp.series('sass'));
});


// --- GESTION DU JAVASCRIPT ---

// minify js
gulp.task('minify-js', function () {
    return gulp.src('./assets/js/**/*.js')
        .pipe(filter(function (file) {
            const filePath = file.path;
            const basename = path.basename(filePath, '.js');
            // Skip files that are already minified
            return !basename.endsWith('.min');
        }))
        .pipe(uglify())
        .pipe(rename(function (path) {
            path.basename += '.min';
            path.extname = '.js';
        }))
        .pipe(gulp.dest('./assets/js'));
});


// --- TÂCHES GLOBALES ---

// build task
gulp.task('build', gulp.series('sass', 'minify-js'));

// default task (Lance le build CSS/JS, puis s'occupe des images)
gulp.task('default', gulp.series('build', 'resize'));
