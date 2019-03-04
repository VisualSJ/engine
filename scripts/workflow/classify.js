'use strict';

const cp = require('child_process');
const fse = require('fs-extra');
const ps = require('path');
const chalk = require('chalk');

const slog = require('single-line-log').stdout;

class Workflow {

    constructor(options) {
        this.tasks = [];
        this.name = options.name;
        this.temp = options.temp || ps.join(process.cwd(), '.workflow');
        fse.ensureDirSync(this.temp);

        this._temp = ps.join(this.temp, `${this.name}.json`);
        if (!fse.existsSync(this._temp)) {
            fse.writeJSONSync(this._temp, {}, { spaces: 2 });
        }
        this._json = fse.readJSONSync(this._temp);

        this._current = {
            i: 0,
            name: '',
        };
    }

    /**
     * 设置一个缓存数据
     * 8a54c7b9f37050d5abd0f5bef1e64a5bf1e45072
     * @param {*} key
     * @param {*} value
     */
    set(key, value) {
        const searchPaths = key.split('.');
        const last = searchPaths.pop();

        let data = this._json;
        searchPaths.forEach((path) => {
            data = data[path] || (data[path] = {});
        });
        data[last] = value;
        fse.writeJSONSync(this._temp, this._json, { spaces: 2 });
    }

    /**
     * 取出一个缓存数据
     * @param {*} key
     */
    get(key) {
        const searchPaths = key.split('.');
        const last = searchPaths.pop();

        let data = this._json;
        searchPaths.forEach((path) => {
            data = data[path] || (data[path] = {});
        });

        return data[last];
    }

    task(name, handle) {
        this.tasks.push({
            name,
            handle,
        });
    }

    async run() {

        console.log(chalk.magenta(`Workflow: ${this.name} start`));
        for (let i = 0; i < this.tasks.length; i++) {
            const task = this.tasks[i];
            this._current.i = i;
            this._current.name = task.name;
            try {
                slog(chalk.cyanBright(`    ${i + 1}. ${task.name}... `));
                const bool = await task.handle.call(this);
                slog('');
                if (bool === false) {
                    console.log(chalk.cyanBright(`    ${i + 1}. ${task.name}... skip`));
                } else {
                    console.log(chalk.cyanBright(`    ${i + 1}. ${task.name}... success`));
                }
            } catch (error) {
                slog('');
                console.log(chalk.cyanBright(`    ${i + 1}. ${task.name}... failure`));
                console.error(error);
                return;
            }

        }
    }

    /**
     * 打印进度 log
     * @param {*} str
     */
    log(str) {
        slog(chalk.cyanBright(`    ${this._current.i + 1}. ${this._current.name}... `) + str);
    }

    /**
     * 创建
     * @param {*} cmd
     * @param {*} options params | root | stdio
     */
    bash(cmd, options) {
        return new Promise((resolve, reject) => {
            let child = cp.spawn(cmd, options.params || [], {
                stdio: options.stdio || [0, 1, 2],
                cwd: options.root || process.cwd(),
            });

            child.on('exit', (code) => {
                if (code !== 0) {
                    reject(code);
                } else {
                    resolve(code);
                }
            });
        });
    }

    /**
     * 递归查询文件夹内的文件
     * @param {*} dir
     * @param {*} hanle
     */
    recursive(dir, handle) {
        function step(file) {
            if (!fse.existsSync(file)) {
                return;
            }
            const stat = fse.statSync(file);
            if (stat.isDirectory()) {
                fse.readdirSync(file).forEach((name) => {
                    const child = ps.join(file, name);
                    step(child);
                });
            } else {
                handle(file);
            }
        }

        step(dir);
    }
}

exports.Workflow = Workflow;
