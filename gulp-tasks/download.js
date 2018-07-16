'use stirct';

const ps = require('path');
const download = require('download');
const vGit = require('v-git');

exports.bin = function (callback) {
    let repo = vGit.init('./');
    let branch = repo.branch;
    let url = `http://192.168.52.109/TestBuilds/Editor-3d/resources/${branch}/bin.zip`;
    let target = ps.join(__dirname, '../.temp/bin');  
    download(url, target, {
        mode: 755,
        extract: true,
        strip: 0,
    }).then(() => {
        callback && callback()
    }).catch((error) => {
        console.error(error);
        callback && callback();
    });
};