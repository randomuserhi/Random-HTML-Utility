import { globby } from 'globby';
import { rimraf } from 'rimraf';

globby(['build/', '!build/js3party/'], { onlyFiles: false })
    .then(function then(paths) {
        paths.map(function map(item) {
            rimraf.native(item);
    });
});