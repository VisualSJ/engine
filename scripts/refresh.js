
const Fs = require('fs-extra');
const Path = require('path');
const touch = require('touch');

main().then().catch((error) => { throw error;});

async function main () {
    visitFiles('./app/builtin/asset-db/static/internal/assets', async (filename) => {
        if (!filename.endsWith('.meta')) {
            await touch(filename);
        }
    });
}

async function visitFiles (path, visitor) {
    const stat = await Fs.lstat(path);
    if (stat.isFile()) {
        await visitor(path);
    } else if (stat.isDirectory()) {
        const entries = await Fs.readdir(path);
        for (const entry of entries) {
            await visitFiles(Path.join(path, entry), visitor);
        }
    }
}
