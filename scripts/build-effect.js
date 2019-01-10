'use strict';

// 测试 effect 用

const ps = require('path');

Manager = {};
Manager.AssetInfo = {};
Manager.AssetInfo.engine = ps.join(__dirname, '../resources/3d/engine');

const shdcLib = require('../builtin/asset-db/static/shdc-lib');
shdcLib.addChunksCache('builtin/asset-db/static/chunks');

const fs = require('fs');
const fsJetpack = require('fs-jetpack');

let stringifyShaders = (function() {
    let newlines = /\n+/g;
    let toOneLiner = (o) => '\n      ' + JSON.stringify(o).replace(/([,:])/g, '$1 ');
    return function(shaders) {
        let code = '';
        for (let i = 0; i < shaders.length; ++i) {
            let { name, vert, frag, defines, uniforms, attributes, extensions } = shaders[i];
            vert = vert.replace(newlines, '\\n');
            frag = frag.replace(newlines, '\\n');
            code += '  {\n';
            code += `    "name": "${name}",\n`;
            code += `    "vert": "${vert}",\n`;
            code += `    "frag": "${frag}",\n`;
            code += '    "defines": [';
            code += defines.map(toOneLiner);
            code += (defines.length ? '\n    ' : '') + '],\n';
            code += '    "uniforms": [';
            code += uniforms.map(toOneLiner);
            code += (uniforms.length ? '\n    ' : '') + '],\n';
            code += '    "attributes": [';
            code += attributes.map(toOneLiner);
            code += (attributes.length ? '\n    ' : '') + '],\n';
            code += '    "extensions": [';
            code += extensions.map(toOneLiner);
            code += (extensions.length ? '\n    ' : '') + ']\n';
            code += '  },\n';
        }
        return `[\n${code.slice(0, -2)}\n]`;
    };
})();

let indent = (str, num) => str.replace(/\n/g, '\n' + ' '.repeat(num));

let path = 'builtin/asset-db/static/internal/assets';
let files = fsJetpack.find(path, { matching: ['**/*.effect'] });
let code = ``;

for (let i = 0; i < files.length; ++i) {
    let name = ps.basename(files[i], '.effect');
    let content = fs.readFileSync(files[i], { encoding: 'utf8' });
    let effect = shdcLib.buildEffect(name, content);
    code += '  {\n';
    code += `    "name": "${effect.name}",\n`;
    code += `    "techniques": ${JSON.stringify(effect.techniques)},\n`;
    code += `    "properties": ${JSON.stringify(effect.properties || {})},\n`;
    code += `    "shaders": ${indent(stringifyShaders(effect.shaders), 4)}\n`;
    code += '  },\n';
}

fs.writeFileSync('effects.js', `export default [\n${code.slice(0, -2)}\n];\n`, { encoding: 'utf8' });
