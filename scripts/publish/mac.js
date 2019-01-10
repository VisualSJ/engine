'use strict';

const ps = require('path');
const fse = require('fs-extra');

const vWorkflow = require('../workflow');

const workflow = new vWorkflow({
    name: 'publish-mac',
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

const DIRECTORY = ps.join(__dirname, '../../.publish');
const ELECTRON = ps.join(DIRECTORY, 'Electron.app');
const APP = ps.join(ELECTRON, './Contents/Resources/app');

workflow.task('check-directory', function() {
    if (fse.existsSync(DIRECTORY)) {
        fse.emptyDirSync(DIRECTORY);
    }
    fse.ensureDirSync(DIRECTORY);
});

workflow.task('copy-electron', async function() {
    const source = ps.join(__dirname, '../../node_modules/electron/dist');
    fse.copySync(source, DIRECTORY);
    fse.ensureDirSync(APP);
});

workflow.task('copy-config', function() {
    const types = ps.join(__dirname, '../../@types');
    fse.copySync(types, ps.join(APP, '@types'));
    const pkg = ps.join(__dirname, '../../package.json');
    fse.copySync(pkg, ps.join(APP, 'package.json'));
    const boot = ps.join(__dirname, '../../index.js');
    fse.copySync(boot, ps.join(APP, 'index.js'));
});

// workflow.task('npm-install', function() {
//     this.bash('npm', {
//         params: ['install'],
//         root: APP,
//     });
// });

workflow.task('copy-modules', function() {
    const types = ps.join(__dirname, '../../node_modules');
    fse.copySync(types, ps.join(APP, 'node_modules'));
});

workflow.task('copy-dashboard', function() {
    const types = ps.join(__dirname, '../../dashboard');
    fse.copySync(types, ps.join(APP, 'dashboard'));
});

workflow.task('copy-lib', function() {
    const types = ps.join(__dirname, '../../lib');
    fse.copySync(types, ps.join(APP, 'lib'));
});

workflow.task('copy-resources', function() {
    const types = ps.join(__dirname, '../../resources');
    fse.copySync(types, ps.join(APP, 'resources'), {
        filter(name) {
            return !name.includes('/.git/');
        },
    });
});

workflow.task('copy-builtin', function() {
    const source = ps.join(__dirname, '../../builtin');
    fse.copySync(source, ps.join(APP, 'builtin'), {
        filter(name) {
            return !name.includes('dist') && !name.includes('readme.md');
        },
    });
});

workflow.task('build-buintin', async function() {
    const source = ps.join(APP, './builtin');
    const list = fse.readdirSync(source);

    for (let i = 0; i < list.length; i++) {
        const name = list[i];
        const dir = ps.join(source, name);
        if (!fse.statSync(dir).isDirectory()) {
            continue;
        }

        const config = ps.join(dir, 'tsconfig.json');
        if (fse.existsSync(config)) {
            const json = fse.readJSONSync(config);
            json.sourceMap = false;
            json.inlineSourceMap = false;
            json.inlineSources = false;
            fse.writeJSONSync(config, json);

            await this.bash('tsc', {
                root: dir,
            });
        }

        const less = ps.join(dir, './static/style/index.less');
        if (fse.existsSync(less)) {
            await this.bash('lessc', {
                params: ['./static/style/index.less', './dist/index.css'],
                root: dir,
            });
        }
    }
});

workflow.task('clean-builtin', async function() {
    const source = ps.join(APP, './builtin');
    const list = fse.readdirSync(source);
    for (let i = 0; i < list.length; i++) {
        const name = list[i];
        const dir = ps.join(source, name);
        if (!fse.statSync(dir).isDirectory()) {
            fse.removeSync(dir);
            continue;
        }

        fse.removeSync(ps.join(dir, 'tsconfig.json'));
        fse.removeSync(ps.join(dir, 'source'));
    }
});

workflow.task('build-theme', async function() {
    const DIR = {
        theme: ps.join(APP, './lib/theme'),
        source: ps.join(APP, './lib/theme/source'),
        dist: ps.join(APP, './lib/theme/dist'),
    };

    const files = [];
    workflow.recursive(DIR.source, (file) => {
        files.push(file);
    });

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rPath = ps.relative(DIR.source, file);
        const dPath = ps.join(DIR.dist, rPath).replace('.less', '.css');

        await this.bash('lessc', {
            params: [file, dPath],
            root: DIR.theme,
        });
    }
});

workflow.run();
