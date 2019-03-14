'use strict';

const ps = require('path'); // path system
const fse = require('fs-extra');
const chokidar = require('chokidar');

const vWorkflow = require('v-workflow');

const workflow = new vWorkflow({
    name: 'build-less',
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

const cmd = process.platform === 'win32' ? 'lessc.cmd' : 'lessc';

/////////////////////////
// 编译插件内的 less

const builtin = ps.join(__dirname, '../../app/builtin');
fse.readdirSync(builtin).forEach((name) => {
    const dir = ps.join(builtin, name);
    const lessDir = ps.join(dir, './static/style');
    if (!fse.existsSync(lessDir)) {
        return;
    }

    workflow.task(name, async function() {
        let watcher;
        if (process.platform === 'win32') {
            watcher = chokidar.watch([
                `${lessDir}`,
            ], {
                ignoreInitial: true,
            });
        } else {
            watcher = chokidar.watch([
                `${lessDir}/**/*`,
            ], {
                ignoreInitial: true,
            });
        }

        const bash = this.bash;
        let timer = null;
        async function build(path) {
            console.log(`file: ${path}`);

            clearTimeout(timer);
            timer = setTimeout(async () => {
                console.log(dir);
                await bash(cmd, {
                    params: ['./static/style/index.less', './dist/index.css'],
                    root: dir,
                }); 
            }, 400);
        }

        watcher
            .on('add', build)
            .on('change', build)
            .on('unlink', build)
            .on('addDir', build)
            .on('unlinkDir', build);
    });
    
});

/////////////////////////////////////
// 编译 theme 模块的 less 代码

// const DIR = {
//     theme: ps.join(__dirname, '../../app/lib/theme'),
//     source: ps.join(__dirname, '../../app/lib/theme/source'),
//     dist: ps.join(__dirname, '../../app/lib/theme/dist'),
// };

// workflow.task('theme', async function() {
//     const cache = this.get('theme') || {};

//     const files = [];
//     workflow.recursive(DIR.source, (file) => {
//         const mtime = fse.statSync(file).mtime.getTime();
//         if (cache[file] !== mtime) {
//             files.push(file);
//             cache[file] = mtime;
//         }
//     });

//     if (files.length === 0) {
//         return false;
//     }

//     for (let i = 0; i < files.length; i++) {
//         const file = files[i];
//         const rPath = ps.relative(DIR.source, file);
//         const dPath = ps.join(DIR.dist, rPath).replace('.less', '.css');

//         await this.bash(cmd, {
//             params: [file, dPath],
//             root: DIR.theme,
//         });
//     }
//     this.set('theme', cache);
// });

workflow.run();
